import fs from "fs";
import path from "path";
import {
  calculateHallucinationRate,
  calculateRelevance,
  calculateRobustness,
  EvalCaseResult,
  TestCase,
} from "./metrics";
import {
  evaluateSufficiency,
  generateLegalAnalysis,
} from "@/backend/services/llm/clarificationEngine";
import { getSupabaseServerClient } from "@/backend/services/supabase/client";

async function runEvaluation() {
  console.log("\n=======================================================");
  console.log(" ADVASSIST — HARNESS DE AVALIAÇÃO DO COMPONENTE DE IA ");
  console.log("=======================================================\n");

  const datasetPath = path.resolve(__dirname, "./dataset/casos_teste.json");
  const rawDataset = fs.readFileSync(datasetPath, "utf-8");
  const testCases: TestCase[] = JSON.parse(rawDataset);

  console.log(`Carregados ${testCases.length} casos sintéticos para avaliação.\n`);

  const results: EvalCaseResult[] = [];

  for (const tc of testCases) {
    console.log(`[Eval] Executando: ${tc.id} - ${tc.titulo}...`);

    // 1. Avalia o motor de esclarecimento
    const sufficiency = await evaluateSufficiency(tc.descricao_inicial);
    const triggeredClarification = !sufficiency.is_sufficient;
    const clarificationMatched =
      triggeredClarification === tc.espera_perguntas_esclarecimento;

    // 2. Prepara esclarecimentos para análise
    const clarifications = triggeredClarification
      ? tc.respostas_simuladas.map((ans, idx) => ({
          question: sufficiency.questions[idx]?.text || `Pergunta ${idx + 1}`,
          answer: ans.text,
        }))
      : [];

    // 3. Executa a análise jurídica (RAG + LLM)
    const analysis = await generateLegalAnalysis(
      `Cliente Teste (${tc.id})`,
      tc.descricao_inicial,
      clarifications
    );

    // 4. Calcula métricas
    const relevanceScore = calculateRelevance(
      analysis,
      tc.enquadramento_esperado,
      tc.proximos_passos_esperados_contendo
    );

    const hallucinationRate = calculateHallucinationRate(analysis);
    const robustnessScore = calculateRobustness(analysis);

    results.push({
      testCaseId: tc.id,
      titulo: tc.titulo,
      clarificationMatched,
      relevanceScore,
      hallucinationRate,
      robustnessScore,
      actualFraming: (analysis.legal_framing || []).map((f) => f.ref),
      expectedFraming: tc.enquadramento_esperado,
    });
  }

  // Consolidação das métricas
  const total = results.length;
  const avgRelevance =
    results.reduce((acc, r) => acc + r.relevanceScore, 0) / total;
  const avgHallucination =
    results.reduce((acc, r) => acc + r.hallucinationRate, 0) / total;
  const avgRobustness =
    results.reduce((acc, r) => acc + r.robustnessScore, 0) / total;
  const clarificationAccuracy =
    results.filter((r) => r.clarificationMatched).length / total;

  console.log("\n=======================================================");
  console.log(" RELATÓRIO CONSOLIDADO DE PERFORMANCE DA IA ");
  console.log("=======================================================");
  console.table(
    results.map((r) => ({
      Caso: r.testCaseId,
      "Esclarec. OK": r.clarificationMatched ? "SIM" : "NÃO",
      Relevância: `${(r.relevanceScore * 100).toFixed(1)}%`,
      Alucinação: `${(r.hallucinationRate * 100).toFixed(1)}%`,
      Robustez: `${(r.robustnessScore * 100).toFixed(1)}%`,
      "Normas Citadas": r.actualFraming.join(", "),
    }))
  );

  console.log("\nMÉTRICAS GERAIS:");
  console.log(`- Total de Casos Avaliados: ${total}`);
  console.log(`- Relevância Média: ${(avgRelevance * 100).toFixed(2)}%`);
  console.log(`- Taxa Média de Alucinação: ${(avgHallucination * 100).toFixed(2)}%`);
  console.log(`- Score Médio de Robustez: ${(avgRobustness * 100).toFixed(2)}%`);
  console.log(
    `- Acurácia do Motor de Esclarecimento: ${(
      clarificationAccuracy * 100
    ).toFixed(2)}%\n`
  );

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_cases: total,
      avg_relevance: Number(avgRelevance.toFixed(4)),
      hallucination_rate: Number(avgHallucination.toFixed(4)),
      robustness_score: Number(avgRobustness.toFixed(4)),
      clarification_effectiveness: Number(clarificationAccuracy.toFixed(4)),
    },
    cases: results,
  };

  const reportPath = path.resolve(__dirname, "./report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Relatório local salvo com sucesso em: ${reportPath}`);

  // Tenta persistir no Supabase (se configurado)
  try {
    const supabase = getSupabaseServerClient();
    await supabase.from("eval_runs").insert({
      total_cases: total,
      avg_relevance: report.summary.avg_relevance,
      hallucination_rate: report.summary.hallucination_rate,
      robustness_score: report.summary.robustness_score,
      clarification_effectiveness: report.summary.clarification_effectiveness,
      raw_results: report,
    });
    console.log("Registro de avaliação gravado com sucesso no Supabase (tabela eval_runs).");
  } catch {
    console.log(
      "Aviso: Não foi possível gravar no Supabase remoto (credenciais não configuradas ou rede indisponível). Relatório local preservado."
    );
  }

  console.log("=======================================================\n");
}

runEvaluation().catch((err) => {
  console.error("Erro na execução do harness de eval:", err);
  process.exit(1);
});
