// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/alertas
// GET - Listar alertas pendientes
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";

// GET /api/inducciones/alertas
export async function GET(request: NextRequest) {
  try {
    const alertas = await induccionesRepository.listarAlertasPendientes();

    return NextResponse.json({
      success: true,
      data: alertas,
      total: alertas.length,
    });
  } catch (error: any) {
    console.error("Error listando alertas:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al listar alertas",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
