import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AirtableCampanaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableCampanaRepository";

// ─── Schemas de validación ───

const crearCampanaSchema = z.object({
  nombre: z.string().min(5, "El nombre debe tener al menos 5 caracteres"),
  periodo: z.enum(["Semestre_1", "Semestre_2"]),
  año: z.number().int().min(2024).max(2100),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (formato: YYYY-MM-DD)"),
  creadoPor: z.string().min(1, "Usuario creador requerido"),
});

const campanasRepo = new AirtableCampanaRepository();

/**
 * GET /api/socio/campanas
 * Listar todas las campañas
 */
export async function GET() {
  try {
    // tokensGenerados y respuestasCompletadas ya vienen calculados
    // desde los back-links de cada registro (sin queries adicionales)
    const campanas = await campanasRepo.listar();

    return NextResponse.json({
      success: true,
      data: campanas,
    });
  } catch (error: unknown) {
    console.error("[GET /api/socio/campanas] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al listar campañas",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/socio/campanas
 * Crear nueva campaña
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos
    const validacion = crearCampanaSchema.safeParse(body);
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Datos inválidos",
          detalles: validacion.error.issues,
        },
        { status: 400 }
      );
    }

    const { nombre, periodo, año, fechaInicio, creadoPor } = validacion.data;

    // Crear campaña
    const campana = await campanasRepo.crear({
      nombre,
      periodo,
      año,
      fechaInicio: new Date(fechaInicio),
      creadoPor,
    });

    return NextResponse.json({
      success: true,
      data: campana,
    });
  } catch (error: unknown) {
    console.error("[POST /api/socio/campanas] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al crear campaña",
      },
      { status: 500 }
    );
  }
}
