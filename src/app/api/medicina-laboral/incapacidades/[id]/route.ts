// ══════════════════════════════════════════════════════════
// GET    /api/medicina-laboral/incapacidades/[id]  — Obtener incapacidad
// PUT    /api/medicina-laboral/incapacidades/[id]  — Actualizar incapacidad
// DELETE /api/medicina-laboral/incapacidades/[id]  — Eliminar incapacidad
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
  actualizarIncapacidad,
  eliminarIncapacidad,
  listarIncapacidades,
} from "@/lib/medicina-laboral/repository";
import {
  TIPOS_INCAPACIDAD,
  type CrearIncapacidadPayload,
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
    const incapacidades = await listarIncapacidades({});
    const incapacidad = incapacidades.find((i) => i.recordId === id);

    if (!incapacidad) {
      return jsonError("Incapacidad no encontrada", 404);
    }
    return jsonOk(incapacidad);
  } catch (e) {
    return errorServidor("obtener la incapacidad", e);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<CrearIncapacidadPayload>;

    // Validar catálogo si viene
    const errTipo = validarCatalogo("tipo", body.tipo, TIPOS_INCAPACIDAD);
    if (errTipo) return jsonError(errTipo);

    // Validar fechas si vienen
    if (body.fechaInicio && !esFechaValida(body.fechaInicio)) {
      return jsonError("Fecha de inicio inválida (formato YYYY-MM-DD)");
    }
    if (body.fechaFin && !esFechaValida(body.fechaFin)) {
      return jsonError("Fecha de fin inválida (formato YYYY-MM-DD)");
    }

    // Validar coherencia de fechas
    if (body.fechaInicio && body.fechaFin) {
      const inicio = new Date(body.fechaInicio);
      const fin = new Date(body.fechaFin);
      if (fin < inicio) {
        return jsonError(
          "La fecha de fin debe ser mayor o igual a la fecha de inicio"
        );
      }
    }

    await actualizarIncapacidad(id, body);

    const incapacidades = await listarIncapacidades({});
    const incapacidadActualizada = incapacidades.find((i) => i.recordId === id);

    return jsonOk(incapacidadActualizada);
  } catch (e) {
    return errorServidor("actualizar la incapacidad", e);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    await eliminarIncapacidad(id);
    return jsonOk({ message: "Incapacidad eliminada correctamente" });
  } catch (e) {
    return errorServidor("eliminar la incapacidad", e);
  }
}
