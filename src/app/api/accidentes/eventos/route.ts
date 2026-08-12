// ══════════════════════════════════════════════════════════
// GET  /api/accidentes/eventos  — Listar accidentes e incidentes
// POST /api/accidentes/eventos  — Registrar un nuevo evento
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
import { crearEvento, listarEventos } from "@/lib/accidentes/repository";
import {
  ESTADOS_ARL,
  ESTADOS_EVENTO,
  MECANISMOS,
  PARTES_CUERPO,
  TIPOS_EVENTO,
  TIPOS_LESION,
  type CrearEventoPayload,
  type FiltrosEventos,
} from "@/lib/accidentes/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const sp = request.nextUrl.searchParams;
    const filtros: FiltrosEventos = { desde, hasta };

    const tipoEvento = sp.get("tipoEvento");
    const errTipo = validarCatalogo("tipoEvento", tipoEvento, TIPOS_EVENTO);
    if (errTipo) return jsonError(errTipo);
    if (tipoEvento) filtros.tipoEvento = tipoEvento as FiltrosEventos["tipoEvento"];

    const estado = sp.get("estado");
    const errEstado = validarCatalogo("estado", estado, ESTADOS_EVENTO);
    if (errEstado) return jsonError(errEstado);
    if (estado) filtros.estado = estado as FiltrosEventos["estado"];

    const idEmpleadoCore = sp.get("idEmpleadoCore");
    if (idEmpleadoCore) filtros.idEmpleadoCore = idEmpleadoCore;

    const eventos = await listarEventos(filtros);
    return jsonOk(eventos);
  } catch (e) {
    return errorServidor("listar los eventos", e);
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = (await request.json()) as CrearEventoPayload;

    // ── Obligatorios ──────────────────────────────────────
    if (!body.idEmpleadoCore || !body.nombreEmpleado) {
      return jsonError("Debe seleccionar el trabajador involucrado");
    }
    if (!body.descripcion?.trim()) {
      return jsonError("La descripción del evento es obligatoria");
    }
    if (!esFechaValida(body.fechaEvento)) {
      return jsonError("La fecha del evento es obligatoria (formato YYYY-MM-DD)");
    }

    // ── Catálogos ─────────────────────────────────────────
    const validaciones = [
      validarCatalogo("tipoEvento", body.tipoEvento, TIPOS_EVENTO, true),
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

    // ── Coherencia de fechas e incapacidad ────────────────
    for (const [etiqueta, valor] of [
      ["fechaInicioIncapacidad", body.fechaInicioIncapacidad],
      ["fechaFinIncapacidad", body.fechaFinIncapacidad],
      ["fechaReporteARL", body.fechaReporteARL],
    ] as const) {
      if (valor && !esFechaValida(valor)) {
        return jsonError(`${etiqueta} debe tener formato YYYY-MM-DD`);
      }
    }
    if (
      body.fechaInicioIncapacidad &&
      body.fechaFinIncapacidad &&
      body.fechaInicioIncapacidad > body.fechaFinIncapacidad
    ) {
      return jsonError(
        "La fecha de inicio de incapacidad no puede ser posterior a la de fin"
      );
    }
    if (body.diasIncapacidad !== undefined) {
      if (!Number.isInteger(body.diasIncapacidad) || body.diasIncapacidad < 0) {
        return jsonError("Los días de incapacidad deben ser un entero no negativo");
      }
    }
    // Un accidente mortal es, por definición, un accidente grave.
    if (body.mortal && !body.grave) body.grave = true;

    const evento = await crearEvento(body);
    return jsonOk(evento, 201);
  } catch (e) {
    return errorServidor("registrar el evento", e);
  }
}
