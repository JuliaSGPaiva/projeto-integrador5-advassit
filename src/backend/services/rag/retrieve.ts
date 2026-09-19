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
  if (!query || query.trim().length === 0) {
    return [];
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
      return fallbackKeywordRetrieval(query, matchCount);
    }

    if (data && Array.isArray(data) && data.length > 0) {
      return data.map((item: LegalDocumentRecord) => ({
        id: item.id,
        source: item.source,
        content: item.content,
        similarity: item.similarity ?? 1.0,
      }));
    }

    // Se a busca vetorial não encontrou registros suficientes (ex: base vazia)
    return fallbackKeywordRetrieval(query, matchCount);
  } catch (err) {
    console.warn(`[RAG Retrieve] Exceção na busca vetorial: ${err}. Usando fallback.`);
    return fallbackKeywordRetrieval(query, matchCount);
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
