import { getSupabaseServerClient } from "./supabase/client";
import { CaseRecord, ClarificationQuestionRecord } from "./supabase/types";
import { CreateCaseInput, ClarifyCaseInput } from "../lib/validation";
import { evaluateSufficiency, generateLegalAnalysis } from "./llm/clarificationEngine";

export interface CreateCaseResponse {
  case_id: string;
  status: string;
  questions?: Array<{
    order: number;
    text: string;
  }>;
}

/**
 * Cria um novo caso trabalhista e avalia necessidade de perguntas extras.
 */
export async function createCaseService(input: CreateCaseInput): Promise<CreateCaseResponse> {
  const supabase = getSupabaseServerClient();

  // 1. Cria o caso inicialmente com status 'processing'
  const { data: newCase, error: insertError } = await supabase
    .from("cases")
    .insert({
      client_name: input.client_name,
      client_email: input.client_email,
      client_phone: input.client_phone,
      initial_description: input.initial_description,
      status: "processing",
    })
    .select("id")
    .single();

  if (insertError || !newCase) {
    throw new Error(`Falha ao registrar caso no banco de dados: ${insertError?.message}`);
  }

  const caseId = newCase.id;

  // 2. Avalia suficiência do relato
  const sufficiency = await evaluateSufficiency(input.initial_description);

  if (!sufficiency.is_sufficient && sufficiency.questions.length > 0) {
    // Insere as perguntas geradas
    const questionsToInsert = sufficiency.questions.map((q) => ({
      case_id: caseId,
      question_order: q.order,
      question_text: q.text,
    }));

    const { error: questionsError } = await supabase
      .from("clarification_questions")
      .insert(questionsToInsert);

    if (questionsError) {
      console.error("[CasesService] Erro ao salvar perguntas de esclarecimento:", questionsError);
    }

    // Atualiza status do caso para 'pending_clarification'
    await supabase
      .from("cases")
      .update({
        status: "pending_clarification",
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    return {
      case_id: caseId,
      status: "pending_clarification",
      questions: sufficiency.questions,
    };
  }

  // 3. Se o relato já é suficiente, executa a análise completa diretamente
  const analysis = await generateLegalAnalysis(
    input.client_name,
    input.initial_description,
    []
  );

  const finalStatus = analysis.confidence_score < 0.65 ? "low_confidence" : "ready";

  const framingData = {
    articles: analysis.legal_framing,
    action_type: analysis.action_type,
    claimable_rights: analysis.claimable_rights,
    penalties_and_fines: analysis.penalties_and_fines,
    steps: analysis.structured_steps,
  };

  await supabase
    .from("cases")
    .update({
      status: finalStatus,
      legal_summary: analysis.legal_summary,
      legal_framing: framingData,
      next_steps: analysis.next_steps,
      confidence_score: analysis.confidence_score,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  return {
    case_id: caseId,
    status: finalStatus,
  };
}

/**
 * Registra as respostas às perguntas e conclui o enquadramento do caso.
 */
export async function clarifyCaseService(
  caseId: string,
  answers: ClarifyCaseInput["answers"]
): Promise<{ case_id: string; status: string }> {
  const supabase = getSupabaseServerClient();

  // 1. Busca o caso existente
  const { data: existingCase, error: findError } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .single();

  if (findError || !existingCase) {
    throw new Error("Caso não encontrado para esclarecimento.");
  }

  // 2. Atualiza as respostas nas perguntas
  for (const item of answers) {
    await supabase
      .from("clarification_questions")
      .update({
        answer_text: item.text,
        answered_at: new Date().toISOString(),
      })
      .eq("case_id", caseId)
      .eq("question_order", item.order);
  }

  // 3. Carrega todas as perguntas e respostas do caso
  const { data: qData } = await supabase
    .from("clarification_questions")
    .select("question_text, answer_text")
    .eq("case_id", caseId)
    .order("question_order", { ascending: true });

  const clarifications = (qData || []).map((q) => ({
    question: q.question_text,
    answer: q.answer_text || "Não informado",
  }));

  // 4. Executa RAG + Groq LLM com o contexto completo
  const analysis = await generateLegalAnalysis(
    existingCase.client_name,
    existingCase.initial_description,
    clarifications
  );

  const finalStatus = analysis.confidence_score < 0.65 ? "low_confidence" : "ready";

  const framingData = {
    articles: analysis.legal_framing,
    action_type: analysis.action_type,
    claimable_rights: analysis.claimable_rights,
    penalties_and_fines: analysis.penalties_and_fines,
    steps: analysis.structured_steps,
  };

  await supabase
    .from("cases")
    .update({
      status: finalStatus,
      legal_summary: analysis.legal_summary,
      legal_framing: framingData,
      next_steps: analysis.next_steps,
      confidence_score: analysis.confidence_score,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  return {
    case_id: caseId,
    status: finalStatus,
  };
}

/**
 * Obtém o status e perguntas de um caso para a visão do cliente.
 */
export async function getCaseByIdService(caseId: string): Promise<{
  caseItem: CaseRecord;
  questions: ClarificationQuestionRecord[];
}> {
  const supabase = getSupabaseServerClient();

  const { data: caseItem, error: caseError } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .single();

  if (caseError || !caseItem) {
    throw new Error("Caso não localizado.");
  }

  const { data: questions } = await supabase
    .from("clarification_questions")
    .select("*")
    .eq("case_id", caseId)
    .order("question_order", { ascending: true });

  return {
    caseItem: caseItem as CaseRecord,
    questions: (questions || []) as ClarificationQuestionRecord[],
  };
}

/**
 * Lista casos para o painel do advogado com filtros e paginação.
 */
export async function listAdminCasesService(
  statusFilter?: string,
  page = 1,
  limit = 20
): Promise<{ cases: CaseRecord[]; total: number; page: number; totalPages: number }> {
  const supabase = getSupabaseServerClient();

  let query = supabase.from("cases").select("*", { count: "exact" });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const offset = (page - 1) * limit;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Erro ao listar casos: ${error.message}`);
  }

  const total = count ?? 0;
  return {
    cases: (data || []) as CaseRecord[],
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
