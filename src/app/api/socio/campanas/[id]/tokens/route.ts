import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AirtableTokenRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableTokenRepository";

const generarTokensSchema = z.object({
  personalIds: z.array(z.string()).min(1, "Debe seleccionar al menos un colaborador"),
});

const tokensRepo = new AirtableTokenRepository();

/**
 * POST /api/socio/campanas/:id/tokens
 * Generar tokens para colaboradores
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campanaId } = await params;
    const body = await request.json();

    // Validar datos
    const validacion = generarTokensSchema.safeParse(body);
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Datos inválidos",
          detalles: validacion.error.issues,
        },
        { status: 400 }
      );
    }

    const { personalIds } = validacion.data;

    // Generar tokens
    const tokens = await tokensRepo.generar(campanaId, personalIds);

    // Construir URLs completas
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const tokensConUrl = tokens.map((t) => ({
      ...t,
      link: `${baseUrl}${t.link}`,
    }));

    return NextResponse.json({
      success: true,
      data: tokensConUrl,
      message: `${tokens.length} token(es) generado(s)`,
    });
  } catch (error: any) {
    console.error("[POST /api/socio/campanas/:id/tokens] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al generar tokens",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/socio/campanas/:id/tokens
 * Listar tokens de una campaña
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campanaId } = await params;

    const tokens = await tokensRepo.listarPorCampana(campanaId);

    return NextResponse.json({
      success: true,
      data: tokens,
    });
  } catch (error: any) {
    console.error("[GET /api/socio/campanas/:id/tokens] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al listar tokens",
      },
      { status: 500 }
    );
  }
}
