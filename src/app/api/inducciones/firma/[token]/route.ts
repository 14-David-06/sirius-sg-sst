// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/firma/[token]
// POST - Procesar firma digital (endpoint público sin auth)
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { procesarFirma } from "@/core/use-cases/inducciones";
import { FirmarInduccionDTOSchema } from "@/shared/types/inducciones";

// POST /api/inducciones/firma/[token]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    // Validar DTO
    const dto = FirmarInduccionDTOSchema.parse({
      token,
      firmaDataUrl: body.firmaDataUrl,
    });

    // Procesar la firma
    const registro = await procesarFirma(dto.token, dto.firmaDataUrl);

    return NextResponse.json({
      success: true,
      message: "Firma procesada exitosamente",
      data: registro,
    });
  } catch (error: any) {
    console.error("Error procesando firma:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          message: "Datos de entrada inválidos",
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al procesar firma",
      },
      { status: 500 }
    );
  }
}
