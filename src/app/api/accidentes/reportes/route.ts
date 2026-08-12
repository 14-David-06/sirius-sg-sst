// ══════════════════════════════════════════════════════════
// GET  /api/accidentes/reportes — Casi accidentes, actos y condiciones inseguras
// POST /api/accidentes/reportes — Registrar reporte
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
import { crearReporte, listarReportes } from "@/lib/accidentes/repository";
import {
  ESTADOS_REPORTE,
  NIVELES_RIESGO,
  TIPOS_REPORTE,
  type CrearReportePayload,
  type FiltrosReportes,
} from "@/lib/accidentes/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const sp = request.nextUrl.searchParams;
    const filtros: FiltrosReportes = { desde, hasta };

    const tipo = sp.get("tipo");
    const errTipo = validarCatalogo("tipo", tipo, TIPOS_REPORTE);
    if (errTipo) return jsonError(errTipo);
    if (tipo) filtros.tipo = tipo as FiltrosReportes["tipo"];

    const estado = sp.get("estado");
    const errEstado = validarCatalogo("estado", estado, ESTADOS_REPORTE);
    if (errEstado) return jsonError(errEstado);
    if (estado) filtros.estado = estado as FiltrosReportes["estado"];

    const reportes = await listarReportes(filtros);
    return jsonOk(reportes);
  } catch (e) {
    return errorServidor("listar los reportes", e);
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = (await request.json()) as CrearReportePayload;

    if (!body.descripcion?.trim()) {
      return jsonError("La descripción del reporte es obligatoria");
    }
    if (!esFechaValida(body.fechaReporte)) {
      return jsonError("La fecha del reporte es obligatoria (formato YYYY-MM-DD)");
    }

    const validaciones = [
      validarCatalogo("tipo", body.tipo, TIPOS_REPORTE, true),
      validarCatalogo("nivelRiesgo", body.nivelRiesgo, NIVELES_RIESGO),
      validarCatalogo("estado", body.estado, ESTADOS_REPORTE),
    ].filter(Boolean);
    if (validaciones.length > 0) return jsonError(validaciones[0]!);

    if (body.fechaCierre && !esFechaValida(body.fechaCierre)) {
      return jsonError("fechaCierre debe tener formato YYYY-MM-DD");
    }

    const reporte = await crearReporte(body);
    return jsonOk(reporte, 201);
  } catch (e) {
    return errorServidor("registrar el reporte", e);
  }
}
