// ══════════════════════════════════════════════════════════
// PUT    /api/accidentes/investigaciones/[id] — Actualizar investigación
// DELETE /api/accidentes/investigaciones/[id] — Soft-delete
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
  actualizarInvestigacion,
  desactivarInvestigacion,
} from "@/lib/accidentes/repository";
import {
  ESTADOS_INVESTIGACION,
  METODOLOGIAS,
  type ActualizarInvestigacionPayload,
} from "@/lib/accidentes/types";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await params;
    const body = (await request.json()) as ActualizarInvestigacionPayload;

    const validaciones = [
      validarCatalogo("metodologia", body.metodologia, METODOLOGIAS),
      validarCatalogo("estado", body.estado, ESTADOS_INVESTIGACION),
    ].filter(Boolean);
    if (validaciones.length > 0) return jsonError(validaciones[0]!);

    for (const [etiqueta, valor] of [
      ["fechaInvestigacion", body.fechaInvestigacion],
      ["fechaEnvioARL", body.fechaEnvioARL],
    ] as const) {
      if (valor && !esFechaValida(valor)) {
        return jsonError(`${etiqueta} debe tener formato YYYY-MM-DD`);
      }
    }

    const investigacion = await actualizarInvestigacion(id, body);
    return jsonOk(investigacion);
  } catch (e) {
    return errorServidor("actualizar la investigación", e);
  }
}

export async function DELETE(request: NextRequest, { params }: Contexto) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await params;
    await desactivarInvestigacion(id);
    return jsonOk({ recordId: id, activo: false });
  } catch (e) {
    return errorServidor("desactivar la investigación", e);
  }
}
