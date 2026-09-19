import { describe, it, expect } from "vitest";
import {
  buildSufficiencyPrompt,
  buildAnalysisPrompt,
} from "@/backend/services/llm/promptTemplates";

describe("Unit Tests — Prompt Templates", () => {
  it("buildSufficiencyPrompt deve conter delimitadores explícitos e instrução de formato JSON", () => {
    const description = "Estou atuando como PJ mas cumpro ordens diretas.";
    const { systemPrompt, userPrompt } = buildSufficiencyPrompt(description);

    // Proteção de injeção e delimitadores
    expect(userPrompt).toContain("<relato_cliente>");
    expect(userPrompt).toContain("</relato_cliente>");
    expect(userPrompt).toContain(description);

    // Diretrizes de saída
    expect(systemPrompt).toContain("is_sufficient");
    expect(systemPrompt).toContain("questions");
    expect(systemPrompt).toContain("JSON estrito");
  });

  it("buildAnalysisPrompt deve injetar contexto fático e normas recuperadas via RAG", () => {
    const { systemPrompt, userPrompt } = buildAnalysisPrompt(
      "João da Silva",
      "Não recebi verbas rescisórias após demissão sem justa causa.",
      [{ question: "Qual a data da demissão?", answer: "Há 45 dias." }],
      [
        {
          source: "CLT Art. 477",
          content: "Prazo de 10 dias para quitação das verbas rescisórias.",
          similarity: 0.89,
        },
      ]
    );

    expect(userPrompt).toContain("João da Silva");
    expect(userPrompt).toContain("<relato_inicial>");
    expect(userPrompt).toContain("<esclarecimentos_adicionais>");
    expect(userPrompt).toContain("Há 45 dias.");
    expect(userPrompt).toContain("<normas_recuperadas_rag>");
    expect(userPrompt).toContain("CLT Art. 477");

    expect(systemPrompt).toContain("legal_summary");
    expect(systemPrompt).toContain("legal_framing");
    expect(systemPrompt).toContain("next_steps");
    expect(systemPrompt).toContain("confidence_score");
  });
});
