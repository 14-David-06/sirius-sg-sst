// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones
// GET - Listar registros | POST - Crear nuevo registro
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";
import { nominaRepository } from "@/infrastructure/repositories/airtableNominaRepository";
import { crearInduccion, crearAlerta } from "@/core/use-cases/inducciones";
import { CrearInduccionDTOSchema } from "@/shared/types/inducciones";
import type { EstadoInduccion } from "@/shared/types/inducciones";

// GET /api/inducciones - Listar todos los registros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") as EstadoInduccion | null;

    const registros = await induccionesRepository.listarRegistros(estado || undefined);

    return NextResponse.json({
      success: true,
      data: registros,
      total: registros.length,
    });
  } catch (error: any) {
    console.error("Error listando inducciones:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al listar inducciones",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/inducciones - Crear nuevo registro
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar DTO
    const dto = CrearInduccionDTOSchema.parse(body);

    // Obtener datos del empleado desde Personal/Nómina
    const empleado = await nominaRepository.obtenerEmpleadoPorId(dto.idEmpleadoCore);

    if (!empleado) {
      return NextResponse.json(
        {
          success: false,
          message: "Empleado no encontrado",
        },
        { status: 404 }
      );
    }

    const datosEmpleado = {
      nombreCompleto: empleado.nombreCompleto,
      numeroDocumento: empleado.numeroDocumento,
      cargo: empleado.cargo,
    };

    // Crear el registro
    const registro = await crearInduccion(dto, datosEmpleado);

    // Crear alerta automáticamente
    try {
      await crearAlerta(registro);
    } catch (alertaError) {
      console.error("Error creando alerta (no crítico):", alertaError);
      // No fallar la creación si falla la alerta
    }

    return NextResponse.json(
      {
        success: true,
        message: "Inducción creada exitosamente",
        data: registro,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creando inducción:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          message: "Datos de entrada inválidos",
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error al crear inducción",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
