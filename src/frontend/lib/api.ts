import { CaseRecord, ClarificationQuestionRecord } from "@/backend/services/supabase/types";
import { CreateCaseInput } from "@/backend/lib/validation";
import { CreateCaseResponse } from "@/backend/services/casesService";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error || (data.details ? JSON.stringify(data.details) : "Ocorreu um erro na requisição.");
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Cliente (Área do Trabalhador)
  async createCase(payload: CreateCaseInput): Promise<CreateCaseResponse> {
    return request<CreateCaseResponse>("/api/cases", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCase(caseId: string): Promise<{ caseItem: CaseRecord; questions: ClarificationQuestionRecord[] }> {
    return request<{ caseItem: CaseRecord; questions: ClarificationQuestionRecord[] }>(`/api/cases/${caseId}`);
  },

  async clarifyCase(
    caseId: string,
    answers: Array<{ order: number; text: string }>
  ): Promise<{ case_id: string; status: string }> {
    return request<{ case_id: string; status: string }>(`/api/cases/${caseId}/clarify`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },

  // Advogado (Área Admin)
  async listAdminCases(
    status?: string,
    page = 1,
    limit = 20
  ): Promise<{ cases: CaseRecord[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    params.append("page", String(page));
    params.append("limit", String(limit));

    return request<{ cases: CaseRecord[]; total: number; page: number; totalPages: number }>(
      `/api/admin/cases?${params.toString()}`
    );
  },

  async getAdminCase(
    caseId: string
  ): Promise<{ caseItem: CaseRecord; questions: ClarificationQuestionRecord[] }> {
    return request<{ caseItem: CaseRecord; questions: ClarificationQuestionRecord[] }>(
      `/api/admin/cases/${caseId}`
    );
  },
};
