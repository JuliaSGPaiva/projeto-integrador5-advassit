import { SEED_LEGAL_DOCUMENTS } from "@/backend/services/rag/seedData";
import { LegalAnalysisResult } from "@/backend/services/llm/promptTemplates";

export interface TestCase {
  id: string;
  titulo: string;
  descricao_inicial: string;
  espera_perguntas_esclarecimento: boolean;
  respostas_simuladas: Array<{ order: number; text: string }>;
  enquadramento_esperado: string[];
  proximos_passos_esperados_contendo: string[];
}

export interface EvalCaseResult {
  testCaseId: string;
  titulo: string;
  clarificationMatched: boolean;
  relevanceScore: number;
  hallucinationRate: number;
  robustnessScore: number;
  actualFraming: string[];
  expectedFraming: string[];
}

/**
 * Calcula a taxa de relevância (0.0 a 1.0) comparando o enquadramento gerado com o gabarito.
 */
export function calculateRelevance(
  actual: LegalAnalysisResult,
  expectedFraming: string[],
  expectedStepsKeywords: string[]
): number {
  if (!actual.legal_framing || actual.legal_framing.length === 0) {
    return 0.2;
  }

  const actualRefs = actual.legal_framing.map((f) => f.ref.toLowerCase());
  let matchedRefs = 0;

  for (const exp of expectedFraming) {
    const expLower = exp.toLowerCase();
    const found = actualRefs.some(
      (act) => act.includes(expLower) || expLower.includes(act)
    );
    if (found) matchedRefs++;
  }

  const refScore = expectedFraming.length > 0 ? matchedRefs / expectedFraming.length : 1.0;

  // Verifica presença de palavras-chave nos próximos passos
  let stepMatches = 0;
  const nextStepsLower = (actual.next_steps || "").toLowerCase();
  for (const kw of expectedStepsKeywords) {
    if (nextStepsLower.includes(kw.toLowerCase())) {
      stepMatches++;
    }
  }

  const stepScore =
    expectedStepsKeywords.length > 0
      ? stepMatches / expectedStepsKeywords.length
      : 1.0;

  return Number((refScore * 0.7 + stepScore * 0.3).toFixed(4));
}

/**
 * Calcula a taxa de alucinação (0.0 a 1.0).
 * Avalia se as normas citadas constam no catálogo celetista ou na base legal válida.
 */
export function calculateHallucinationRate(
  actual: LegalAnalysisResult
): number {
  if (!actual.legal_framing || actual.legal_framing.length === 0) {
    return 0.0;
  }

  const knownSources = SEED_LEGAL_DOCUMENTS.map((d) => d.source.toLowerCase());

  let unrecognizedCitations = 0;
  for (const f of actual.legal_framing) {
    const refLower = f.ref.toLowerCase();
    const isKnown =
      knownSources.some((s) => s.includes(refLower) || refLower.includes(s)) ||
      refLower.includes("clt") ||
      refLower.includes("tst") ||
      refLower.includes("súmula") ||
      refLower.includes("cf");

    if (!isKnown) {
      unrecognizedCitations++;
    }
  }

  return Number((unrecognizedCitations / actual.legal_framing.length).toFixed(4));
}

/**
 * Calcula a robustez da resposta com base no preenchimento correto dos campos e sanidade dos valores.
 */
export function calculateRobustness(actual: LegalAnalysisResult): number {
  let score = 0;
  if (actual.legal_summary && actual.legal_summary.length >= 20) score += 0.3;
  if (actual.legal_framing && actual.legal_framing.length > 0) score += 0.3;
  if (actual.next_steps && actual.next_steps.length >= 20) score += 0.2;
  if (
    typeof actual.confidence_score === "number" &&
    actual.confidence_score >= 0 &&
    actual.confidence_score <= 1
  ) {
    score += 0.2;
  }
  return Number(score.toFixed(4));
}
