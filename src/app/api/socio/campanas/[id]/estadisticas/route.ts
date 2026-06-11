import { NextRequest, NextResponse } from "next/server";
import { AirtableRespuestaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableRespuestaRepository";

const respuestasRepo = new AirtableRespuestaRepository();

/**
 * GET /api/socio/campanas/:id/estadisticas
 * Obtener estadísticas y tabulación de una campaña
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campanaId } = await params;

    const estadisticas = await respuestasRepo.obtenerEstadisticas(campanaId);

    return NextResponse.json({
      success: true,
      data: estadisticas,
    });
  } catch (error: any) {
    console.error("[GET /api/socio/campanas/:id/estadisticas] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al obtener estadísticas",
      },
      { status: 500 }
    );
  }
}
