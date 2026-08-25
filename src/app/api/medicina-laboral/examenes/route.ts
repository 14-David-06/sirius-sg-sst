// ══════════════════════════════════════════════════════════
// GET  /api/medicina-laboral/examenes  — Listar exámenes médicos
// POST /api/medicina-laboral/examenes  — Crear examen médico
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
import { crearExamen, listarExamenes } from "@/lib/medicina-laboral/repository";
import {
  CONCEPTOS_APTITUD,
  ESTADOS_EXAMEN,
  TIPOS_EXAMEN,
  type CrearExamenPayload,
  type FiltrosExamenes,
} from "@/lib/medicina-laboral/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const sp = request.nextUrl.searchParams;
    const filtros: FiltrosExamenes = { desde, hasta };

    const tipoExamen = sp.get("tipoExamen");
    const errTipo = validarCatalogo("tipoExamen", tipoExamen, TIPOS_EXAMEN);
    if (errTipo) return jsonError(errTipo);
    if (tipoExamen) filtros.tipoExamen = tipoExamen as FiltrosExamenes["tipoExamen"];

    const estado = sp.get("estado");
    const errEstado = validarCatalogo("estado", estado, ESTADOS_EXAMEN);
    if (errEstado) return jsonError(errEstado);
    if (estado) filtros.estado = estado as FiltrosExamenes["estado"];

    const idEmpleadoCore = sp.get("idEmpleadoCore");
    if (idEmpleadoCore) filtros.idEmpleadoCore = idEmpleadoCore;

    const examenes = await listarExamenes(filtros);
    return jsonOk(examenes);
  } catch (e) {
    return errorServidor("listar los exámenes médicos", e);
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = (await request.json()) as CrearExamenPayload;

    // ── Obligatorios ──────────────────────────────────────
    if (!body.idEmpleadoCore || !body.nombreEmpleado) {
      return jsonError("Debe seleccionar el trabajador");
    }
    if (!body.numeroDocumento || !body.cargo) {
      return jsonError("Número de documento y cargo son obligatorios");
    }
    if (!esFechaValida(body.fechaExamen)) {
      return jsonError("La fecha del examen es obligatoria (formato YYYY-MM-DD)");
    }

    // ── Catálogos ─────────────────────────────────────────
    const validaciones = [
      validarCatalogo("tipoExamen", body.tipoExamen, TIPOS_EXAMEN, true),
      validarCatalogo("estado", body.estado, ESTADOS_EXAMEN),
      validarCatalogo("conceptoAptitud", body.conceptoAptitud, CONCEPTOS_APTITUD),
    ];

    for (const err of validaciones) {
      if (err) return jsonError(err);
    }

    // ── Validar fecha programada ─────────────────────────
    if (body.fechaProgramada && !esFechaValida(body.fechaProgramada)) {
      return jsonError("Fecha programada inválida (formato YYYY-MM-DD)");
    }

    const examen = await crearExamen(body);
    return jsonOk(examen);
  } catch (e) {
    return errorServidor("crear el examen médico", e);
  }
}
