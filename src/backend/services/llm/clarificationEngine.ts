import { DEFAULT_GROQ_MODEL, getGroqClient } from "./groqClient";
import {
  buildAnalysisPrompt,
  buildSufficiencyPrompt,
  LegalAnalysisResult,
  SufficiencyResult,
} from "./promptTemplates";
import { retrieveRelevantLegalDocuments } from "../rag/retrieve";

/**
 * Avalia se o relato inicial do cliente é suficiente ou necessita de até 3 perguntas de esclarecimento.
 */
export async function evaluateSufficiency(
  initialDescription: string
): Promise<SufficiencyResult> {
  const { systemPrompt, userPrompt } = buildSufficiencyPrompt(initialDescription);

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia retornada pelo modelo de linguagem.");
    }

    const parsed = JSON.parse(content) as SufficiencyResult;
    return {
      is_sufficient: Boolean(parsed.is_sufficient),
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.slice(0, 3).map((q, idx) => ({
            order: idx + 1,
            text: q.text || `Esclarecimento ${idx + 1}`,
          }))
        : [],
    };
  } catch (err) {
    console.warn(`[ClarificationEngine] Aviso ao chamar Groq: ${err}. Utilizando heurística de fallback.`);
    return fallbackSufficiencyHeuristic(initialDescription);
  }
}

/**
 * Heurística de fallback caso a chave da Groq não esteja configurada ou ocorra erro de rede.
 */
export function fallbackSufficiencyHeuristic(initialDescription: string): SufficiencyResult {
  const text = initialDescription.toLowerCase().trim();
  const wordCount = text.split(/\s+/).length;

  // Se o texto for muito curto ou mencionar situações complexas sem detalhes
  const isVaguePj = text.includes("pj") && !text.includes("horário") && !text.includes("ordem");
  const isTooShort = wordCount < 18;

  if (isVaguePj || isTooShort) {
    return {
      is_sufficient: false,
      questions: [
        {
          order: 1,
          text: "Você possuía horário fixo de entrada e saída determinado pela empresa?",
        },
        {
          order: 2,
          text: "Recebia ordens diretas de gestores ou podia delegar suas funções para terceiros?",
        },
        {
          order: 3,
          text: "Trabalhava com exclusividade para esta empresa ou prestava serviços para outros clientes?",
        },
      ],
    };
  }

  return {
    is_sufficient: true,
    questions: [],
  };
}

/**
 * Executa a análise jurídica completa combinando RAG e Groq LLM.
 */
export async function generateLegalAnalysis(
  clientName: string,
  initialDescription: string,
  clarifications: Array<{ question: string; answer: string }> = []
): Promise<LegalAnalysisResult> {
  // 1. Monta a query para o RAG
  const queryParts = [initialDescription];
  for (const c of clarifications) {
    queryParts.push(`Pergunta: ${c.question} Resposta: ${c.answer}`);
  }
  const fullQuery = queryParts.join(" ");

  // 2. Recupera normas relevantes
  const retrievedDocs = await retrieveRelevantLegalDocuments(fullQuery, 0.2, 4);

  // 3. Constrói prompts
  const { systemPrompt, userPrompt } = buildAnalysisPrompt(
    clientName,
    initialDescription,
    clarifications,
    retrievedDocs
  );

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia retornada pelo modelo.");
    }

    const parsed = JSON.parse(content) as LegalAnalysisResult;
    return {
      legal_summary: parsed.legal_summary || "Resumo preliminar gerado.",
      legal_framing: Array.isArray(parsed.legal_framing)
        ? parsed.legal_framing
        : [{ ref: "CLT Art. 3º", trecho: "Aplicação geral das regras celetistas." }],
      next_steps: parsed.next_steps || "Entrar em contato com o trabalhador para coleta de documentos.",
      confidence_score:
        typeof parsed.confidence_score === "number"
          ? Math.max(0, Math.min(1, parsed.confidence_score))
          : 0.85,
    };
  } catch (err) {
    console.warn(`[ClarificationEngine] Falha ao chamar Groq para análise: ${err}. Usando fallback sintético.`);
    return fallbackAnalysisHeuristic(initialDescription, retrievedDocs);
  }
}

function fallbackAnalysisHeuristic(
  initialDescription: string,
  retrievedDocs: Array<{ source: string; content: string }>
): LegalAnalysisResult {
  const text = initialDescription.toLowerCase();
  const framing: Array<{ ref: string; trecho: string }> = [];

  if (text.includes("pj") || text.includes("vínculo")) {
    framing.push({
      ref: "CLT Art. 3º",
      trecho: "Elementos caracterizadores do vínculo de emprego (subordinação e habitualidade).",
    });
  }
  if (text.includes("hora extra") || text.includes("hora")) {
    framing.push({
      ref: "CLT Art. 59",
      trecho: "Adicional legal de 50% para jornada extraordinária.",
    });
  }
  if (text.includes("rescisão") || text.includes("demissão") || text.includes("fgts")) {
    framing.push({
      ref: "CLT Art. 477",
      trecho: "Prazo de 10 dias para pagamento das verbas rescisórias.",
    });
  }

  if (framing.length === 0 && retrievedDocs.length > 0) {
    framing.push({
      ref: retrievedDocs[0].source,
      trecho: retrievedDocs[0].content.slice(0, 120) + "...",
    });
  }

  return {
    legal_summary: `Caso envolvendo demanda trabalhista relatada: "${initialDescription.slice(0, 200)}...". Requer avaliação probatória da rotina laboral e verificação de haveres rescisórios.`,
    legal_framing: framing,
    next_steps:
      "1. Coleta de comprovantes de pagamento e registros de comunicação.\n2. Cálculo discriminado das verbas pleiteadas.\n3. Elaboração de notificação extrajudicial ou petição inicial.",
    confidence_score: 0.8,
  };
}
