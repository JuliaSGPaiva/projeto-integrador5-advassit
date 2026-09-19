import { NextRequest, NextResponse } from "next/server";
import { clarifyCaseSchema } from "@/backend/lib/validation";
import { clarifyCaseService } from "@/backend/services/casesService";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const caseId = params.id;

    if (!caseId) {
      return NextResponse.json({ error: "ID do caso não fornecido." }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = clarifyCaseSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Respostas inválidas",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await clarifyCaseService(caseId, parseResult.data.answers);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("[API /api/cases/:id/clarify POST] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro interno ao processar respostas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
