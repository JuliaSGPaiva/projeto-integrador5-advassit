import { NextRequest, NextResponse } from "next/server";
import { getCaseByIdService } from "@/backend/services/casesService";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const caseId = params.id;

    if (!caseId) {
      return NextResponse.json({ error: "ID do caso não fornecido." }, { status: 400 });
    }

    const data = await getCaseByIdService(caseId);
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("[API /api/cases/:id GET] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro ao buscar caso.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
