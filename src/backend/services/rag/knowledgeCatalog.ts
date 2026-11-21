import { SEED_LEGAL_DOCUMENTS } from "./seedData";

/**
 * Artigos da CLT de maior relevância prática para triagem trabalhista inicial
 * (relação de emprego, vínculo, PJ, terceirização, jornada, horas extras, rescisão, FGTS, justa causa, rescisão indireta).
 * Fonte única usada pela ingestão (runImport) e pelo harness de eval (verificação de alucinação).
 */
export const PRIORITY_CLT_ARTICLES = new Set([
  "1", "2", "3", "4", "7", "8", "9",
  "11", "29", "47",
  "58", "59", "59-A", "59-B", "61", "66", "71",
  "130", "134", "137",
  "442", "442-B", "443", "444", "448", "456-A", "457", "458", "461",
  "468", "477", "477-A", "479", "482", "483", "484", "487",
  "791-A", "818",
]);

/** Outras normas ingeridas além da CLT e das súmulas (ver runImport.ts). */
export const EXTRA_INGESTED_SOURCES = ["CF/88 Art. 7º"];

/**
 * Lista de rótulos ("source") de todas as normas que existem na base do RAG.
 */
export function listKnowledgeBaseSources(): string[] {
  const clt = [...PRIORITY_CLT_ARTICLES].map((n) => `CLT Art. ${n}`);
  const seed = SEED_LEGAL_DOCUMENTS.map((d) => d.source);
  return [...new Set([...seed, ...clt, ...EXTRA_INGESTED_SOURCES])];
}
