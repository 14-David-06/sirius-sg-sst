// ══════════════════════════════════════════════════════════
// GET  /api/accidentes/investigaciones — Listar (filtro por evento o periodo)
// POST /api/accidentes/investigaciones — Abrir investigación de un evento
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
import {
  crearInvestigacion,
  listarInvestigaciones,
  obtenerInvestigacionPorEvento,
} from "@/lib/accidentes/repository";
import {
  ESTADOS_INVESTIGACION,
  METODOLOGIAS,
  type CrearInvestigacionPayload,
} from "@/lib/accidentes/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const eventoRecordId =
      request.nextUrl.searchParams.get("eventoRecordId") ?? undefined;

    const investigaciones = await listarInvestigaciones({
      desde,
      hasta,
      eventoRecordId,
    });
    return jsonOk(investigaciones);
  } catch (e) {
    return errorServidor("listar las investigaciones", e);
  }
}

export async function POST(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = (await request.json()) as CrearInvestigacionPayload;

    if (!body.eventoRecordId) {
      return jsonError("Debe indicar el evento que se está investigando");
    }

    const existente = await obtenerInvestigacionPorEvento(body.eventoRecordId);
    if (existente) {
      return jsonError(
        `El evento ya tiene la investigación ${existente.idInvestigacion} asociada`,
        409
      );
    }

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

    const investigacion = await crearInvestigacion(body);
    return jsonOk(investigacion, 201);
  } catch (e) {
    return errorServidor("crear la investigación", e);
  }
}
