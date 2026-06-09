// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/[id]
// GET - Obtener por ID | PATCH - Actualizar
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";
import { ActualizarInduccionDTOSchema } from "@/shared/types/inducciones";

// GET /api/inducciones/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Si el ID tiene formato IND-XXXX, buscar por ID_Induccion
    if (id.startsWith("IND-")) {
      const registro = await induccionesRepository.obtenerRegistroPorIdInduccion(id);

      if (!registro) {
        return NextResponse.json(
          {
            success: false,
            message: "Inducción no encontrada",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: registro,
      });
    }

    // Si no, buscar por Record ID de Airtable
    const registro = await induccionesRepository.obtenerRegistroPorId(id);

    if (!registro) {
      return NextResponse.json(
        {
          success: false,
          message: "Inducción no encontrada",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: registro,
    });
  } catch (error: any) {
    console.error("Error obteniendo inducción:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener inducción",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH /api/inducciones/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar DTO
    const dto = ActualizarInduccionDTOSchema.parse(body);

    // Actualizar (siempre usar Record ID de Airtable)
    const registro = await induccionesRepository.actualizarRegistro(id, dto);

    return NextResponse.json({
      success: true,
      message: "Inducción actualizada exitosamente",
      data: registro,
    });
  } catch (error: any) {
    console.error("Error actualizando inducción:", error);

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
        message: "Error al actualizar inducción",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
