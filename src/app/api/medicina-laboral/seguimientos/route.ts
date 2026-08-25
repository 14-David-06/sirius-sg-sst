// ══════════════════════════════════════════════════════════
// GET  /api/medicina-laboral/seguimientos  — Listar seguimientos
// POST /api/medicina-laboral/seguimientos  — Crear seguimiento
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
  crearSeguimiento,
  listarSeguimientos,
} from "@/lib/medicina-laboral/repository";
import {
  TIPOS_SEGUIMIENTO,
  type CrearSeguimientoPayload,
  type FiltrosSeguimientos,
} from "@/lib/medicina-laboral/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const sp = request.nextUrl.searchParams;
    const filtros: FiltrosSeguimientos = { desde, hasta };

    const tipoSeguimiento = sp.get("tipoSeguimiento");
    const errTipo = validarCatalogo(
      "tipoSeguimiento",
      tipoSeguimiento,
      TIPOS_SEGUIMIENTO
    );
    if (errTipo) return jsonError(errTipo);
    if (tipoSeguimiento)
      filtros.tipoSeguimiento =
        tipoSeguimiento as FiltrosSeguimientos["tipoSeguimiento"];

    const idEmpleadoCore = sp.get("idEmpleadoCore");
    if (idEmpleadoCore) filtros.idEmpleadoCore = idEmpleadoCore;

    const seguimientos = await listarSeguimientos(filtros);
    return jsonOk(seguimientos);
  } catch (e) {
    return errorServidor("listar los seguimientos médicos", e);
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = (await request.json()) as CrearSeguimientoPayload;

    // ── Obligatorios ──────────────────────────────────────
    if (!body.idEmpleadoCore || !body.nombreEmpleado) {
      return jsonError("Debe seleccionar el trabajador");
    }
    if (!body.numeroDocumento || !body.cargo) {
      return jsonError("Número de documento y cargo son obligatorios");
    }
    if (!esFechaValida(body.fechaSeguimiento)) {
      return jsonError(
        "La fecha del seguimiento es obligatoria (formato YYYY-MM-DD)"
      );
    }

    // ── Catálogos ─────────────────────────────────────────
    const errTipo = validarCatalogo(
      "tipoSeguimiento",
      body.tipoSeguimiento,
      TIPOS_SEGUIMIENTO,
      true
    );
    if (errTipo) return jsonError(errTipo);

    // ── Validar próxima cita ─────────────────────────────
    if (body.proximaCita && !esFechaValida(body.proximaCita)) {
      return jsonError("Fecha de próxima cita inválida (formato YYYY-MM-DD)");
    }

    const seguimiento = await crearSeguimiento(body);
    return jsonOk(seguimiento);
  } catch (e) {
    return errorServidor("crear el seguimiento médico", e);
  }
}
