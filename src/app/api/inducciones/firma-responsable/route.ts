// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/firma-responsable
// POST - Firma del responsable SST (restringida por cédula) y regeneración PDF
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { encryptAES } from "@/lib/firmaCrypto";
import {
  regenerarDocumentoConFirmaResponsable,
} from "@/core/use-cases/inducciones/generarDocumentoUnificado";
import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";

interface BodyPayload {
  idInduccion?: string;
  firmaDataUrl?: string;
  numeroDocumentoSesion?: string;
}

// POST /api/inducciones/firma-responsable
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BodyPayload;
    const { idInduccion, firmaDataUrl, numeroDocumentoSesion } = body;

    if (!idInduccion || !firmaDataUrl || !numeroDocumentoSesion) {
      return NextResponse.json(
        { success: false, message: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    if (!firmaDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, message: "Formato de firma inválido" },
        { status: 400 }
      );
    }

    const cedulaResponsableSST = process.env.IND_RESPONSABLE_SST_CEDULA;
    if (!cedulaResponsableSST) {
      return NextResponse.json(
        { success: false, message: "No está configurada la cédula del responsable SST" },
        { status: 500 }
      );
    }

    const normalizar = (v: string) => v.replace(/\D/g, "");

    if (normalizar(numeroDocumentoSesion) !== normalizar(cedulaResponsableSST)) {
      return NextResponse.json(
        { success: false, message: "No autorizado para firmar como Responsable SST" },
        { status: 403 }
      );
    }

    const registro = await induccionesRepository.obtenerRegistroPorIdInduccion(idInduccion);
    if (!registro || !registro.id) {
      return NextResponse.json(
        { success: false, message: "Inducción no encontrada" },
        { status: 404 }
      );
    }

    const firmaPayload = JSON.stringify({
      signature: firmaDataUrl,
      induccion: registro.idInduccion,
      nombreResponsable: registro.responsableSST,
      numeroDocumentoResponsable: numeroDocumentoSesion,
      timestamp: new Date().toISOString(),
      source: "dashboard-responsable-sst",
    });

    const firmaResponsableSST = encryptAES(firmaPayload);

    // Guardar firma cifrada del responsable SST
    await induccionesRepository.actualizarRegistro(registro.id, {
      firmaResponsableSST,
    });

    // Regenerar documento unificado incluyendo firma responsable
    const { documentoUrl, registro: registroActualizado } = await regenerarDocumentoConFirmaResponsable(
      idInduccion,
      firmaDataUrl
    );

    return NextResponse.json({
      success: true,
      message: "Firma del responsable SST registrada y documento actualizado",
      data: {
        certificadoUrl: documentoUrl,
        registro: registroActualizado,
      },
    });
  } catch (error: any) {
    console.error("Error en firma-responsable:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Error al procesar firma del responsable SST",
      },
      { status: 500 }
    );
  }
}
