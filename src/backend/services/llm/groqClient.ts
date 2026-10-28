import Groq from "groq-sdk";

import fs from "fs";
import path from "path";

let groqInstance: Groq | null = null;

function ensureEnvLoaded() {
  if (process.env.GROQ_API_KEY) return;
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

export function getGroqClient(): Groq {
  if (groqInstance) {
    return groqInstance;
  }

  ensureEnvLoaded();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chave da Groq ausente. Configure GROQ_API_KEY no arquivo .env.local"
    );
  }

  groqInstance = new Groq({ apiKey });
  return groqInstance;
}

export const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
