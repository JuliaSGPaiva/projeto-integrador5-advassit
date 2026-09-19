import { NextRequest, NextResponse } from "next/server";
import { listAdminCasesService } from "@/backend/services/casesService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await listAdminCasesService(status, page, limit);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("[API /api/admin/cases GET] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro ao listar casos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
