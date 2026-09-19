import { describe, it, expect, vi } from "vitest";
import { POST as createCaseRoute } from "@/app/api/cases/route";
import { NextRequest } from "next/server";

// Mock do Supabase para testes isolados de integração
vi.mock("@/backend/services/supabase/client", () => {
  const fakeCase = {
    id: "11111111-2222-3333-4444-555555555555",
    client_name: "Teste de Integração",
    client_email: "teste@exemplo.com",
    client_phone: "11999998888",
    initial_description: "Trabalho como PJ mas atuo como CLT",
    status: "pending_clarification",
  };

  return {
    getSupabaseServerClient: () => ({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: fakeCase, error: null }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
        select: () => ({
          eq: () => ({
            single: async () => ({ data: fakeCase, error: null }),
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
      rpc: () => Promise.resolve({ data: [], error: null }),
    }),
  };
});

describe("Integration Tests — Cases API", () => {
  it("POST /api/cases com relato vago deve retornar status 201 e pending_clarification com perguntas", async () => {
    const body = {
      client_name: "Roberto Justos",
      client_email: "roberto@exemplo.com",
      client_phone: "11987654321",
      initial_description: "Trabalho como PJ mas atuo como CLT na empresa",
    };

    const req = new NextRequest("http://localhost:3000/api/cases", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const res = await createCaseRoute(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.case_id).toBeDefined();
    expect(json.status).toBe("pending_clarification");
    expect(Array.isArray(json.questions)).toBe(true);
    expect(json.questions.length).toBeGreaterThan(0);
  });

  it("POST /api/cases com payload incompleto deve retornar status 400", async () => {
    const invalidBody = {
      client_name: "A", // muito curto
      client_email: "nao-eh-email",
    };

    const req = new NextRequest("http://localhost:3000/api/cases", {
      method: "POST",
      body: JSON.stringify(invalidBody),
    });

    const res = await createCaseRoute(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("Dados inválidos");
    expect(json.details).toBeDefined();
  });
});
