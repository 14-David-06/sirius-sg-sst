// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/dashboard
// GET - Dashboard con semáforo de estado de todos los colaboradores
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { obtenerEstadoColaboradores } from "@/core/use-cases/inducciones";
import { nominaRepository } from "@/infrastructure/repositories/airtableNominaRepository";

// GET /api/inducciones/dashboard
export async function GET(request: NextRequest) {
  try {
    // Obtener colaboradores activos desde la tabla Nómina
    const empleadosNomina = await nominaRepository.listarEmpleadosActivos();

    // Convertir al formato esperado por el use case
    const colaboradores = empleadosNomina.map((emp) => ({
      idEmpleadoCore: emp.idEmpleadoCore,
      nombreCompleto: emp.nombreCompleto,
      numeroDocumento: emp.numeroDocumento,
      cargo: emp.cargo,
    }));

    const estados = await obtenerEstadoColaboradores(colaboradores);

    // Calcular estadísticas
    const stats = {
      total: estados.length,
      alDia: estados.filter((e) => e.estadoSemaforo === "AL_DIA").length,
      porVencer: estados.filter((e) => e.estadoSemaforo === "POR_VENCER").length,
      vencidas: estados.filter((e) => e.estadoSemaforo === "VENCIDA").length,
      sinInduccion: estados.filter((e) => e.estadoSemaforo === "SIN_INDUCCION").length,
      alertasActivas: estados.filter((e) => e.alertaActiva).length,
    };

    return NextResponse.json({
      success: true,
      data: estados,
      stats,
    });
  } catch (error: any) {
    console.error("Error obteniendo dashboard:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener dashboard",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
