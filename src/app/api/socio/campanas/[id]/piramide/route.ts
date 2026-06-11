import { NextRequest, NextResponse } from "next/server";
import { AirtableRespuestaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableRespuestaRepository";

const respuestasRepo = new AirtableRespuestaRepository();

/**
 * GET /api/socio/campanas/:id/piramide
 * Obtener datos para pirámide poblacional
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campanaId } = await params;

    const piramide = await respuestasRepo.obtenerPiramidePoblacional(campanaId);

    return NextResponse.json({
      success: true,
      data: piramide,
    });
  } catch (error: any) {
    console.error("[GET /api/socio/campanas/:id/piramide] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al obtener pirámide poblacional",
      },
      { status: 500 }
    );
  }
}
