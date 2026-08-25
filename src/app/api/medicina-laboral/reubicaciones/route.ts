// ══════════════════════════════════════════════════════════
// GET  /api/medicina-laboral/reubicaciones  — Listar reubicaciones
// POST /api/medicina-laboral/reubicaciones  — Crear reubicación
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
} from "@/lib/medicina-laboral/handlers";
import {
  crearReubicacion,
  listarReubicaciones,
} from "@/lib/medicina-laboral/repository";
import {
  ESTADOS_REUBICACION,
  TIPOS_REUBICACION,
  type CrearReubicacionPayload,
  type FiltrosReubicaciones,
} from "@/lib/medicina-laboral/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const sp = request.nextUrl.searchParams;
    const filtros: FiltrosReubicaciones = { desde, hasta };

    const tipo = sp.get("tipo");
    const errTipo = validarCatalogo("tipo", tipo, TIPOS_REUBICACION);
    if (errTipo) return jsonError(errTipo);
    if (tipo) filtros.tipo = tipo as FiltrosReubicaciones["tipo"];

    const estado = sp.get("estado");
    const errEstado = validarCatalogo("estado", estado, ESTADOS_REUBICACION);
    if (errEstado) return jsonError(errEstado);
    if (estado) filtros.estado = estado as FiltrosReubicaciones["estado"];

    const idEmpleadoCore = sp.get("idEmpleadoCore");
    if (idEmpleadoCore) filtros.idEmpleadoCore = idEmpleadoCore;

    const reubicaciones = await listarReubicaciones(filtros);
    return jsonOk(reubicaciones);
  } catch (e) {
    return errorServidor("listar las reubicaciones", e);
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = (await request.json()) as CrearReubicacionPayload;

    // ── Obligatorios ──────────────────────────────────────
    if (!body.idEmpleadoCore || !body.nombreEmpleado) {
      return jsonError("Debe seleccionar el trabajador");
    }
    if (!body.numeroDocumento) {
      return jsonError("Número de documento es obligatorio");
    }
    if (!body.cargoOrigen || !body.cargoDestino) {
      return jsonError("Cargo origen y cargo destino son obligatorios");
    }
    if (!esFechaValida(body.fechaInicio)) {
      return jsonError(
        "La fecha de inicio es obligatoria (formato YYYY-MM-DD)"
      );
    }

    // ── Catálogos ─────────────────────────────────────────
    const validaciones = [
      validarCatalogo("tipo", body.tipo, TIPOS_REUBICACION, true),
      validarCatalogo("estado", body.estado, ESTADOS_REUBICACION),
    ];

    for (const err of validaciones) {
      if (err) return jsonError(err);
    }

    // ── Validar fecha fin estimada ───────────────────────
    if (body.fechaFinEstimada && !esFechaValida(body.fechaFinEstimada)) {
      return jsonError("Fecha fin estimada inválida (formato YYYY-MM-DD)");
    }

    const reubicacion = await crearReubicacion(body);
    return jsonOk(reubicacion);
  } catch (e) {
    return errorServidor("crear la reubicación", e);
  }
}
