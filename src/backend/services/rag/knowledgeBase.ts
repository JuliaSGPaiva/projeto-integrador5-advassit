import { getSupabaseServerClient } from "../supabase/client";
import { generateEmbedding } from "./embeddings";
import { SEED_LEGAL_DOCUMENTS } from "./seedData";

export interface IngestResult {
  total: number;
  inserted: number;
  errors: number;
  details: Array<{ source: string; status: "success" | "error"; message?: string }>;
}

/**
 * Ingesta o acervo de normas jurídicas no Supabase com vetores de 384 dimensões.
 */
export async function seedKnowledgeBase(): Promise<IngestResult> {
  const supabase = getSupabaseServerClient();
  const results: IngestResult = {
    total: SEED_LEGAL_DOCUMENTS.length,
    inserted: 0,
    errors: 0,
    details: [],
  };

  console.log(`[RAG Seed] Iniciando ingestão de ${SEED_LEGAL_DOCUMENTS.length} normas jurídicas...`);

  for (const doc of SEED_LEGAL_DOCUMENTS) {
    try {
      console.log(`[RAG Seed] Gerando embedding para: ${doc.source}...`);
      const embedding = await generateEmbedding(`${doc.source}: ${doc.content}`);

      // Verifica se o documento já existe pelo source
      const { data: existing } = await supabase
        .from("legal_documents")
        .select("id")
        .eq("source", doc.source)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from("legal_documents")
          .update({
            content: doc.content,
            embedding,
          })
          .eq("id", existing.id);

        if (updateError) {
          throw updateError;
        }
        console.log(`[RAG Seed] Atualizado: ${doc.source}`);
      } else {
        const { error: insertError } = await supabase
          .from("legal_documents")
          .insert({
            source: doc.source,
            content: doc.content,
            embedding,
          });

        if (insertError) {
          throw insertError;
        }
        console.log(`[RAG Seed] Inserido: ${doc.source}`);
      }

      results.inserted++;
      results.details.push({ source: doc.source, status: "success" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[RAG Seed] Erro ao processar ${doc.source}:`, errorMessage);
      results.errors++;
      results.details.push({ source: doc.source, status: "error", message: errorMessage });
    }
  }

  console.log(`[RAG Seed] Finalizado: ${results.inserted} processados com sucesso, ${results.errors} erros.`);
  return results;
}

// Execução standalone direta via CLI: tsx src/backend/services/rag/knowledgeBase.ts
if (typeof require !== "undefined" && require.main === module) {
  seedKnowledgeBase()
    .then((res) => {
      console.log("Resultado:", JSON.stringify(res, null, 2));
      process.exit(res.errors > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("Falha crítica no seed:", err);
      process.exit(1);
    });
}
