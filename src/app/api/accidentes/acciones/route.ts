// ══════════════════════════════════════════════════════════
// GET  /api/accidentes/acciones — Listar acciones preventivas/correctivas
// POST /api/accidentes/acciones — Crear acción
// ══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import {
  errorServidor,
  esFechaValida,
  jsonError,
  jsonOk,
  leerPeriodo,
  validarCatalogo,
  verificarSesion,
} from "@/lib/accidentes/handlers";
import { crearAccion, listarAcciones } from "@/lib/accidentes/repository";
import {
  ESTADOS_ACCION,
  JERARQUIAS_CONTROL,
  TIPOS_ACCION,
  TIPOS_RESPONSABLE,
  type CrearAccionPayload,
  type EstadoAccion,
} from "@/lib/accidentes/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const sp = request.nextUrl.searchParams;
    const estado = sp.get("estado");
    const errEstado = validarCatalogo("estado", estado, ESTADOS_ACCION);
    if (errEstado) return jsonError(errEstado);

    const acciones = await listarAcciones({
      desde,
      hasta,
      eventoRecordId: sp.get("eventoRecordId") ?? undefined,
      investigacionRecordId: sp.get("investigacionRecordId") ?? undefined,
      estado: (estado as EstadoAccion) || undefined,
    });
    return jsonOk(acciones);
  } catch (e) {
    return errorServidor("listar las acciones", e);
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = (await request.json()) as CrearAccionPayload;

    if (!body.descripcion?.trim()) {
      return jsonError("La descripción de la acción es obligatoria");
    }
    if (!body.investigacionRecordId && !body.eventoRecordId) {
      return jsonError(
        "La acción debe estar asociada a una investigación o a un evento"
      );
    }

    const validaciones = [
      validarCatalogo("tipo", body.tipo, TIPOS_ACCION, true),
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

    const accion = await crearAccion(body);
    return jsonOk(accion, 201);
  } catch (e) {
    return errorServidor("crear la acción", e);
  }
}
