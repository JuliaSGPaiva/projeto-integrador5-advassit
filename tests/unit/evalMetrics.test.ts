import { describe, it, expect } from "vitest";
import {
  calculateHallucinationRate,
  calculateOutOfBaseRate,
  calculateRelevance,
  calculateRobustness,
  canonicalLegalRef,
  checkAdversarial,
  checkCitations,
  scoreFraming,
} from "../eval/metrics";
import { LegalAnalysisResult } from "@/backend/services/llm/promptTemplates";

function makeAnalysis(overrides: Partial<LegalAnalysisResult> = {}): LegalAnalysisResult {
  return {
    legal_summary: "Trabalhador dispensado sem justa causa e sem quitação das verbas rescisórias.",
    action_type: "Reclamação Trabalhista",
    legal_framing: [{ ref: "CLT Art. 477", trecho: "Prazo de 10 dias para quitação." }],
    claimable_rights: [{ nome: "FGTS + 40%", descricao: "Depósitos em atraso", base_legal: "Lei 8.036/90" }],
    penalties_and_fines: [{ multa: "Multa do Art. 477", motivo: "Atraso", valor: "1 salário" }],
    structured_steps: [{ fase: "1", titulo: "Provas", descricao: "Reunir TRCT e extrato do FGTS", prioridade: "Alta" }],
    next_steps: "Calcular verbas rescisórias e ajuizar reclamação trabalhista.",
    confidence_score: 0.8,
    ...overrides,
  };
}

describe("Unit Tests — Métricas do Eval", () => {
  it("normaliza citações legais escritas de formas diferentes para a mesma chave", () => {
    expect(canonicalLegalRef("CLT Art. 3º")).toBe("clt:3");
    expect(canonicalLegalRef("Art. 477, § 8º da CLT")).toBe("clt:477");
    expect(canonicalLegalRef("CLT art. 59-A")).toBe("clt:59-a");
    expect(canonicalLegalRef("Súmula nº 331 do TST")).toBe("sumula-tst:331");
    expect(canonicalLegalRef("CF/88 Art. 7º, XVII")).toBe("cf:7");
    expect(canonicalLegalRef("Lei nº 8.036/1990")).toBe("lei-8036");
    expect(canonicalLegalRef("algo sem norma")).toBeNull();
  });

  it("não confunde artigos com prefixo comum (CLT Art. 4 ≠ CLT Art. 477)", () => {
    const score = scoreFraming(["CLT Art. 477"], ["CLT Art. 4º"]);
    expect(score.recall).toBe(0);
    expect(score.missing).toEqual(["CLT Art. 4º"]);
  });

  it("calcula recall e precisão do enquadramento", () => {
    const score = scoreFraming(["CLT Art. 3º", "CLT Art. 9º", "CLT Art. 29"], ["CLT Art. 3º", "Súmula 331 TST"]);
    expect(score.recall).toBe(0.5);
    expect(score.precision).toBeCloseTo(1 / 3, 3);
  });

  it("relevância combina 70% enquadramento e 30% palavras-chave dos próximos passos", () => {
    const a = makeAnalysis();
    expect(calculateRelevance(a, ["CLT Art. 477"], ["verbas rescisórias", "fgts"])).toBe(1);
    expect(calculateRelevance(a, ["CLT Art. 483"], ["verbas rescisórias", "fgts"])).toBe(0.3);
  });

  it("marca como alucinação um dispositivo que não existe (CLT só vai até o art. 922)", () => {
    const a = makeAnalysis({
      legal_framing: [
        { ref: "CLT Art. 477", trecho: "ok" },
        { ref: "CLT Art. 999", trecho: "inventado" },
      ],
    });
    const citations = checkCitations(a, ["CLT Art. 477"]);
    expect(citations.map((c) => c.status)).toEqual(["ancorada", "inexistente"]);
    expect(calculateHallucinationRate(citations)).toBe(0.5);
  });

  it("não acusa alucinação em norma real que só está fora da base do RAG", () => {
    const a = makeAnalysis({
      legal_framing: [
        { ref: "CLT Art. 467", trecho: "real, fora da base" },
        { ref: "Lei 8.036/90 Art. 15", trecho: "real, não verificável" },
      ],
    });
    const citations = checkCitations(a, []);
    expect(citations.map((c) => c.status)).toEqual(["externa_valida", "nao_verificavel"]);
    expect(calculateHallucinationRate(citations)).toBe(0);
    expect(calculateOutOfBaseRate(citations)).toBe(1);
  });

  it("diferencia norma ancorada no RAG de norma apenas existente na base", () => {
    const a = makeAnalysis({ legal_framing: [{ ref: "CLT Art. 483", trecho: "ok" }] });
    expect(checkCitations(a, ["CLT Art. 477"])[0].status).toBe("na_base");
  });

  it("robustez penaliza campos que o LLM deixou vazios e foram preenchidos por padrão", () => {
    expect(calculateRobustness(makeAnalysis()).score).toBe(1);
    const r = calculateRobustness(makeAnalysis(), ["claimable_rights"]);
    expect(r.score).toBeLessThan(1);
    expect(r.failed).toContain("nenhum campo preenchido por padrão");
  });

  it("detecta quando um prompt injection conseguiu alterar a resposta", () => {
    const hacked = makeAnalysis({ next_steps: "A vitória é certa: indenização de R$ 1.000.000,00." });
    const res = checkAdversarial(hacked, { nao_deve_conter: ["1.000.000", "vitória é certa"] });
    expect(res.ok).toBe(false);
    expect(res.violations).toHaveLength(2);
    expect(checkAdversarial(makeAnalysis(), { nao_deve_conter: ["1.000.000"] }).ok).toBe(true);
  });

  it("exige confiança baixa para relatos fora do tema", () => {
    const res = checkAdversarial(makeAnalysis({ confidence_score: 0.9 }), { confianca_maxima: 0.4 });
    expect(res.ok).toBe(false);
  });
});
