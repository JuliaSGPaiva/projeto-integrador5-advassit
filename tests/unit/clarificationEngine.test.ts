import { describe, it, expect } from "vitest";
import { fallbackSufficiencyHeuristic } from "@/backend/services/llm/clarificationEngine";

describe("Unit Tests — Clarification Engine & Heuristics", () => {
  it("deve detectar relato vago sobre pejotização e gerar até 3 perguntas de esclarecimento", () => {
    const vaguePjRelato = "Trabalho como PJ mas atuo como CLT";
    const result = fallbackSufficiencyHeuristic(vaguePjRelato);

    expect(result.is_sufficient).toBe(false);
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions.length).toBeLessThanOrEqual(3);
    expect(result.questions[0].order).toBe(1);
    expect(result.questions[0].text).toBeTruthy();
  });

  it("deve reconhecer relato suficientemente detalhado sem gerar perguntas desnecessárias", () => {
    const detailedRelato =
      "Fui contratado pela empresa XPTO em 10/01/2022 com carteira assinada na função de analista júnior. No dia 15/07/2024 fui comunicado da demissão sem justa causa com cumprimento de aviso prévio indenizado. Passados 30 dias do término, a empresa não depositou as verbas rescisórias nem liberou as guias para saque do FGTS e seguro desemprego.";

    const result = fallbackSufficiencyHeuristic(detailedRelato);
    expect(result.is_sufficient).toBe(true);
    expect(result.questions).toHaveLength(0);
  });
});
