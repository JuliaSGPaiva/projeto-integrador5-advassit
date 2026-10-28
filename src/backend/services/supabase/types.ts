export type CaseStatus =
  | "pending_clarification"
  | "processing"
  | "ready"
  | "low_confidence";

export interface LegalFramingItem {
  ref: string;
  trecho: string;
}

export interface ClaimableRightItem {
  nome: string;
  descricao: string;
  base_legal: string;
}

export interface PenaltyItem {
  multa: string;
  motivo: string;
  valor: string;
}

export interface StructuredStepItem {
  fase: string;
  titulo: string;
  descricao: string;
  prioridade: "Alta" | "Média" | "Baixa";
}

export interface DetailedDiagnostic {
  articles: LegalFramingItem[];
  action_type: string;
  claimable_rights: ClaimableRightItem[];
  penalties_and_fines: PenaltyItem[];
  steps?: StructuredStepItem[];
}

export type LegalFramingData = LegalFramingItem[] | DetailedDiagnostic;

export interface CaseRecord {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  initial_description: string;
  status: CaseStatus;
  legal_summary: string | null;
  legal_framing: LegalFramingData | null;
  next_steps: string | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ClarificationQuestionRecord {
  id: string;
  case_id: string;
  question_order: number;
  question_text: string;
  answer_text: string | null;
  answered_at: string | null;
}

export interface LegalDocumentRecord {
  id: string;
  source: string;
  content: string;
  embedding?: number[];
  similarity?: number;
}

export interface EvalRunRecord {
  id: string;
  run_at: string;
  total_cases: number;
  avg_relevance: number;
  hallucination_rate: number;
  robustness_score: number;
  clarification_effectiveness: number;
  raw_results: unknown;
}
