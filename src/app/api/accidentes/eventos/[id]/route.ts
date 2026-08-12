// ══════════════════════════════════════════════════════════
// GET    /api/accidentes/eventos/[id] — Detalle con investigación y acciones
// PUT    /api/accidentes/eventos/[id] — Actualizar evento
// DELETE /api/accidentes/eventos/[id] — Soft-delete
// [id] es el recordId de Airtable
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
import {
  actualizarEvento,
  desactivarEvento,
  listarAcciones,
  obtenerEvento,
  obtenerInvestigacionPorEvento,
} from "@/lib/accidentes/repository";
import {
  ESTADOS_ARL,
  ESTADOS_EVENTO,
  MECANISMOS,
  PARTES_CUERPO,
  TIPOS_EVENTO,
  TIPOS_LESION,
  type ActualizarEventoPayload,
} from "@/lib/accidentes/types";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await params;
    const evento = await obtenerEvento(id);
    const investigacion = await obtenerInvestigacionPorEvento(id);
    // Las acciones pueden colgar del evento o de su investigación.
    const acciones = await listarAcciones({ eventoRecordId: id });
    const accionesInvestigacion = investigacion
      ? await listarAcciones({ investigacionRecordId: investigacion.recordId })
      : [];
    const mapa = new Map(
      [...acciones, ...accionesInvestigacion].map((a) => [a.recordId, a])
    );

    return jsonOk({
      evento,
      investigacion,
      acciones: [...mapa.values()].sort((a, b) =>
        (a.fechaEjecucion ?? "").localeCompare(b.fechaEjecucion ?? "")
      ),
    });
  } catch (e) {
    return errorServidor("obtener el evento", e);
  }
}

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await params;
    const body = (await request.json()) as ActualizarEventoPayload;

    const validaciones = [
      validarCatalogo("tipoEvento", body.tipoEvento, TIPOS_EVENTO),
      validarCatalogo("mecanismo", body.mecanismo, MECANISMOS),
      validarCatalogo("tipoLesion", body.tipoLesion, TIPOS_LESION),
      validarCatalogo("estadoARL", body.estadoARL, ESTADOS_ARL),
      validarCatalogo("estado", body.estado, ESTADOS_EVENTO),
    ].filter(Boolean);
    if (validaciones.length > 0) return jsonError(validaciones[0]!);

    if (body.parteCuerpo !== undefined) {
      if (!Array.isArray(body.parteCuerpo)) {
        return jsonError("parteCuerpo debe ser una lista");
      }
      for (const parte of body.parteCuerpo) {
        const err = validarCatalogo("parteCuerpo", parte, PARTES_CUERPO);
        if (err) return jsonError(err);
      }
    }

    for (const [etiqueta, valor] of [
      ["fechaEvento", body.fechaEvento],
      ["fechaInicioIncapacidad", body.fechaInicioIncapacidad],
      ["fechaFinIncapacidad", body.fechaFinIncapacidad],
      ["fechaReporteARL", body.fechaReporteARL],
    ] as const) {
      if (valor && !esFechaValida(valor)) {
        return jsonError(`${etiqueta} debe tener formato YYYY-MM-DD`);
      }
    }
    if (body.diasIncapacidad !== undefined) {
      if (!Number.isInteger(body.diasIncapacidad) || body.diasIncapacidad < 0) {
        return jsonError("Los días de incapacidad deben ser un entero no negativo");
      }
    }
    if (body.mortal && body.grave === undefined) body.grave = true;

    const evento = await actualizarEvento(id, body);
    return jsonOk(evento);
  } catch (e) {
    return errorServidor("actualizar el evento", e);
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await params;
    await desactivarEvento(id);
    return jsonOk({ recordId: id, activo: false });
  } catch (e) {
    return errorServidor("desactivar el evento", e);
  }
}
