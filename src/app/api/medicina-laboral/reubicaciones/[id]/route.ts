// ══════════════════════════════════════════════════════════
// GET    /api/medicina-laboral/reubicaciones/[id]  — Obtener reubicación
// PUT    /api/medicina-laboral/reubicaciones/[id]  — Actualizar reubicación
// DELETE /api/medicina-laboral/reubicaciones/[id]  — Eliminar reubicación
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
  actualizarReubicacion,
  eliminarReubicacion,
  listarReubicaciones,
} from "@/lib/medicina-laboral/repository";
import {
  ESTADOS_REUBICACION,
  TIPOS_REUBICACION,
  type CrearReubicacionPayload,
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
    const reubicaciones = await listarReubicaciones({});
    const reubicacion = reubicaciones.find((r) => r.recordId === id);

    if (!reubicacion) {
      return jsonError("Reubicación no encontrada", 404);
    }
    return jsonOk(reubicacion);
  } catch (e) {
    return errorServidor("obtener la reubicación", e);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<CrearReubicacionPayload> & {
      fechaCierre?: string;
      rehabilitado?: boolean;
    };

    // Validar catálogos si vienen
    const validaciones = [
      validarCatalogo("tipo", body.tipo, TIPOS_REUBICACION),
      validarCatalogo("estado", body.estado, ESTADOS_REUBICACION),
    ];

    for (const err of validaciones) {
      if (err) return jsonError(err);
    }

    // Validar fechas si vienen
    if (body.fechaInicio && !esFechaValida(body.fechaInicio)) {
      return jsonError("Fecha de inicio inválida (formato YYYY-MM-DD)");
    }
    if (body.fechaFinEstimada && !esFechaValida(body.fechaFinEstimada)) {
      return jsonError("Fecha fin estimada inválida (formato YYYY-MM-DD)");
    }
    if (body.fechaCierre && !esFechaValida(body.fechaCierre)) {
      return jsonError("Fecha de cierre inválida (formato YYYY-MM-DD)");
    }

    await actualizarReubicacion(id, body);

    const reubicaciones = await listarReubicaciones({});
    const reubicacionActualizada = reubicaciones.find((r) => r.recordId === id);

    return jsonOk(reubicacionActualizada);
  } catch (e) {
    return errorServidor("actualizar la reubicación", e);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    await eliminarReubicacion(id);
    return jsonOk({ message: "Reubicación eliminada correctamente" });
  } catch (e) {
    return errorServidor("eliminar la reubicación", e);
  }
}
