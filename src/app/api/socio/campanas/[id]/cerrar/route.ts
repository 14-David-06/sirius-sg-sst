import { NextRequest, NextResponse } from "next/server";
import { AirtableCampanaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableCampanaRepository";

const campanasRepo = new AirtableCampanaRepository();

/**
 * POST /api/socio/campanas/:id/cerrar
 * Cierra una campaña activa
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Obtener campaña actual
    const campana = await campanasRepo.obtenerPorId(id);

    if (!campana) {
      return NextResponse.json(
        {
          success: false,
          error: "Campaña no encontrada",
        },
        { status: 404 }
      );
    }

    if (campana.estado === "Cerrada") {
      return NextResponse.json(
        {
          success: false,
          error: "La campaña ya está cerrada",
        },
        { status: 400 }
      );
    }

    // Cerrar campaña
    const campanaActualizada = await campanasRepo.cerrar({
      campanaId: id,
      fechaCierre: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: campanaActualizada,
      mensaje: "Campaña cerrada exitosamente",
    });
  } catch (error: unknown) {
    console.error("[POST /api/socio/campanas/:id/cerrar] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al cerrar campaña",
      },
      { status: 500 }
    );
  }
}
