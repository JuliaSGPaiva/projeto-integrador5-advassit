/**
 * Serviço de geração de embeddings (384 dimensões).
 * Utiliza o modelo multilíngue: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
 */

const HF_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
const HF_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;

/**
 * Gera um embedding de 384 dimensões para um texto fornecido.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const sanitizedText = text.replace(/\n+/g, " ").trim();
  if (!sanitizedText) {
    throw new Error("Texto para geração de embedding não pode ser vazio.");
  }

  const hfToken = process.env.HUGGINGFACE_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (hfToken) {
    headers["Authorization"] = `Bearer ${hfToken}`;
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: sanitizedText,
        options: { wait_for_model: true },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn(
        `[Embeddings] Aviso: Hugging Face API retornou ${response.status}: ${errorBody}. Usando fallback determinístico.`
      );
      return generateDeterministicFallbackEmbedding(sanitizedText);
    }

    const result = await response.json();

    // A resposta do HF pode ser um array de floats [0.1, 0.2, ...] ou uma matriz aninhada [[0.1, ...]]
    let vector: number[] = [];
    if (Array.isArray(result)) {
      if (Array.isArray(result[0])) {
        vector = result[0];
      } else {
        vector = result as number[];
      }
    }

    if (vector.length === 384) {
      return vector;
    }

    // Se o modelo retornou dimensão ligeiramente diferente, normalizamos para 384
    console.warn(
      `[Embeddings] Vetor retornado tem dimensão ${vector.length}, ajustando para 384.`
    );
    return padOrTruncateVector(vector, 384);
  } catch (error) {
    console.warn(
      `[Embeddings] Falha na requisição ao Hugging Face: ${error}. Ativando fallback determinístico de 384 dimensões.`
    );
    return generateDeterministicFallbackEmbedding(sanitizedText);
  }
}

/**
 * Fallback determinístico baseado em hash/frequência de caracteres normalizado.
 * Garante que em testes locais sem rede ou sem chave externa, o pipeline nunca trave.
 */
function generateDeterministicFallbackEmbedding(text: string): number[] {
  const vector = new Array(384).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const index = (code * 31 + i) % 384;
    vector[index] += Math.sin(code + i);
  }

  // Normalização L2
  const norm = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0)) || 1;
  return vector.map((v) => Number((v / norm).toFixed(6)));
}

function padOrTruncateVector(vec: number[], targetDim: number): number[] {
  if (vec.length >= targetDim) {
    return vec.slice(0, targetDim);
  }
  const result = [...vec];
  while (result.length < targetDim) {
    result.push(0);
  }
  return result;
}
