// ══════════════════════════════════════════════════════════
// PUT    /api/accidentes/acciones/[id] — Actualizar acción
// DELETE /api/accidentes/acciones/[id] — Soft-delete
// ══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import {
  errorServidor,
  esFechaValida,
  jsonError,
  jsonOk,
  validarCatalogo,
  verificarSesion,
} from "@/lib/accidentes/handlers";
import { actualizarAccion, desactivarAccion } from "@/lib/accidentes/repository";
import {
  ESTADOS_ACCION,
  JERARQUIAS_CONTROL,
  TIPOS_ACCION,
  TIPOS_RESPONSABLE,
  type ActualizarAccionPayload,
} from "@/lib/accidentes/types";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await params;
    const body = (await request.json()) as ActualizarAccionPayload;

    const validaciones = [
      validarCatalogo("tipo", body.tipo, TIPOS_ACCION),
      validarCatalogo("jerarquiaControl", body.jerarquiaControl, JERARQUIAS_CONTROL),
      validarCatalogo("responsableTipo", body.responsableTipo, TIPOS_RESPONSABLE),
      validarCatalogo("estado", body.estado, ESTADOS_ACCION),
    ].filter(Boolean);
    if (validaciones.length > 0) return jsonError(validaciones[0]!);

    for (const [etiqueta, valor] of [
      ["fechaEjecucion", body.fechaEjecucion],
      ["fechaCierre", body.fechaCierre],
    ] as const) {
      if (valor && !esFechaValida(valor)) {
        return jsonError(`${etiqueta} debe tener formato YYYY-MM-DD`);
      }
    }

    // Cerrar una acción exige registrar la fecha de cierre.
    if (body.estado === "Cerrada" && body.fechaCierre === undefined) {
      return jsonError("Para cerrar una acción debe indicar la fecha de cierre");
    }

    const accion = await actualizarAccion(id, body);
    return jsonOk(accion);
  } catch (e) {
    return errorServidor("actualizar la acción", e);
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await params;
    await desactivarAccion(id);
    return jsonOk({ recordId: id, activo: false });
  } catch (e) {
    return errorServidor("desactivar la acción", e);
  }
}
