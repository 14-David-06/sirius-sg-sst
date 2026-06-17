import { NextRequest, NextResponse } from "next/server";
import { AirtableRespuestaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableRespuestaRepository";
import { AirtableCampanaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableCampanaRepository";
import { generarPdfPerfilSociodemografico } from "@/lib/sociodemografico/perfilPdf";

const respuestasRepo = new AirtableRespuestaRepository();
const campanasRepo = new AirtableCampanaRepository();

/**
 * GET /api/socio/campanas/:id/exportar-pdf
 * Genera informe PDF profesional de perfil sociodemográfico (FT-SST-060)
 * Basado en el patrón de diseño de actas COPASST/COCOLAB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campanaId } = await params;

    // Obtener campaña
    const campana = await campanasRepo.obtenerPorId(campanaId);
    if (!campana) {
      return NextResponse.json(
        { success: false, error: "Campaña no encontrada" },
        { status: 404 }
      );
    }

    // Obtener respuestas
    const respuestas = await respuestasRepo.listarPorCampana(campanaId);

    if (respuestas.length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay respuestas para exportar" },
        { status: 400 }
      );
    }

    // Generar PDF profesional usando el generador corporativo
    const pdfBuffer = await generarPdfPerfilSociodemografico({
      campana,
      respuestas,
    });

    // Convertir Buffer a Uint8Array para NextResponse
    const pdfArrayBuffer = Uint8Array.from(pdfBuffer);

    return new NextResponse(pdfArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="FT-SST-060_Perfil_Sociodemografico_${campana.nombre.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/socio/campanas/:id/exportar-pdf] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al generar PDF",
      },
      { status: 500 }
    );
  }
}
