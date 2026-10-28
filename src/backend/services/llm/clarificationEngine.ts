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

    const parsed = JSON.parse(content) as Partial<LegalAnalysisResult>;

    const legalFraming = Array.isArray(parsed.legal_framing) && parsed.legal_framing.length > 0
      ? parsed.legal_framing
      : [{ ref: "CLT Art. 3º", trecho: "Aplicação geral das regras celetistas e caracterização de vínculo." }];

    return {
      legal_summary: parsed.legal_summary || "Resumo preliminar da triagem fática.",
      action_type:
        parsed.action_type ||
        "Reclamação Trabalhista com Pedido de Reconhecimento de Vínculo Empregatício c/c Verbas Rescisórias e Danos Morais",
      legal_framing: legalFraming,
      claimable_rights: Array.isArray(parsed.claimable_rights) && parsed.claimable_rights.length > 0
        ? parsed.claimable_rights
        : [
            {
              nome: "Reconhecimento de Vínculo e Anotação na CTPS",
              descricao: "Registro formal retroativo em carteira com todas as obrigações e reflexos previdenciários.",
              base_legal: "CLT Art. 29 e Art. 3º",
            },
            {
              nome: "FGTS Integral + Multa Rescisória de 40%",
              descricao: "Depósito obrigatório de 8% mensal de todo o período contratual acrescido da multa de 40%.",
              base_legal: "Lei nº 8.036/1990 e CF/88 Art. 7º, III",
            },
            {
              nome: "Férias Vencidas e Proporcionais + 1/3 Constitucional",
              descricao: "Pagamento das férias não usufruídas com acréscimo de um terço.",
              base_legal: "CLT Art. 129 e CF/88 Art. 7º, XVII",
            },
            {
              nome: "13º Salário (Integrais e Proporcionais)",
              descricao: "Gratificação natalina de todo o contrato de trabalho laborado.",
              base_legal: "Lei nº 4.090/1962",
            },
            {
              nome: "Horas Extras e Adicional de 50%",
              descricao: "Pagamento do excedente da 8ª hora diária e 44ª semanal com reflexos em DSR e rescisão.",
              base_legal: "CLT Art. 59",
            },
            {
              nome: "Indenização por Danos Morais (Pejotização Ilícita)",
              descricao: "Reparação civil pela fraude à legislação e sonegação de direitos de proteção social.",
              base_legal: "CLT Art. 9º, Art. 223-B e CC Art. 186/927",
            },
          ],
      penalties_and_fines: Array.isArray(parsed.penalties_and_fines) && parsed.penalties_and_fines.length > 0
        ? parsed.penalties_and_fines
        : [
            {
              multa: "Multa do Art. 477, § 8º da CLT",
              motivo: "Não quitação das verbas rescisórias dentro do prazo de 10 dias corridos.",
              valor: "Equivalente a 1 salário integral do trabalhador",
            },
            {
              multa: "Multa do Art. 467 da CLT",
              motivo: "Não pagamento das verbas rescisórias incontroversas na primeira audiência trabalhista.",
              valor: "Acréscimo de 50% sobre as verbas rescisórias",
            },
            {
              multa: "Multa Administrativa por Empregado sem Registro (Art. 47 CLT)",
              motivo: "Manutenção de empregado sem a devida anotação em livro ou sistema eletrônico do Ministério do Trabalho.",
              valor: "Até R$ 3.000,00 por trabalhador prejudicado",
            },
          ],
      structured_steps: Array.isArray(parsed.structured_steps) && parsed.structured_steps.length > 0
        ? parsed.structured_steps
        : [
            {
              fase: "1. Fase Pré-Processual (Documentos e Provas)",
              titulo: "Coleta e Blindagem Probatória",
              descricao: "Reunir contratos, notas fiscais, crachá, folhas/registros de ponto, e-mails de cobrança, mensagens de WhatsApp e indicar testemunhas.",
              prioridade: "Alta",
            },
            {
              fase: "2. Cálculos e Notificação Extrajudicial",
              titulo: "Liquidação Prévia de Haveres e Notificação",
              descricao: "Elaborar planilha discriminada de cálculo trabalhista (horas extras, reflexos e multas) e avaliar envio de notificação extrajudicial para acordo.",
              prioridade: "Média",
            },
            {
              fase: "3. Ajuizamento da Reclamação Trabalhista",
              titulo: "Protocolo da Ação Trabalhista",
              descricao: "Ingressar com a petição inicial com pedido de nulidade do contrato PJ (Art. 9º da CLT), reconhecimento de vínculo de emprego e condenação nas verbas e multas.",
              prioridade: "Alta",
            },
          ],
      next_steps: parsed.next_steps || "1. Coleta de provas e holerites. 2. Notificação da empresa. 3. Ajuizamento de Reclamação Trabalhista.",
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
      trecho: "Elementos caracterizadores do vínculo de emprego (subordinação, pessoalidade e habitualidade).",
    });
    framing.push({
      ref: "CLT Art. 9º",
      trecho: "Nulidade de pleno direito dos atos praticados com objetivo de desvirtuar ou fraudar preceitos trabalhistas.",
    });
  }
  if (text.includes("hora extra") || text.includes("hora") || text.includes("ponto")) {
    framing.push({
      ref: "CLT Art. 59",
      trecho: "Adicional legal de 50% para jornada extraordinária e reflexos nos consectários legais.",
    });
  }
  if (text.includes("rescisão") || text.includes("demissão") || text.includes("fgts")) {
    framing.push({
      ref: "CLT Art. 477",
      trecho: "Prazo improrrogável de 10 dias para quitação das verbas rescisórias sob pena de multa de 1 salário.",
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
    action_type: text.includes("pj")
      ? "Reclamação Trabalhista de Reconhecimento de Vínculo Empregatício c/c Cobrança de Verbas Rescisórias e Danos Morais"
      : "Reclamação Trabalhista com Pedido de Rescisão Indireta e Pagamento de Verbas Contratuais",
    legal_framing: framing,
    claimable_rights: [
      {
        nome: "Anotação da CTPS e Reconhecimento de Vínculo",
        descricao: "Regularização de todo o período com recolhimento das contribuições previdenciárias (INSS).",
        base_legal: "CLT Art. 29 e Art. 3º",
      },
      {
        nome: "FGTS Não Depositado + Multa de 40%",
        descricao: "Cobrança retroativa de 8% ao mês sobre a remuneração real mais 40% de indenização compensatória.",
        base_legal: "Lei nº 8.036/1990",
      },
      {
        nome: "Férias Vencidas e Proporcionais + 1/3",
        descricao: "Pagamento dobrado ou simples das férias acrescidas do terço constitucional.",
        base_legal: "CLT Art. 134 e 137",
      },
      {
        nome: "13º Salário Proporcional e Integral",
        descricao: "Pagamento das gratificações natalinas devidas ao longo da relação de trabalho.",
        base_legal: "Lei nº 4.090/1962",
      },
      {
        nome: "Horas Extras com Adicional Mínimo de 50%",
        descricao: "Apuração das horas laboradas além da jornada padrão com reflexos em DSR, férias e 13º.",
        base_legal: "CLT Art. 59",
      },
    ],
    penalties_and_fines: [
      {
        multa: "Multa do Art. 477, § 8º da CLT",
        motivo: "Inobservância do prazo de 10 dias para entrega de guias e quitação rescisória.",
        valor: "Multa no valor de 1 remuneração mensal do trabalhador",
      },
      {
        multa: "Multa do Art. 467 da CLT",
        motivo: "Não pagamento das verbas incontroversas à data do primeiro comparecimento à Justiça do Trabalho.",
        valor: "Penalidade de 50% sobre as verbas rescisórias",
      },
    ],
    structured_steps: [
      {
        fase: "1. Fase Pré-Processual (Documentos e Provas)",
        titulo: "Reunião de Provas de Subordinação e Rotina",
        descricao: "Juntar e-mails com ordens, mensagens de WhatsApp com chefia, registros de ponto, extratos bancários das notas emitidas e lista de testemunhas.",
        prioridade: "Alta",
      },
      {
        fase: "2. Cálculos e Notificação Extrajudicial",
        titulo: "Planilha de Liquidação de Pedidos",
        descricao: "Realizar o cálculo prévio de todas as verbas rescisórias, FGTS com 40%, horas extras e reflexos.",
        prioridade: "Média",
      },
      {
        fase: "3. Ajuizamento da Reclamação Trabalhista",
        titulo: "Distribuição da Petição Inicial",
        descricao: "Ajuizar Reclamação Trabalhista perante a Vara do Trabalho competente com pedido liminar de anotação de CTPS e liberação de guias.",
        prioridade: "Alta",
      },
    ],
    next_steps:
      "1. Coleta de comprovantes de pagamento e registros de comunicação.\n2. Cálculo discriminado das verbas pleiteadas.\n3. Elaboração de notificação extrajudicial ou petição inicial.",
    confidence_score: 0.85,
  };
}
