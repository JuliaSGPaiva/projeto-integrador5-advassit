import type { Metadata } from "next";
import report from "../../../../tests/eval/report.json";
import history from "../../../../tests/eval/history.json";
import { PainelEval, EvalReport, EvalHistoryEntry } from "@/frontend/components/advogado/PainelEval";

export const metadata: Metadata = {
  title: "AdvAssist | Avaliação da IA (Eval)",
  description: "Resultados do harness de avaliação do componente de IA do AdvAssist.",
};

/**
 * Página que exibe o último relatório gerado por `npm run eval`
 * (tests/eval/report.json) e a evolução entre execuções (tests/eval/history.json).
 * Os arquivos são versionados no repositório e empacotados no build do deploy.
 */
export default function EvalPage() {
  return (
    <PainelEval
      report={report as unknown as EvalReport}
      history={history as unknown as EvalHistoryEntry[]}
    />
  );
}
