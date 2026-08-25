// ══════════════════════════════════════════════════════════
// GET    /api/medicina-laboral/seguimientos/[id]  — Obtener seguimiento
// PUT    /api/medicina-laboral/seguimientos/[id]  — Actualizar seguimiento
// DELETE /api/medicina-laboral/seguimientos/[id]  — Eliminar seguimiento
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
  actualizarSeguimiento,
  eliminarSeguimiento,
  listarSeguimientos,
} from "@/lib/medicina-laboral/repository";
import {
  TIPOS_SEGUIMIENTO,
  type CrearSeguimientoPayload,
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
    // Buscar por recordId (no hay función obtenerSeguimiento, usamos filtro)
    const seguimientos = await listarSeguimientos({});
    const seguimiento = seguimientos.find((s) => s.recordId === id);

    if (!seguimiento) {
      return jsonError("Seguimiento médico no encontrado", 404);
    }
    return jsonOk(seguimiento);
  } catch (e) {
    return errorServidor("obtener el seguimiento médico", e);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<CrearSeguimientoPayload>;

    // Validar catálogo si viene
    const errTipo = validarCatalogo(
      "tipoSeguimiento",
      body.tipoSeguimiento,
      TIPOS_SEGUIMIENTO
    );
    if (errTipo) return jsonError(errTipo);

    // Validar fechas si vienen
    if (body.fechaSeguimiento && !esFechaValida(body.fechaSeguimiento)) {
      return jsonError("Fecha del seguimiento inválida (formato YYYY-MM-DD)");
    }
    if (body.proximaCita && !esFechaValida(body.proximaCita)) {
      return jsonError("Fecha de próxima cita inválida (formato YYYY-MM-DD)");
    }

    await actualizarSeguimiento(id, body);

    // Obtener actualizado
    const seguimientos = await listarSeguimientos({});
    const seguimientoActualizado = seguimientos.find((s) => s.recordId === id);

    return jsonOk(seguimientoActualizado);
  } catch (e) {
    return errorServidor("actualizar el seguimiento médico", e);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    await eliminarSeguimiento(id);
    return jsonOk({ message: "Seguimiento médico eliminado correctamente" });
  } catch (e) {
    return errorServidor("eliminar el seguimiento médico", e);
  }
}
