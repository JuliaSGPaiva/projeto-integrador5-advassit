import { NextRequest, NextResponse } from "next/server";
import { createCaseSchema } from "@/backend/lib/validation";
import { createCaseService } from "@/backend/services/casesService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = createCaseSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await createCaseService(parseResult.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("[API /api/cases POST] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro interno no processamento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
