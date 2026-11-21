/**
 * Recalcula o resumo (summary) de report.json e history.json a partir dos casos já avaliados,
 * sem chamar a IA de novo. Use quando uma fórmula de consolidação em metrics.ts for corrigida.
 *   npx tsx tests/eval/resummarize.ts
 */
import fs from "fs";
import path from "path";
import { summarize, EvalCaseResult } from "./metrics";

const reportPath = path.resolve(__dirname, "report.json");
const historyPath = path.resolve(__dirname, "history.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
report.summary = summarize(report.cases as EvalCaseResult[]);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

const history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
const last = history.find((h: { timestamp: string }) => h.timestamp === report.timestamp);
if (last) last.summary = report.summary;
fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), "utf-8");
console.log("Resumo recalculado:", { adversarial_pass_rate: report.summary.adversarial_pass_rate });
