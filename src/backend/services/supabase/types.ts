export type CaseStatus =
  | "pending_clarification"
  | "processing"
  | "ready"
  | "low_confidence";

export interface LegalFramingItem {
  ref: string;
  trecho: string;
}

export interface CaseRecord {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  initial_description: string;
  status: CaseStatus;
  legal_summary: string | null;
  legal_framing: LegalFramingItem[] | null;
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
