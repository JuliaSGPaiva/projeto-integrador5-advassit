/**
 * Carrega o .env.local antes de qualquer outro módulo (importado primeiro pelo runEval),
 * para que GROQ_MODEL, chaves do Supabase e do Hugging Face estejam disponíveis.
 */
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}
