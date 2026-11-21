/**
 * AdvAssist — Harness de avaliação (eval) do componente de IA.
 *
 * Uso:
 *   npm run eval                                  # todos os casos + ablação do esclarecimento
 *   npm run eval -- --rapido                      # sem ablação (metade das chamadas)
 *   npm run eval -- --casos=caso_04_rescisao_indireta,adv_01_injecao_valor
 *   npm run eval -- --rotulo="v2 - prompt ancorado no RAG"
 *   npm run eval -- --delay=8000                  # pausa entre chamadas (rate limit do Groq free tier)
 *
 * Saídas:
 *   tests/eval/report.json   relatório completo da última execução (lido pela página /admin/eval)
 *   tests/eval/history.json  resumo de todas as execuções (gráfico de evolução)
 */
import "./loadEnv";
import fs from "fs";
import path from "path";
import {
  calculateGroundingRate,
  calculateHallucinationRate,
  calculateOutOfBaseRate,
  calculateRelevance,
  calculateRobustness,
  checkAdversarial,
  checkCitations,
  EvalCaseResult,
  judgeCase,
  PASS_THRESHOLDS,
  scoreFraming,
  scoreStepsCoverage,
  summarize,
  TestCase,
} from "./metrics";
import {
  AiCallTrace,
  evaluateSufficiencyDetailed,
  generateLegalAnalysisDetailed,
} from "@/backend/services/llm/clarificationEngine";
import { DEFAULT_GROQ_MODEL } from "@/backend/services/llm/groqClient";
import { embeddingStats } from "@/backend/services/rag/embeddings";
import { getSupabaseServerClient } from "@/backend/services/supabase/client";

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const flag = (name: string) => args.includes(`--${name}`);

const ONLY_CASES = arg("casos")?.split(",").map((s) => s.trim()).filter(Boolean);
const RUN_ABLATION = !flag("rapido");
const DELAY_MS = Number(arg("delay") ?? 4000);
const LABEL = arg("rotulo") ?? "";
const MAX_RETRIES = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isRateLimit = (t: AiCallTrace) =>
  t.source === "fallback" && /429|rate.?limit|too many/i.test(t.error ?? "");

/** Executa uma chamada de IA e repete se o Groq devolver limite de uso (429). */
async function withRetry<T extends { trace: AiCallTrace }>(
  label: string,
  fn: () => Promise<T>,
  counter: { retries: number }
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const out = await fn();
    if (!isRateLimit(out.trace) || attempt >= MAX_RETRIES) return out;
    const wait = 20000 * (attempt + 1);
    counter.retries++;
    console.log(`   ⏳ ${label}: limite do Groq atingido, aguardando ${wait / 1000}s...`);
    await sleep(wait);
  }
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

async function runEvaluation() {
  console.log("\n=======================================================");
  console.log(" ADVASSIST — HARNESS DE AVALIAÇÃO DO COMPONENTE DE IA ");
  console.log("=======================================================\n");

  const datasetPath = path.resolve(__dirname, "./dataset/casos_teste.json");
  let testCases: TestCase[] = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
  if (ONLY_CASES?.length) testCases = testCases.filter((tc) => ONLY_CASES.includes(tc.id));

  console.log(`Modelo: ${DEFAULT_GROQ_MODEL}`);
  console.log(`Casos: ${testCases.length} | Ablação do esclarecimento: ${RUN_ABLATION ? "sim" : "não"}\n`);

  const results: EvalCaseResult[] = [];
  const startedAt = Date.now();

  for (const [i, tc] of testCases.entries()) {
    console.log(`[${i + 1}/${testCases.length}] ${tc.id} — ${tc.titulo}`);
    const counter = { retries: 0 };
    const errors: string[] = [];

    // 1. Motor de esclarecimento
    const suff = await withRetry("esclarecimento", () => evaluateSufficiencyDetailed(tc.descricao_inicial), counter);
    if (suff.trace.error) errors.push(`esclarecimento: ${suff.trace.error}`);
    const triggered = !suff.result.is_sufficient;
    await sleep(DELAY_MS);

    // 2. Respostas simuladas do cliente às perguntas geradas
    const clarifications = triggered
      ? tc.respostas_simuladas.map((ans, idx) => ({
          question: suff.result.questions[idx]?.text || `Pergunta ${idx + 1}`,
          answer: ans.text,
        }))
      : [];

    // 3. Análise jurídica (RAG + LLM)
    const analysisOut = await withRetry(
      "análise",
      () => generateLegalAnalysisDetailed(`Cliente Teste (${tc.id})`, tc.descricao_inicial, clarifications),
      counter
    );
    const analysis = analysisOut.result;
    const trace = analysisOut.trace;
    if (trace.error) errors.push(`análise: ${trace.error}`);
    if (trace.retrieval?.fallback_reason) errors.push(`RAG: ${trace.retrieval.fallback_reason}`);
    await sleep(DELAY_MS);

    // 4. Ablação: mesma análise SEM as respostas de esclarecimento
    let relevanceWithoutClarification: number | undefined;
    if (RUN_ABLATION && clarifications.length > 0 && tc.enquadramento_esperado.length > 0) {
      const ablation = await withRetry(
        "ablação",
        () => generateLegalAnalysisDetailed(`Cliente Teste (${tc.id})`, tc.descricao_inicial, []),
        counter
      );
      if (ablation.trace.source === "llm") {
        relevanceWithoutClarification = calculateRelevance(
          ablation.result,
          tc.enquadramento_esperado,
          tc.proximos_passos_esperados_contendo
        );
      }
      await sleep(DELAY_MS);
    }

    // 5. Métricas
    const retrievedSources = trace.retrieval?.docs.map((d) => d.source) ?? [];
    const framing = scoreFraming(analysis.legal_framing.map((f) => f.ref), tc.enquadramento_esperado);
    const citations = checkCitations(analysis, retrievedSources);
    const robustness = calculateRobustness(analysis, trace.source === "llm" ? trace.defaults_filled : []);
    const categoria = tc.categoria ?? "padrao";
    const adversarial =
      tc.nao_deve_conter || typeof tc.confianca_maxima === "number"
        ? checkAdversarial(analysis, tc)
        : undefined;

    const partial: Omit<EvalCaseResult, "passed" | "failReasons"> = {
      testCaseId: tc.id,
      titulo: tc.titulo,
      categoria,
      clarification: {
        expected: tc.espera_perguntas_esclarecimento,
        triggered,
        matched: triggered === tc.espera_perguntas_esclarecimento,
        questions: suff.result.questions.map((q) => q.text),
      },
      relevanceScore: calculateRelevance(analysis, tc.enquadramento_esperado, tc.proximos_passos_esperados_contendo),
      framingRecall: framing.recall,
      framingPrecision: framing.precision,
      stepsCoverage: scoreStepsCoverage(analysis, tc.proximos_passos_esperados_contendo),
      hallucinationRate: calculateHallucinationRate(citations),
      groundingRate: calculateGroundingRate(citations),
      outOfBaseRate: calculateOutOfBaseRate(citations),
      robustnessScore: robustness.score,
      robustnessFailed: robustness.failed,
      adversarial,
      relevanceWithoutClarification,
      confidence: analysis.confidence_score,
      actualFraming: analysis.legal_framing.map((f) => f.ref),
      expectedFraming: tc.enquadramento_esperado,
      citations,
      retrievedSources,
      trace: {
        llm_used: suff.trace.source === "llm" && trace.source === "llm",
        retrieval_mode: trace.retrieval?.mode ?? "n/a",
        defaults_filled: trace.defaults_filled,
        errors,
        tokens: (suff.trace.usage?.total_tokens ?? 0) + (trace.usage?.total_tokens ?? 0),
        latency_ms: suff.trace.latency_ms + trace.latency_ms,
        retries: counter.retries,
      },
    };
    const failReasons = judgeCase(partial);
    const result: EvalCaseResult = { ...partial, passed: failReasons.length === 0, failReasons };
    results.push(result);

    console.log(
      `   ${result.passed ? "✅ APROVADO" : "❌ REPROVADO"} | relevância ${pct(result.relevanceScore)} | ` +
        `alucinação ${pct(result.hallucinationRate)} | normas: ${result.actualFraming.join(", ") || "—"}`
    );
    for (const reason of failReasons) console.log(`      • ${reason}`);
  }

  const summary = summarize(results);

  console.log("\n=======================================================");
  console.log(" RELATÓRIO CONSOLIDADO DE PERFORMANCE DA IA ");
  console.log("=======================================================");
  console.table(
    results.map((r) => ({
      Caso: r.testCaseId,
      Resultado: r.passed ? "OK" : "FALHOU",
      Esclarec: r.clarification.matched ? "OK" : "ERRO",
      Relevância: r.expectedFraming.length ? pct(r.relevanceScore) : "—",
      Alucinação: pct(r.hallucinationRate),
      Ancoragem: pct(r.groundingRate),
      Robustez: pct(r.robustnessScore),
      Tokens: r.trace.tokens,
    }))
  );

  console.log("\nMÉTRICAS GERAIS:");
  console.log(`- Casos aprovados: ${pct(summary.pass_rate)} (${results.filter((r) => r.passed).length}/${summary.total_cases})`);
  console.log(`- Relevância média: ${pct(summary.avg_relevance)}  (recall do enquadramento ${pct(summary.framing_recall)})`);
  console.log(`- Taxa de alucinação (dispositivos inexistentes): ${pct(summary.hallucination_rate)} de ${summary.total_citations} citações`);
  console.log(`- Ancoragem no RAG (citações entre os documentos recuperados): ${pct(summary.grounding_rate)}`);
  console.log(`- Citações fora da base do RAG: ${pct(summary.out_of_base_rate)} ${JSON.stringify(summary.citation_breakdown)}`);
  console.log(`- Robustez estrutural: ${pct(summary.robustness_score)}`);
  console.log(`- Acurácia do esclarecimento: ${pct(summary.clarification_effectiveness)}`);
  if (summary.adversarial_pass_rate !== null)
    console.log(`- Casos adversariais resistidos: ${pct(summary.adversarial_pass_rate)}`);
  if (summary.clarification_gain)
    console.log(
      `- Ganho do esclarecimento: relevância ${pct(summary.clarification_gain.relevance_without)} → ${pct(summary.clarification_gain.relevance_with)}`
    );
  console.log(`- Respostas vindas do LLM (sem fallback): ${pct(summary.llm_usage_rate)}`);
  console.log(`- Busca vetorial real (pgvector): ${pct(summary.vector_retrieval_rate)}`);
  console.log(`- Embeddings: ${embeddingStats.huggingface} via Hugging Face, ${embeddingStats.fallback} via fallback local`);
  console.log(`- Tokens: ${summary.total_tokens} no total, ${summary.avg_tokens_per_case} por caso`);
  console.log(`- Latência média por caso: ${(summary.avg_latency_ms / 1000).toFixed(1)}s (p95 ${(summary.p95_latency_ms / 1000).toFixed(1)}s)\n`);

  const report = {
    timestamp: new Date().toISOString(),
    label: LABEL,
    model: DEFAULT_GROQ_MODEL,
    duration_s: Math.round((Date.now() - startedAt) / 1000),
    thresholds: PASS_THRESHOLDS,
    embeddings: { huggingface: embeddingStats.huggingface, fallback: embeddingStats.fallback, last_error: embeddingStats.lastError },
    partial_run: Boolean(ONLY_CASES?.length),
    summary,
    cases: results,
  };

  // Execuções parciais (--casos) não sobrescrevem o relatório oficial mostrado na página.
  const reportName = report.partial_run ? "report.partial.json" : "report.json";
  const reportPath = path.resolve(__dirname, reportName);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Relatório salvo em: ${reportPath}`);

  if (!report.partial_run) {
    const historyPath = path.resolve(__dirname, "./history.json");
    const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, "utf-8")) : [];
    history.push({ timestamp: report.timestamp, label: LABEL, model: report.model, summary });
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), "utf-8");
    console.log(`Histórico atualizado: ${historyPath} (${history.length} execuções)`);

    try {
      const supabase = getSupabaseServerClient();
      const { error } = await supabase.from("eval_runs").insert({
        total_cases: summary.total_cases,
        avg_relevance: summary.avg_relevance,
        hallucination_rate: summary.hallucination_rate,
        robustness_score: summary.robustness_score,
        clarification_effectiveness: summary.clarification_effectiveness,
        raw_results: report,
      });
      if (error) throw error;
      console.log("Execução registrada no Supabase (tabela eval_runs).");
    } catch (err) {
      console.log(`Aviso: não foi possível gravar no Supabase (${String(err)}). Relatório local preservado.`);
    }
  }
  console.log("=======================================================\n");
}

runEvaluation().catch((err) => {
  console.error("Erro na execução do harness de eval:", err);
  process.exit(1);
});
