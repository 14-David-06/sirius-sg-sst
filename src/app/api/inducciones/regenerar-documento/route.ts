// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/regenerar-documento
// POST - Regenerar documento unificado con firma automática del responsable SST
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { regenerarDocumentoConFirmaResponsable } from "@/core/use-cases/inducciones/generarDocumentoUnificado";
import { obtenerFirmaResponsableSst } from "@/lib/firmaStorage";

// POST /api/inducciones/regenerar-documento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idInduccion } = body;

    if (!idInduccion) {
      return NextResponse.json(
        { success: false, message: "ID de inducción requerido" },
        { status: 400 }
      );
    }

    // Obtener firma del responsable SST (desde S3 o fallback a env)
    const firmaResponsableSSTDataUrl = await obtenerFirmaResponsableSst();

    if (!firmaResponsableSSTDataUrl) {
      return NextResponse.json(
        { success: false, message: "No se encontró la firma del responsable SST en la configuración" },
        { status: 500 }
      );
    }

    // Regenerar documento con la firma automática
    const { documentoUrl, registro } = await regenerarDocumentoConFirmaResponsable(
      idInduccion,
      firmaResponsableSSTDataUrl
    );

    return NextResponse.json({
      success: true,
      message: "Documento regenerado exitosamente con firma del responsable SST",
      data: {
        documentoUrl,
        registro,
      },
    });
  } catch (error: any) {
    console.error("[regenerar-documento] Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Error al regenerar documento",
      },
      { status: 500 }
    );
  }
}
