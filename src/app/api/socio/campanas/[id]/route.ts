import { NextRequest, NextResponse } from "next/server";
import { AirtableCampanaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableCampanaRepository";

const campanasRepo = new AirtableCampanaRepository();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const campana = await campanasRepo.obtenerPorId(id);

    if (!campana) {
      return NextResponse.json({ success: false, error: "Campaña no encontrada" }, { status: 404 });
    }

    // tokensGenerados y respuestasCompletadas ya vienen en la entidad (back-links)
    return NextResponse.json({
      success: true,
      data: campana,
    });
  } catch (error: unknown) {
    console.error("[GET /api/socio/campanas/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error al obtener campaña" },
      { status: 500 }
    );
  }
}
