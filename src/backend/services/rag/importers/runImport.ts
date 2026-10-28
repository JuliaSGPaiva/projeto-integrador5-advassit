import fs from "fs";
import path from "path";
import { getSupabaseServerClient } from "../../supabase/client";
import { generateEmbedding } from "../embeddings";
import { SEED_LEGAL_DOCUMENTS } from "../seedData";
import {
  chunkLawByArticle,
  fetchLawFromGitHub,
  parseFrontmatter,
  LawArticleChunk,
} from "./leisImporter";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

/**
 * Artigos da CLT de maior relevância prática para triagem trabalhista inicial
 * (relação de emprego, vínculo, PJ, terceirização, jornada, horas extras, rescisão, FGTS, justa causa, rescisão indireta).
 */
const PRIORITY_CLT_ARTICLES = new Set([
  "1", "2", "3", "4", "7", "8", "9",
  "11", "29", "47",
  "58", "59", "59-A", "59-B", "61", "66", "71",
  "130", "134", "137",
  "442", "442-B", "443", "444", "448", "456-A", "457", "458", "461",
  "468", "477", "477-A", "479", "482", "483", "484", "487",
  "791-A", "818"
]);

export async function runImport(): Promise<void> {
  console.log("\n=======================================================");
  console.log("   ADVASSIST — INGESTÃO DE LEIS (ctresb/leis -> RAG)  ");
  console.log("=======================================================\n");

  const supabase = getSupabaseServerClient();
  const allDocsToIngest: Array<{ source: string; content: string }> = [];

  // 1. Ingestão das Súmulas e jurisprudência consolidada
  console.log("[1/3] Preparando Súmulas consolidadas...");
  for (const doc of SEED_LEGAL_DOCUMENTS) {
    allDocsToIngest.push({
      source: doc.source,
      content: doc.content,
    });
  }
  console.log(`✓ ${SEED_LEGAL_DOCUMENTS.length} súmulas/normas adicionadas.`);

  // 2. Download e fatiamento da CLT do repositório ctresb/leis
  console.log("\n[2/3] Baixando a CLT oficial do ctresb/leis...");
  try {
    const cltMarkdown = await fetchLawFromGitHub(
      "federal/decretos-lei/1943/del-5452-1943-05-01.md"
    );
    const { frontmatter, body } = parseFrontmatter(cltMarkdown);
    console.log(`✓ CLT baixada com sucesso (${body.length} caracteres).`);

    const cltChunks = chunkLawByArticle(body, "CLT", frontmatter.titulo || "Consolidação das Leis do Trabalho");
    console.log(`✓ ${cltChunks.length} artigos extraídos da CLT.`);

    // Filtra artigos de alta prioridade trabalhista
    let cltAdded = 0;
    for (const chunk of cltChunks) {
      // Normaliza para comparação (ex: "3º" -> "3", "59" -> "59")
      const numClean = chunk.articleNumber.replace(/[ºoª]/g, "");
      if (PRIORITY_CLT_ARTICLES.has(numClean) || PRIORITY_CLT_ARTICLES.has(chunk.articleNumber)) {
        allDocsToIngest.push({
          source: chunk.source,
          content: `${chunk.lawTitle} - ${chunk.content}`,
        });
        cltAdded++;
      }
    }
    console.log(`✓ ${cltAdded} artigos estratégicos da CLT selecionados para o índice vetorial.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Aviso] Falha ao baixar CLT remota: ${msg}. Mantendo acervo local.`);
  }

  // 3. Download e fatiamento da Constituição Federal (Artigo 7º dos Direitos dos Trabalhadores)
  console.log("\n[3/3] Baixando a Constituição Federal de 1988 do ctresb/leis...");
  try {
    const cfMarkdown = await fetchLawFromGitHub("constituicao.md");
    const { body } = parseFrontmatter(cfMarkdown);
    const cfChunks = chunkLawByArticle(body, "CF/88", "Constituição da República Federativa do Brasil de 1988");
    console.log(`✓ ${cfChunks.length} artigos extraídos da CF/88.`);

    const art7 = cfChunks.find((c) => c.articleNumber === "7º" || c.articleNumber === "7");
    if (art7) {
      allDocsToIngest.push({
        source: "CF/88 Art. 7º",
        content: `Constituição Federal de 1988 - Direitos dos trabalhadores urbanos e rurais: ${art7.content}`,
      });
      console.log("✓ Art. 7º da CF/88 (Direitos Trabalhistas) adicionado ao índice.");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Aviso] Falha ao baixar CF remota: ${msg}. Mantendo acervo local.`);
  }

  // 4. Ingestão e Vetorização no Supabase
  console.log(`\nIniciando geração de embeddings e inserção no Supabase (${allDocsToIngest.length} normas)...`);
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < allDocsToIngest.length; i++) {
    const doc = allDocsToIngest[i];
    process.stdout.write(`[${i + 1}/${allDocsToIngest.length}] Processando: ${doc.source}... `);

    try {
      const embedding = await generateEmbedding(`${doc.source}: ${doc.content}`);

      // Verifica se o documento já existe
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

        if (updateError) throw updateError;
        updated++;
        console.log("✓ Atualizado");
      } else {
        const { error: insertError } = await supabase
          .from("legal_documents")
          .insert({
            source: doc.source,
            content: doc.content,
            embedding,
          });

        if (insertError) throw insertError;
        inserted++;
        console.log("✓ Inserido");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors++;
      console.log(`❌ Erro: ${msg}`);
    }

    // Pequena pausa para evitar rate limit de APIs de embedding
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  console.log("\n=======================================================");
  console.log(`INGESTÃO FINALIZADA: ${inserted} inseridos, ${updated} atualizados, ${errors} erros.`);
  console.log("=======================================================\n");
}

if (require.main === module) {
  runImport()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Falha crítica no runImport:", err);
      process.exit(1);
    });
}
