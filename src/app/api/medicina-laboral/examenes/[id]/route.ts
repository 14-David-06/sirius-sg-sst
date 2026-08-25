// ══════════════════════════════════════════════════════════
// GET    /api/medicina-laboral/examenes/[id]  — Obtener examen
// PUT    /api/medicina-laboral/examenes/[id]  — Actualizar examen
// DELETE /api/medicina-laboral/examenes/[id]  — Eliminar examen (soft-delete)
// ══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import {
  errorServidor,
  esFechaValida,
  jsonError,
  jsonOk,
  validarCatalogo,
  verificarSesion,
} from "@/lib/medicina-laboral/handlers";
import {
  actualizarExamen,
  eliminarExamen,
  obtenerExamen,
} from "@/lib/medicina-laboral/repository";
import {
  CONCEPTOS_APTITUD,
  ESTADOS_EXAMEN,
  TIPOS_EXAMEN,
  type CrearExamenPayload,
} from "@/lib/medicina-laboral/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    const examen = await obtenerExamen(id);
    if (!examen) {
      return jsonError("Examen médico no encontrado", 404);
    }
    return jsonOk(examen);
  } catch (e) {
    return errorServidor("obtener el examen médico", e);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<CrearExamenPayload>;

    // Validar catálogos si vienen
    const validaciones = [
      validarCatalogo("tipoExamen", body.tipoExamen, TIPOS_EXAMEN),
      validarCatalogo("estado", body.estado, ESTADOS_EXAMEN),
      validarCatalogo("conceptoAptitud", body.conceptoAptitud, CONCEPTOS_APTITUD),
    ];

    for (const err of validaciones) {
      if (err) return jsonError(err);
    }

    // Validar fechas si vienen
    if (body.fechaExamen && !esFechaValida(body.fechaExamen)) {
      return jsonError("Fecha del examen inválida (formato YYYY-MM-DD)");
    }
    if (body.fechaProgramada && !esFechaValida(body.fechaProgramada)) {
      return jsonError("Fecha programada inválida (formato YYYY-MM-DD)");
    }

    await actualizarExamen(id, body);
    const examenActualizado = await obtenerExamen(id);
    return jsonOk(examenActualizado);
  } catch (e) {
    return errorServidor("actualizar el examen médico", e);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    await eliminarExamen(id);
    return jsonOk({ message: "Examen médico eliminado correctamente" });
  } catch (e) {
    return errorServidor("eliminar el examen médico", e);
  }
}
