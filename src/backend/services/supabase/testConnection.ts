import fs from "fs";
import path from "path";
import { getSupabaseServerClient } from "./client";

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

async function testConnection() {
  console.log("=== VERIFICAÇÃO COMPLETA DO BANCO SUPABASE ===");
  try {
    const supabase = getSupabaseServerClient();
    const tables = ["cases", "clarification_questions", "legal_documents", "eval_runs"];

    for (const t of tables) {
      const { count, error } = await supabase
        .from(t)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`❌ Tabela ${t}: ${error.message}`);
      } else {
        console.log(`✅ Tabela ${t}: OK (registros: ${count ?? 0})`);
      }
    }

    // Testa RPC match_legal_documents
    const dummyVector = new Array(384).fill(0.01);
    const { data: rpcData, error: rpcError } = await supabase.rpc("match_legal_documents", {
      query_embedding: dummyVector,
      match_threshold: 0.0,
      match_count: 1,
    });

    if (rpcError) {
      console.log("❌ RPC match_legal_documents:", rpcError.message);
    } else {
      console.log("✅ RPC match_legal_documents funcionando perfeitamente!");
    }

    process.exit(0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Falha fatal:", msg);
    process.exit(1);
  }
}

testConnection();
