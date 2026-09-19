import Groq from "groq-sdk";

let groqInstance: Groq | null = null;

export function getGroqClient(): Groq {
  if (groqInstance) {
    return groqInstance;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chave da Groq ausente. Configure GROQ_API_KEY no arquivo .env.local"
    );
  }

  groqInstance = new Groq({ apiKey });
  return groqInstance;
}

export const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
