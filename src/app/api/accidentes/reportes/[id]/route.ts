// ══════════════════════════════════════════════════════════
// PUT    /api/accidentes/reportes/[id] — Actualizar reporte
// DELETE /api/accidentes/reportes/[id] — Soft-delete
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
import { actualizarReporte, desactivarReporte } from "@/lib/accidentes/repository";
import {
  ESTADOS_REPORTE,
  NIVELES_RIESGO,
  TIPOS_REPORTE,
  type ActualizarReportePayload,
} from "@/lib/accidentes/types";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await params;
    const body = (await request.json()) as ActualizarReportePayload;

    const validaciones = [
      validarCatalogo("tipo", body.tipo, TIPOS_REPORTE),
      validarCatalogo("nivelRiesgo", body.nivelRiesgo, NIVELES_RIESGO),
      validarCatalogo("estado", body.estado, ESTADOS_REPORTE),
    ].filter(Boolean);
    if (validaciones.length > 0) return jsonError(validaciones[0]!);

    for (const [etiqueta, valor] of [
      ["fechaReporte", body.fechaReporte],
      ["fechaCierre", body.fechaCierre],
    ] as const) {
      if (valor && !esFechaValida(valor)) {
        return jsonError(`${etiqueta} debe tener formato YYYY-MM-DD`);
      }
    }

    if (body.estado === "Cerrado" && body.fechaCierre === undefined) {
      return jsonError("Para cerrar un reporte debe indicar la fecha de cierre");
    }

    const reporte = await actualizarReporte(id, body);
    return jsonOk(reporte);
  } catch (e) {
    return errorServidor("actualizar el reporte", e);
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await params;
    await desactivarReporte(id);
    return jsonOk({ recordId: id, activo: false });
  } catch (e) {
    return errorServidor("desactivar el reporte", e);
  }
}
