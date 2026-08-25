// ══════════════════════════════════════════════════════════
// Handlers HTTP compartidos — Inspecciones de emergencia
// Un solo par GET/POST sirve a los cuatro tipos.
// ══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authMiddleware";
import { getConfigInspeccion } from "./config";
import {
  crearInspeccion,
  listarElementos,
  listarEquipos,
  listarInspecciones,
} from "./repository";
import {
  ESTADOS_CRITERIO,
  ESTADOS_ELEMENTO,
  ESTADOS_INSPECCION,
  TIPOS_RESPONSABLE,
  type CrearInspeccionPayload,
  type DetalleCriteriosPayload,
  type DetalleElementoPayload,
  type FiltrosInspecciones,
  type TipoInspeccion,
} from "./types";

// ── Respuestas ─────────────────────────────────────────────

function jsonOk(data: unknown): NextResponse {
  return NextResponse.json({ success: true, data });
}

function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, message }, { status });
}

function errorServidor(
  tipo: TipoInspeccion,
  accion: string,
  error: unknown
): NextResponse {
  console.error(`[inspecciones-${tipo}] Error al ${accion}:`, error);
  const message = error instanceof Error ? error.message : `Error al ${accion}`;
  return NextResponse.json({ success: false, message }, { status: 500 });
}

async function verificarSesion(req: NextRequest): Promise<NextResponse | null> {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return auth.response ?? jsonError("No autenticado", 401);
  }
  return null;
}

// ── Validación ─────────────────────────────────────────────

function esFechaValida(fecha: unknown): fecha is string {
  if (typeof fecha !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  return !isNaN(new Date(fecha).getTime());
}

/**
 * Valida el payload completo antes de tocar Airtable, para que un detalle
 * inválido no deje una cabecera a medio crear.
 */
function validarPayload(
  tipo: TipoInspeccion,
  body: CrearInspeccionPayload
): string | null {
  const cfg = getConfigInspeccion(tipo);

  if (!esFechaValida(body.fechaInspeccion)) {
    return "La fecha de inspección es obligatoria (formato YYYY-MM-DD)";
  }
  if (!body.inspector?.trim()) {
    return "El nombre del inspector es obligatorio";
  }
  if (body.estado && !ESTADOS_INSPECCION.includes(body.estado)) {
    return `Estado inválido. Valores permitidos: ${ESTADOS_INSPECCION.join(", ")}`;
  }
  if (!Array.isArray(body.detalles) || body.detalles.length === 0) {
    return "Debe registrar al menos un elemento inspeccionado";
  }
  if (!Array.isArray(body.responsables) || body.responsables.length === 0) {
    return "Debe registrar al menos un responsable";
  }

  for (const [i, resp] of body.responsables.entries()) {
    if (!resp.nombre?.trim()) {
      return `El responsable #${i + 1} no tiene nombre`;
    }
    if (!TIPOS_RESPONSABLE.includes(resp.tipo)) {
      return `Tipo de responsable inválido en #${i + 1}. Valores permitidos: ${TIPOS_RESPONSABLE.join(", ")}`;
    }
  }

  for (const [i, det] of body.detalles.entries()) {
    if (!det.equipoRecordId) {
      return `El detalle #${i + 1} no indica el equipo inspeccionado`;
    }

    if (cfg.forma === "criterios") {
      const d = det as DetalleCriteriosPayload;
      const clavesValidas = Object.keys(cfg.criterios || {});
      for (const [clave, valor] of Object.entries(d.criterios || {})) {
        if (!clavesValidas.includes(clave)) {
          return `Criterio desconocido "${clave}" en el detalle #${i + 1}. Criterios válidos: ${clavesValidas.join(", ")}`;
        }
        if (!ESTADOS_CRITERIO.includes(valor)) {
          return `Valor inválido para "${clave}" en el detalle #${i + 1}. Valores permitidos: ${ESTADOS_CRITERIO.join(", ")}`;
        }
      }
    } else {
      const d = det as DetalleElementoPayload;
      if (!d.elementoRecordId) {
        return `El detalle #${i + 1} no indica el elemento verificado`;
      }
      if (!ESTADOS_ELEMENTO.includes(d.estadoElemento)) {
        return `Estado inválido en el detalle #${i + 1}. Valores permitidos: ${ESTADOS_ELEMENTO.join(", ")}`;
      }
      if (typeof d.cantidad !== "number" || d.cantidad < 0) {
        return `La cantidad del detalle #${i + 1} debe ser un número mayor o igual a cero`;
      }
      if (d.fechaVencimiento && !esFechaValida(d.fechaVencimiento)) {
        return `Fecha de vencimiento inválida en el detalle #${i + 1} (formato YYYY-MM-DD)`;
      }
    }
  }

  return null;
}

// ══════════════════════════════════════════════════════════
// Handlers
// ══════════════════════════════════════════════════════════

/**
 * GET — Lista inspecciones del tipo.
 * Con `?catalogo=equipos` o `?catalogo=elementos` devuelve el catálogo
 * correspondiente para poblar el formulario.
 */
export async function handleListar(
  tipo: TipoInspeccion,
  request: NextRequest
): Promise<NextResponse> {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const sp = request.nextUrl.searchParams;
    const catalogo = sp.get("catalogo");

    if (catalogo === "equipos") {
      return jsonOk(await listarEquipos(tipo));
    }
    if (catalogo === "elementos") {
      return jsonOk(await listarElementos(tipo));
    }
    if (catalogo) {
      return jsonError("Catálogo inválido. Use 'equipos' o 'elementos'");
    }

    const filtros: FiltrosInspecciones = {};
    const desde = sp.get("desde");
    const hasta = sp.get("hasta");
    const estado = sp.get("estado");

    if (desde) {
      if (!esFechaValida(desde)) return jsonError("Fecha 'desde' inválida");
      filtros.desde = desde;
    }
    if (hasta) {
      if (!esFechaValida(hasta)) return jsonError("Fecha 'hasta' inválida");
      filtros.hasta = hasta;
    }
    if (estado) filtros.estado = estado;

    return jsonOk(await listarInspecciones(tipo, filtros));
  } catch (e) {
    return errorServidor(tipo, "listar las inspecciones", e);
  }
}

/** POST — Crea una inspección completa del tipo. */
export async function handleCrear(
  tipo: TipoInspeccion,
  request: NextRequest
): Promise<NextResponse> {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = (await request.json()) as CrearInspeccionPayload;

    const error = validarPayload(tipo, body);
    if (error) return jsonError(error);

    const resultado = await crearInspeccion(tipo, body);
    return jsonOk(resultado);
  } catch (e) {
    return errorServidor(tipo, "crear la inspección", e);
  }
}
