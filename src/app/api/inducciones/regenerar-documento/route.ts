// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/regenerar-documento
// POST - Regenerar documento unificado con firma automática del responsable SST
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { regenerarDocumentoConFirmaResponsable } from "@/core/use-cases/inducciones/generarDocumentoUnificado";
import { decryptAES } from "@/lib/firmaCrypto";

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

    // Obtener firma del responsable SST desde variable de entorno
    let firmaResponsableSSTDataUrl: string | null = null;

    if (process.env.IND_FIRMA_RESPONSABLE_SST) {
      try {
        const decrypted = decryptAES(process.env.IND_FIRMA_RESPONSABLE_SST);
        const firmaData = JSON.parse(decrypted);
        firmaResponsableSSTDataUrl = firmaData.signature || null;
      } catch (error) {
        console.error("[regenerar-documento] Error descifrando firma responsable SST:", error);
        return NextResponse.json(
          { success: false, message: "Error descifrando firma del responsable SST" },
          { status: 500 }
        );
      }
    }

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
