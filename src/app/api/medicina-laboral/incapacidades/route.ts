// ══════════════════════════════════════════════════════════
// GET  /api/medicina-laboral/incapacidades  — Listar incapacidades
// POST /api/medicina-laboral/incapacidades  — Crear incapacidad
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
  crearIncapacidad,
  listarIncapacidades,
} from "@/lib/medicina-laboral/repository";
import {
  TIPOS_INCAPACIDAD,
  type CrearIncapacidadPayload,
  type FiltrosIncapacidades,
} from "@/lib/medicina-laboral/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const sp = request.nextUrl.searchParams;
    const filtros: FiltrosIncapacidades = { desde, hasta };

    const tipo = sp.get("tipo");
    const errTipo = validarCatalogo("tipo", tipo, TIPOS_INCAPACIDAD);
    if (errTipo) return jsonError(errTipo);
    if (tipo) filtros.tipo = tipo as FiltrosIncapacidades["tipo"];

    const idEmpleadoCore = sp.get("idEmpleadoCore");
    if (idEmpleadoCore) filtros.idEmpleadoCore = idEmpleadoCore;

    const incapacidades = await listarIncapacidades(filtros);
    return jsonOk(incapacidades);
  } catch (e) {
    return errorServidor("listar las incapacidades", e);
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = (await request.json()) as CrearIncapacidadPayload;

    // ── Obligatorios ──────────────────────────────────────
    if (!body.idEmpleadoCore || !body.nombreEmpleado) {
      return jsonError("Debe seleccionar el trabajador");
    }
    if (!body.numeroDocumento || !body.cargo) {
      return jsonError("Número de documento y cargo son obligatorios");
    }
    if (!esFechaValida(body.fechaInicio)) {
      return jsonError(
        "La fecha de inicio es obligatoria (formato YYYY-MM-DD)"
      );
    }
    if (!esFechaValida(body.fechaFin)) {
      return jsonError("La fecha de fin es obligatoria (formato YYYY-MM-DD)");
    }

    // ── Catálogos ─────────────────────────────────────────
    const errTipo = validarCatalogo("tipo", body.tipo, TIPOS_INCAPACIDAD, true);
    if (errTipo) return jsonError(errTipo);

    // ── Validar que fecha fin >= fecha inicio ────────────
    const inicio = new Date(body.fechaInicio);
    const fin = new Date(body.fechaFin);
    if (fin < inicio) {
      return jsonError(
        "La fecha de fin debe ser mayor o igual a la fecha de inicio"
      );
    }

    const incapacidad = await crearIncapacidad(body);
    return jsonOk(incapacidad);
  } catch (e) {
    return errorServidor("crear la incapacidad", e);
  }
}
