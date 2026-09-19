import { describe, it, expect, vi } from "vitest";
import { GET as listAdminCasesRoute } from "@/app/api/admin/cases/route";
import { NextRequest } from "next/server";

vi.mock("@/backend/services/supabase/client", () => {
  const fakeCases = [
    {
      id: "case-1",
      client_name: "Cliente 1",
      client_email: "c1@exemplo.com",
      client_phone: "11988887777",
      initial_description: "Relato 1",
      status: "ready",
      confidence_score: 0.9,
      created_at: new Date().toISOString(),
    },
    {
      id: "case-2",
      client_name: "Cliente 2",
      client_email: "c2@exemplo.com",
      client_phone: "11988886666",
      initial_description: "Relato 2",
      status: "low_confidence",
      confidence_score: 0.5,
      created_at: new Date().toISOString(),
    },
  ];

  return {
    getSupabaseServerClient: () => ({
      from: () => ({
        select: () => ({
          order: () => ({
            range: async () => ({
              data: fakeCases,
              count: fakeCases.length,
              error: null,
            }),
          }),
        }),
      }),
    }),
  };
});

describe("Integration Tests — Admin Cases API", () => {
  it("GET /api/admin/cases deve retornar a lista de casos e metadados de paginação", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/cases?page=1&limit=10");
    const res = await listAdminCasesRoute(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cases).toBeDefined();
    expect(Array.isArray(json.cases)).toBe(true);
    expect(json.total).toBe(2);
    expect(json.page).toBe(1);
  });
});
