// ══════════════════════════════════════════════════════════
// GET  /api/medicina-laboral/enfermedades-laborales  — Listar enfermedades laborales
// POST /api/medicina-laboral/enfermedades-laborales  — Crear enfermedad laboral
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
  crearEnfermedadLaboral,
  listarEnfermedadesLaborales,
} from "@/lib/medicina-laboral/repository";
import {
  ESTADOS_ENFERMEDAD_LABORAL,
  type CrearEnfermedadLaboralPayload,
  type FiltrosEnfermedadesLaborales,
} from "@/lib/medicina-laboral/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const sp = request.nextUrl.searchParams;
    const filtros: FiltrosEnfermedadesLaborales = { desde, hasta };

    const estado = sp.get("estado");
    const errEstado = validarCatalogo(
      "estado",
      estado,
      ESTADOS_ENFERMEDAD_LABORAL
    );
    if (errEstado) return jsonError(errEstado);
    if (estado)
      filtros.estado = estado as FiltrosEnfermedadesLaborales["estado"];

    const idEmpleadoCore = sp.get("idEmpleadoCore");
    if (idEmpleadoCore) filtros.idEmpleadoCore = idEmpleadoCore;

    const enfermedades = await listarEnfermedadesLaborales(filtros);
    return jsonOk(enfermedades);
  } catch (e) {
    return errorServidor("listar las enfermedades laborales", e);
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = (await request.json()) as CrearEnfermedadLaboralPayload;

    // ── Obligatorios ──────────────────────────────────────
    if (!body.idEmpleadoCore || !body.nombreEmpleado) {
      return jsonError("Debe seleccionar el trabajador");
    }
    if (!body.numeroDocumento || !body.cargo) {
      return jsonError("Número de documento y cargo son obligatorios");
    }
    if (!esFechaValida(body.fechaDiagnostico)) {
      return jsonError(
        "La fecha de diagnóstico es obligatoria (formato YYYY-MM-DD)"
      );
    }

    // ── Catálogos ─────────────────────────────────────────
    const errEstado = validarCatalogo(
      "estado",
      body.estado,
      ESTADOS_ENFERMEDAD_LABORAL
    );
    if (errEstado) return jsonError(errEstado);

    // ── Validar fechas opcionales ────────────────────────
    if (body.fechaInicioSintomas && !esFechaValida(body.fechaInicioSintomas)) {
      return jsonError(
        "Fecha de inicio de síntomas inválida (formato YYYY-MM-DD)"
      );
    }
    if (body.fechaCalificacion && !esFechaValida(body.fechaCalificacion)) {
      return jsonError("Fecha de calificación inválida (formato YYYY-MM-DD)");
    }
    if (
      body.fechaEstructuracion &&
      !esFechaValida(body.fechaEstructuracion)
    ) {
      return jsonError(
        "Fecha de estructuración inválida (formato YYYY-MM-DD)"
      );
    }

    // ── Validar PCL ──────────────────────────────────────
    if (body.pcl !== undefined && (body.pcl < 0 || body.pcl > 100)) {
      return jsonError("El PCL debe estar entre 0 y 100");
    }

    const enfermedad = await crearEnfermedadLaboral(body);
    return jsonOk(enfermedad);
  } catch (e) {
    return errorServidor("crear la enfermedad laboral", e);
  }
}
