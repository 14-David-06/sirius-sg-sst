// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/colaborador/[empId]
// GET - Historial de inducciones de un colaborador
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";

// GET /api/inducciones/colaborador/[empId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ empId: string }> }
) {
  try {
    const { empId } = await params;

    const registros = await induccionesRepository.listarPorEmpleado(empId);

    return NextResponse.json({
      success: true,
      data: registros,
      total: registros.length,
    });
  } catch (error: any) {
    console.error("Error obteniendo historial:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener historial",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
