import { getSupabaseServerClient } from "../supabase/client";
import { LegalDocumentRecord } from "../supabase/types";
import { generateEmbedding } from "./embeddings";
import { SEED_LEGAL_DOCUMENTS } from "./seedData";

export interface RetrievedDocument {
  id?: string;
  source: string;
  content: string;
  similarity: number;
}

/**
 * Recupera as normas mais relevantes para a demanda utilizando busca vetorial no Supabase (pgvector).
 */
export async function retrieveRelevantLegalDocuments(
  query: string,
  matchThreshold = 0.2,
  matchCount = 3
): Promise<RetrievedDocument[]> {
  const { docs } = await retrieveRelevantLegalDocumentsDetailed(query, matchThreshold, matchCount);
  return docs;
}

export type RetrievalMode = "vector" | "keyword_fallback" | "empty_query";

export interface RetrievalOutcome {
  docs: RetrievedDocument[];
  /** Caminho efetivamente usado: busca vetorial (pgvector) ou fallback por palavras-chave. */
  mode: RetrievalMode;
  fallbackReason?: string;
}

/**
 * Mesma busca de `retrieveRelevantLegalDocuments`, mas informa qual caminho foi usado.
 * Usado pelo harness de eval para não confundir o fallback local com o RAG real.
 */
export async function retrieveRelevantLegalDocumentsDetailed(
  query: string,
  matchThreshold = 0.2,
  matchCount = 3
): Promise<RetrievalOutcome> {
  if (!query || query.trim().length === 0) {
    return { docs: [], mode: "empty_query" };
  }

  try {
    const queryEmbedding = await generateEmbedding(query);
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase.rpc("match_legal_documents", {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.warn(
        `[RAG Retrieve] Aviso ao chamar RPC match_legal_documents: ${error.message}. Tentando fallback de texto.`
      );
      return {
        docs: fallbackKeywordRetrieval(query, matchCount),
        mode: "keyword_fallback",
        fallbackReason: `RPC: ${error.message}`,
      };
    }

    if (data && Array.isArray(data) && data.length > 0) {
      return {
        docs: data.map((item: LegalDocumentRecord) => ({
          id: item.id,
          source: item.source,
          content: item.content,
          similarity: item.similarity ?? 1.0,
        })),
        mode: "vector",
      };
    }

    // Se a busca vetorial não encontrou registros suficientes (ex: base vazia)
    return {
      docs: fallbackKeywordRetrieval(query, matchCount),
      mode: "keyword_fallback",
      fallbackReason: "Busca vetorial sem resultados acima do limiar",
    };
  } catch (err) {
    console.warn(`[RAG Retrieve] Exceção na busca vetorial: ${err}. Usando fallback.`);
    return {
      docs: fallbackKeywordRetrieval(query, matchCount),
      mode: "keyword_fallback",
      fallbackReason: String(err),
    };
  }
}

/**
 * Fallback determinístico por palavras-chave com base nas normas locais curadas.
 */
function fallbackKeywordRetrieval(query: string, limit: number): RetrievedDocument[] {
  const lowerQuery = query.toLowerCase();

  const scored = SEED_LEGAL_DOCUMENTS.map((doc) => {
    let score = 0;
    const lowerContent = doc.content.toLowerCase();
    const lowerSource = doc.source.toLowerCase();

    // Palavras-chave de alto valor jurídico
    const keywords = [
      "pj",
      "clt",
      "vínculo",
      "subordinação",
      "salário",
      "horário",
      "hora extra",
      "rescisão",
      "justa causa",
      "fgts",
      "demissão",
      "assédio",
      "terceirização",
      "exclusividade",
    ];

    for (const kw of keywords) {
      if (lowerQuery.includes(kw) && (lowerContent.includes(kw) || lowerSource.includes(kw))) {
        score += 0.2;
      }
    }

    return {
      source: doc.source,
      content: doc.content,
      similarity: Math.min(Number((0.3 + score).toFixed(2)), 0.99),
    };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}
