// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/token
// POST - Generar token de firma
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { generarTokenFirma } from "@/core/use-cases/inducciones";

// POST /api/inducciones/token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idInduccion, idEmpleadoCore } = body;

    if (!idInduccion || !idEmpleadoCore) {
      return NextResponse.json(
        {
          success: false,
          message: "idInduccion e idEmpleadoCore son requeridos",
        },
        { status: 400 }
      );
    }

    const token = await generarTokenFirma(idInduccion, idEmpleadoCore);

    return NextResponse.json({
      success: true,
      message: "Token generado exitosamente",
      data: token,
    });
  } catch (error: any) {
    console.error("Error generando token:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al generar token",
      },
      { status: 500 }
    );
  }
}
