import { LegalAnalysisResult } from "@/backend/services/llm/promptTemplates";
import { listKnowledgeBaseSources } from "@/backend/services/rag/knowledgeCatalog";

// =====================================================================
// Tipos do dataset e do relatório
// =====================================================================

export interface TestCase {
  id: string;
  titulo: string;
  /** "padrao" = relato trabalhista comum; "adversarial" = teste de robustez (injeção, fora do tema, ruído). */
  categoria?: "padrao" | "adversarial";
  descricao_inicial: string;
  espera_perguntas_esclarecimento: boolean;
  respostas_simuladas: Array<{ order: number; text: string }>;
  enquadramento_esperado: string[];
  proximos_passos_esperados_contendo: string[];
  /** Trechos que NÃO podem aparecer na saída (ex.: o que um prompt injection tenta forçar). */
  nao_deve_conter?: string[];
  /** Confiança máxima aceitável (ex.: relato fora do tema deve vir com confiança baixa). */
  confianca_maxima?: number;
}

/**
 * - "ancorada": a norma estava entre os documentos recuperados pelo RAG neste caso;
 * - "na_base": existe na base de conhecimento, mas não foi recuperada neste caso;
 * - "externa_valida": fora da base, mas o dispositivo existe (ex.: CLT Art. 467, Súmula 212 TST);
 * - "nao_verificavel": fora da base e sem como verificar automaticamente (ex.: outras leis);
 * - "inexistente": dispositivo que não existe (ex.: CLT Art. 999, Súmula 900 TST) => ALUCINAÇÃO.
 */
export type CitationStatus = "ancorada" | "na_base" | "externa_valida" | "nao_verificavel" | "inexistente";

export const CITATION_STATUSES: CitationStatus[] = [
  "ancorada",
  "na_base",
  "externa_valida",
  "nao_verificavel",
  "inexistente",
];

export interface CitationCheck {
  ref: string;
  key: string | null;
  status: CitationStatus;
}

export interface FramingScore {
  recall: number;
  precision: number;
  matched: string[];
  missing: string[];
}

export interface RobustnessCheck {
  score: number;
  failed: string[];
}

export interface EvalCaseResult {
  testCaseId: string;
  titulo: string;
  categoria: "padrao" | "adversarial";
  passed: boolean;
  failReasons: string[];
  clarification: { expected: boolean; triggered: boolean; matched: boolean; questions: string[] };
  relevanceScore: number;
  framingRecall: number;
  framingPrecision: number;
  stepsCoverage: number;
  hallucinationRate: number;
  groundingRate: number;
  outOfBaseRate: number;
  robustnessScore: number;
  robustnessFailed: string[];
  adversarial?: { ok: boolean; violations: string[] };
  /** Relevância sem as respostas de esclarecimento (ablação), quando executada. */
  relevanceWithoutClarification?: number;
  confidence: number;
  actualFraming: string[];
  expectedFraming: string[];
  citations: CitationCheck[];
  retrievedSources: string[];
  trace: {
    llm_used: boolean;
    retrieval_mode: string;
    defaults_filled: string[];
    errors: string[];
    tokens: number;
    latency_ms: number;
    retries: number;
  };
}

// =====================================================================
// Normalização de citações legais
// =====================================================================

export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converte uma citação livre em uma chave canônica comparável.
 *   "CLT Art. 3º"            -> "clt:3"
 *   "Art. 477, § 8º da CLT"  -> "clt:477"
 *   "CLT art. 59-A"          -> "clt:59-a"
 *   "Súmula nº 331 do TST"   -> "sumula-tst:331"
 *   "CF/88 Art. 7º, XVII"    -> "cf:7"
 *   "Lei nº 8.036/1990"      -> "lei-8036"
 * Retorna null quando não é possível identificar a norma.
 */
export function canonicalLegalRef(ref: string): string | null {
  const t = normalizeText(ref);
  if (!t) return null;

  const sumula = t.match(/sumula\s*(?:n[oº°.]*\s*)?(\d+)/);
  if (sumula) {
    const court = /\bstf\b/.test(t) ? "stf" : /\bstj\b/.test(t) ? "stj" : "tst";
    return `sumula-${court}:${Number(sumula[1])}`;
  }

  const oj = t.match(/\boj\s*(?:sdi-?\d\s*)?(?:n[oº°.]*\s*)?(\d+)/);
  if (oj) return `oj-tst:${Number(oj[1])}`;

  let diploma: string | null = null;
  if (/\bclt\b|consolidacao das leis do trabalho/.test(t)) diploma = "clt";
  else if (/\bcf\b|cf\/88|constituicao/.test(t)) diploma = "cf";
  else if (/\bcc\b|codigo civil/.test(t)) diploma = "cc";
  else {
    const lei = t.match(/lei\s*(?:complementar\s*)?(?:n[oº°.]*\s*)?([\d.]+)/);
    if (lei) diploma = `lei-${lei[1].replace(/\./g, "")}`;
  }

  const art = t.match(/\bart(?:igo)?s?\.?\s*(\d[\d.]*)(?:\s*-\s*([a-z])\b)?/);
  if (!diploma) return null;
  if (!art) return diploma;
  const num = String(Number(art[1].replace(/\./g, "")));
  return `${diploma}:${num}${art[2] ? `-${art[2]}` : ""}`;
}

/**
 * Último dispositivo existente de cada diploma, para detectar citações inventadas.
 * CLT: art. 922 • CF/88: art. 250 • Súmulas do TST: nº 463 • Código Civil: art. 2.046.
 */
export const LEGAL_RANGES: Record<string, number> = {
  clt: 922,
  cf: 250,
  "sumula-tst": 463,
  cc: 2046,
};

/** true = dispositivo existe, false = não existe, null = não dá para verificar automaticamente. */
export function legalRefExists(key: string | null): boolean | null {
  if (!key) return null;
  const [diploma, art] = key.split(":");
  const max = LEGAL_RANGES[diploma];
  if (max === undefined || !art) return null;
  const n = parseInt(art, 10);
  return n >= 1 && n <= max;
}

let cachedCatalog: Set<string> | null = null;

/** Conjunto de chaves canônicas das normas que existem na base de conhecimento do RAG. */
export function knowledgeBaseKeys(): Set<string> {
  if (!cachedCatalog) {
    cachedCatalog = new Set(
      listKnowledgeBaseSources()
        .map(canonicalLegalRef)
        .filter((k): k is string => k !== null)
    );
  }
  return cachedCatalog;
}

// =====================================================================
// Métricas
// =====================================================================

/** Recall / precisão do enquadramento legal comparado ao gabarito, por chave canônica. */
export function scoreFraming(actualRefs: string[], expectedRefs: string[]): FramingScore {
  const actual = new Set(actualRefs.map(canonicalLegalRef).filter((k): k is string => k !== null));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const exp of expectedRefs) {
    const key = canonicalLegalRef(exp);
    if (key && actual.has(key)) matched.push(exp);
    else missing.push(exp);
  }
  const recall = expectedRefs.length > 0 ? matched.length / expectedRefs.length : 1;
  const expectedKeys = new Set(expectedRefs.map(canonicalLegalRef));
  const relevantActual = [...actual].filter((k) => expectedKeys.has(k)).length;
  const precision =
    actual.size > 0 ? relevantActual / actual.size : expectedRefs.length === 0 ? 1 : 0;
  return { recall: round(recall), precision: round(precision), matched, missing };
}

/** Texto completo da resposta, usado para buscar palavras-chave e trechos proibidos. */
export function analysisFullText(a: LegalAnalysisResult): string {
  const parts: string[] = [a.legal_summary, a.action_type, a.next_steps];
  for (const f of a.legal_framing || []) parts.push(f.ref, f.trecho);
  for (const r of a.claimable_rights || []) parts.push(r.nome, r.descricao, r.base_legal);
  for (const p of a.penalties_and_fines || []) parts.push(p.multa, p.motivo, p.valor);
  for (const s of a.structured_steps || []) parts.push(s.fase, s.titulo, s.descricao);
  return normalizeText(parts.filter(Boolean).join(" \n "));
}

/** Fração das palavras-chave esperadas que aparecem nos próximos passos / direitos / resumo. */
export function scoreStepsCoverage(a: LegalAnalysisResult, keywords: string[]): number {
  if (keywords.length === 0) return 1;
  const text = analysisFullText(a);
  const hits = keywords.filter((kw) => text.includes(normalizeText(kw))).length;
  return round(hits / keywords.length);
}

/**
 * Relevância (0–1) = 70% recall do enquadramento + 30% cobertura dos próximos passos.
 */
export function calculateRelevance(
  actual: LegalAnalysisResult,
  expectedFraming: string[],
  expectedStepsKeywords: string[]
): number {
  const refs = (actual.legal_framing || []).map((f) => f.ref);
  const { recall } = scoreFraming(refs, expectedFraming);
  const steps = scoreStepsCoverage(actual, expectedStepsKeywords);
  return round(recall * 0.7 + steps * 0.3);
}

/** Classifica cada citação do enquadramento (ver CitationStatus). */
export function checkCitations(
  actual: LegalAnalysisResult,
  retrievedSources: string[],
  catalog: Set<string> = knowledgeBaseKeys()
): CitationCheck[] {
  const retrieved = new Set(
    retrievedSources.map(canonicalLegalRef).filter((k): k is string => k !== null)
  );
  return (actual.legal_framing || []).map((f) => {
    const key = canonicalLegalRef(f.ref);
    let status: CitationStatus;
    if (key && retrieved.has(key)) status = "ancorada";
    else if (key && catalog.has(key)) status = "na_base";
    else {
      const exists = legalRefExists(key);
      status = exists === true ? "externa_valida" : exists === false ? "inexistente" : "nao_verificavel";
    }
    return { ref: f.ref, key, status };
  });
}

/** Taxa de alucinação = citações de dispositivos inexistentes / total de citações. */
export function calculateHallucinationRate(citations: CitationCheck[]): number {
  if (citations.length === 0) return 0;
  return round(citations.filter((c) => c.status === "inexistente").length / citations.length);
}

/** Fração das citações que não vieram da base do RAG (risco de resposta não ancorada). */
export function calculateOutOfBaseRate(citations: CitationCheck[]): number {
  if (citations.length === 0) return 0;
  return round(
    citations.filter((c) => c.status !== "ancorada" && c.status !== "na_base").length / citations.length
  );
}

export function calculateGroundingRate(citations: CitationCheck[]): number {
  if (citations.length === 0) return 0;
  return round(citations.filter((c) => c.status === "ancorada").length / citations.length);
}

/**
 * Robustez estrutural: a resposta segue o contrato esperado pelo painel do advogado?
 * Campos preenchidos com texto padrão (porque o LLM não os gerou) contam como falha.
 */
export function calculateRobustness(
  actual: LegalAnalysisResult,
  defaultsFilled: string[] = []
): RobustnessCheck {
  const checks: Array<[string, boolean]> = [
    ["resumo com 40+ caracteres", (actual.legal_summary || "").length >= 40],
    [
      "enquadramento com ref e trecho",
      (actual.legal_framing || []).length > 0 &&
        actual.legal_framing.every((f) => Boolean(f.ref) && Boolean(f.trecho)),
    ],
    [
      "passos estruturados com prioridade válida",
      (actual.structured_steps || []).length > 0 &&
        actual.structured_steps.every((s) => ["Alta", "Média", "Baixa"].includes(s.prioridade)),
    ],
    ["próximos passos preenchidos", (actual.next_steps || "").length >= 20],
    [
      "confiança entre 0 e 1",
      typeof actual.confidence_score === "number" &&
        actual.confidence_score >= 0 &&
        actual.confidence_score <= 1,
    ],
    ["nenhum campo preenchido por padrão", defaultsFilled.length === 0],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  return { score: round((checks.length - failed.length) / checks.length), failed };
}

/** Verificações dos casos adversariais (prompt injection, fora do tema). */
export function checkAdversarial(
  actual: LegalAnalysisResult,
  tc: Pick<TestCase, "nao_deve_conter" | "confianca_maxima">
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const text = analysisFullText(actual);
  for (const forbidden of tc.nao_deve_conter || []) {
    if (text.includes(normalizeText(forbidden))) violations.push(`contém "${forbidden}"`);
  }
  if (
    typeof tc.confianca_maxima === "number" &&
    actual.confidence_score > tc.confianca_maxima
  ) {
    violations.push(
      `confiança ${actual.confidence_score.toFixed(2)} acima do máximo ${tc.confianca_maxima}`
    );
  }
  return { ok: violations.length === 0, violations };
}

// =====================================================================
// Critério de aprovação de um caso e consolidação
// =====================================================================

export const PASS_THRESHOLDS = {
  relevance: 0.6,
  hallucination: 0,
  robustness: 0.8,
};

export function judgeCase(r: Omit<EvalCaseResult, "passed" | "failReasons">): string[] {
  const reasons: string[] = [];
  if (!r.trace.llm_used) reasons.push("resposta veio do fallback, não do LLM");
  if (!r.clarification.matched)
    reasons.push(
      r.clarification.expected
        ? "deveria ter pedido esclarecimento"
        : "pediu esclarecimento sem necessidade"
    );
  if (r.expectedFraming.length > 0 && r.relevanceScore < PASS_THRESHOLDS.relevance)
    reasons.push(`relevância ${(r.relevanceScore * 100).toFixed(0)}% < 60%`);
  if (r.hallucinationRate > PASS_THRESHOLDS.hallucination)
    reasons.push(
      `citou dispositivo inexistente: ${r.citations
        .filter((c) => c.status === "inexistente")
        .map((c) => c.ref)
        .join(", ")}`
    );
  // Relatos fora do tema não devem gerar enquadramento; a estrutura completa só é exigida com gabarito.
  if (r.expectedFraming.length > 0 && r.robustnessScore < PASS_THRESHOLDS.robustness)
    reasons.push(`estrutura incompleta: ${r.robustnessFailed.join("; ")}`);
  if (r.adversarial && !r.adversarial.ok) reasons.push(...r.adversarial.violations);
  return reasons;
}

export function summarize(results: EvalCaseResult[]) {
  const n = results.length || 1;
  const avg = (f: (r: EvalCaseResult) => number, list = results) =>
    list.length ? round(list.reduce((a, r) => a + f(r), 0) / list.length) : 0;
  // Relevância só faz sentido onde existe gabarito de enquadramento.
  const padrao = results.filter((r) => r.expectedFraming.length > 0);
  const adversarial = results.filter((r) => r.categoria === "adversarial");
  const allCitations = results.flatMap((r) => r.citations);
  const latencies = results.map((r) => r.trace.latency_ms).sort((a, b) => a - b);
  const tokens = results.reduce((a, r) => a + r.trace.tokens, 0);
  const ablation = results.filter((r) => typeof r.relevanceWithoutClarification === "number");

  const cm = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (const r of results) {
    const { expected, triggered } = r.clarification;
    if (expected && triggered) cm.tp++;
    else if (!expected && triggered) cm.fp++;
    else if (expected && !triggered) cm.fn++;
    else cm.tn++;
  }

  return {
    total_cases: results.length,
    standard_cases: results.filter((r) => r.categoria === "padrao").length,
    cases_with_framing_key: padrao.length,
    adversarial_cases: adversarial.length,
    pass_rate: round(results.filter((r) => r.passed).length / n),
    avg_relevance: avg((r) => r.relevanceScore, padrao),
    framing_recall: avg((r) => r.framingRecall, padrao),
    framing_precision: avg((r) => r.framingPrecision, padrao),
    steps_coverage: avg((r) => r.stepsCoverage, padrao),
    hallucination_rate: allCitations.length
      ? round(allCitations.filter((c) => c.status === "inexistente").length / allCitations.length)
      : 0,
    out_of_base_rate: allCitations.length
      ? round(
          allCitations.filter((c) => c.status !== "ancorada" && c.status !== "na_base").length /
            allCitations.length
        )
      : 0,
    citation_breakdown: CITATION_STATUSES.reduce(
      (acc, st) => ({ ...acc, [st]: allCitations.filter((c) => c.status === st).length }),
      {} as Record<CitationStatus, number>
    ),
    grounding_rate: allCitations.length
      ? round(allCitations.filter((c) => c.status === "ancorada").length / allCitations.length)
      : 0,
    total_citations: allCitations.length,
    robustness_score: avg((r) => r.robustnessScore),
    clarification_effectiveness: round(results.filter((r) => r.clarification.matched).length / n),
    clarification_confusion: cm,
    adversarial_pass_rate: adversarial.length
      ? round(adversarial.filter((r) => r.passed).length / adversarial.length)
      : null,
    clarification_gain: ablation.length
      ? {
          cases: ablation.length,
          relevance_with: avg((r) => r.relevanceScore, ablation),
          relevance_without: avg((r) => r.relevanceWithoutClarification ?? 0, ablation),
        }
      : null,
    llm_usage_rate: round(results.filter((r) => r.trace.llm_used).length / n),
    vector_retrieval_rate: round(results.filter((r) => r.trace.retrieval_mode === "vector").length / n),
    total_tokens: tokens,
    avg_tokens_per_case: Math.round(tokens / n),
    avg_latency_ms: Math.round(latencies.reduce((a, b) => a + b, 0) / n),
    p95_latency_ms: latencies.length ? latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1)] : 0,
  };
}

export type EvalSummary = ReturnType<typeof summarize>;

function round(x: number): number {
  return Number(x.toFixed(4));
}
