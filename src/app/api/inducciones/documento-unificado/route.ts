// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/documento-unificado
// POST - Generar documento unificado (constancia + evaluación + certificado)
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  generarDocumentoUnificado,
  type ConstanciaInput,
  type EvaluacionInput,
} from "@/core/use-cases/inducciones/generarDocumentoUnificado";
import { decryptAES } from "@/lib/firmaCrypto";

// POST /api/inducciones/documento-unificado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { induccionId, constancia, evaluacion, firmaEmpleadoDataUrl } = body as {
      induccionId?: string;
      constancia?: ConstanciaInput;
      evaluacion?: EvaluacionInput | null;
      firmaEmpleadoDataUrl?: string | null;
    };

    if (!induccionId) {
      return NextResponse.json(
        { success: false, message: "ID de inducción requerido" },
        { status: 400 }
      );
    }

    if (!constancia || typeof constancia !== "object") {
      return NextResponse.json(
        { success: false, message: "Datos de constancia requeridos" },
        { status: 400 }
      );
    }

    // Usar firma del responsable SST desde variable de entorno si está disponible
    let firmaResponsableSSTDataUrl: string | null = null;

    if (process.env.IND_FIRMA_RESPONSABLE_SST) {
      try {
        // Descifrar la firma almacenada en el archivo .env
        const decrypted = decryptAES(process.env.IND_FIRMA_RESPONSABLE_SST);
        const firmaData = JSON.parse(decrypted);
        firmaResponsableSSTDataUrl = firmaData.signature || null;
      } catch (error) {
        console.error("[documento-unificado] Error descifrando firma responsable SST:", error);
        // Continuar sin firma si hay error
      }
    }

    const { documentoUrl, registro } = await generarDocumentoUnificado(
      induccionId,
      constancia,
      evaluacion ?? null,
      firmaEmpleadoDataUrl ?? null,
      firmaResponsableSSTDataUrl
    );

    return NextResponse.json({
      success: true,
      message: "Documento unificado generado exitosamente",
      data: { documentoUrl, registro },
    });
  } catch (error: any) {
    console.error("Error generando documento unificado:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al generar documento unificado",
      },
      { status: 500 }
    );
  }
}
