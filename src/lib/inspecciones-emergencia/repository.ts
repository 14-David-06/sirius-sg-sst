// ══════════════════════════════════════════════════════════
// Repositorio Airtable — Inspecciones de equipos de emergencia
// Opera sobre cualquiera de los cuatro tipos según su config.
// ══════════════════════════════════════════════════════════
import {
  getSGSSTHeaders,
  getSGSSTUrl,
} from "@/infrastructure/config/airtableSGSST";
import { getConfigInspeccion, type ConfigInspeccion } from "./config";
import type {
  CrearInspeccionPayload,
  DetalleCriteriosPayload,
  DetalleElementoPayload,
  ElementoCatalogo,
  FiltrosInspecciones,
  InspeccionResumen,
  ItemCatalogo,
  TipoInspeccion,
} from "./types";

// ── Helpers HTTP ───────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

async function airtableFetch<T = AirtableResponse>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...getSGSSTHeaders(), ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function escapeFormula(v: string): string {
  return v.replace(/'/g, "\\'");
}

function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function textoONulo(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Elimina claves vacías o con el literal "undefined", que aparecen cuando una
 * variable de entorno no está definida y se usa como clave computada.
 * Airtable rechaza el request completo si recibe un campo desconocido.
 */
function limpiarCampos(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!k || k.trim() === "" || k === "undefined") continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

function sufijoAleatorio(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function generarIdInspeccion(prefijo: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${prefijo}-${y}${m}${d}-${sufijoAleatorio()}`;
}

/**
 * Airtable acepta como máximo 10 registros por request de creación.
 * Los detalles de una inspección superan ese límite con frecuencia.
 */
async function crearEnLotes(
  tableId: string,
  registros: Array<{ fields: Record<string, unknown> }>
): Promise<string[]> {
  const ids: string[] = [];
  const url = getSGSSTUrl(tableId);

  for (let i = 0; i < registros.length; i += 10) {
    const lote = registros.slice(i, i + 10);
    const data = await airtableFetch(url, {
      method: "POST",
      body: JSON.stringify({
        records: lote,
        returnFieldsByFieldId: true,
        typecast: false,
      }),
    });
    ids.push(...data.records.map((r) => r.id));
  }

  return ids;
}

// ══════════════════════════════════════════════════════════
// Catálogos
// ══════════════════════════════════════════════════════════

/** Lista los equipos activos del catálogo del tipo indicado. */
export async function listarEquipos(
  tipo: TipoInspeccion
): Promise<ItemCatalogo[]> {
  const cfg = getConfigInspeccion(tipo);
  const F = cfg.equiposFields;

  const params = new URLSearchParams({
    filterByFormula: `{${F.ESTADO}} = 'Activo'`,
    returnFieldsByFieldId: "true",
    pageSize: "100",
    "sort[0][field]": F.CODIGO,
    "sort[0][direction]": "asc",
  });

  const data = await airtableFetch(
    `${getSGSSTUrl(cfg.equiposTableId)}?${params}`
  );

  return data.records.map((r) => ({
    recordId: r.id,
    codigo: texto(r.fields[F.CODIGO]),
    nombre: texto(r.fields[F.NOMBRE]),
    ubicacion: F.UBICACION ? textoONulo(r.fields[F.UBICACION]) : null,
  }));
}

/**
 * Lista los elementos activos del catálogo del tipo indicado.
 * Devuelve `[]` para extintor, que verifica criterios en vez de elementos.
 */
export async function listarElementos(
  tipo: TipoInspeccion
): Promise<ElementoCatalogo[]> {
  const cfg = getConfigInspeccion(tipo);
  if (!cfg.elementosTableId || !cfg.elementosFields) return [];

  const F = cfg.elementosFields;
  const params = new URLSearchParams({
    filterByFormula: `{${F.ESTADO}} = 'Activo'`,
    returnFieldsByFieldId: "true",
    pageSize: "100",
    "sort[0][field]": F.NOMBRE,
    "sort[0][direction]": "asc",
  });

  const data = await airtableFetch(
    `${getSGSSTUrl(cfg.elementosTableId)}?${params}`
  );

  return data.records.map((r) => ({
    recordId: r.id,
    codigo: texto(r.fields[F.CODIGO]),
    nombre: texto(r.fields[F.NOMBRE]),
    unidad: F.UNIDAD ? textoONulo(r.fields[F.UNIDAD]) : null,
    requiereVencimiento: F.REQUIERE_VENCIMIENTO
      ? Boolean(r.fields[F.REQUIERE_VENCIMIENTO])
      : false,
  }));
}

// ══════════════════════════════════════════════════════════
// Inspecciones
// ══════════════════════════════════════════════════════════

export async function listarInspecciones(
  tipo: TipoInspeccion,
  filtros: FiltrosInspecciones = {}
): Promise<InspeccionResumen[]> {
  const cfg = getConfigInspeccion(tipo);
  const F = cfg.cabeceraFields;

  const predicados: string[] = [];
  if (filtros.desde) {
    predicados.push(`{${F.FECHA}} >= '${escapeFormula(filtros.desde)}'`);
  }
  if (filtros.hasta) {
    predicados.push(`{${F.FECHA}} <= '${escapeFormula(filtros.hasta)}'`);
  }
  if (filtros.estado) {
    predicados.push(`{${F.ESTADO}} = '${escapeFormula(filtros.estado)}'`);
  }

  const params = new URLSearchParams({
    returnFieldsByFieldId: "true",
    pageSize: "100",
    "sort[0][field]": F.FECHA,
    "sort[0][direction]": "desc",
  });
  if (predicados.length > 0) {
    params.set("filterByFormula", `AND(${predicados.join(", ")})`);
  }

  const data = await airtableFetch(
    `${getSGSSTUrl(cfg.cabeceraTableId)}?${params}`
  );

  return data.records.map((r) => ({
    recordId: r.id,
    idInspeccion: texto(r.fields[F.ID]),
    tipo,
    fecha: texto(r.fields[F.FECHA]),
    inspector: texto(r.fields[F.INSPECTOR]),
    cargoInspector: textoONulo(r.fields[F.CARGO_INSPECTOR]),
    estado: texto(r.fields[F.ESTADO]),
    observaciones: textoONulo(r.fields[F.OBSERVACIONES]),
    urlDocumento: textoONulo(r.fields[F.URL_DOCUMENTO]),
    detallesCount: ((r.fields[F.DETALLE_LINK] as string[]) || []).length,
  }));
}

export async function obtenerInspeccion(
  tipo: TipoInspeccion,
  recordId: string
): Promise<InspeccionResumen | null> {
  const cfg = getConfigInspeccion(tipo);
  const F = cfg.cabeceraFields;

  try {
    const r = await airtableFetch<AirtableRecord>(
      `${getSGSSTUrl(cfg.cabeceraTableId)}/${recordId}?returnFieldsByFieldId=true`
    );
    return {
      recordId: r.id,
      idInspeccion: texto(r.fields[F.ID]),
      tipo,
      fecha: texto(r.fields[F.FECHA]),
      inspector: texto(r.fields[F.INSPECTOR]),
      cargoInspector: textoONulo(r.fields[F.CARGO_INSPECTOR]),
      estado: texto(r.fields[F.ESTADO]),
      observaciones: textoONulo(r.fields[F.OBSERVACIONES]),
      urlDocumento: textoONulo(r.fields[F.URL_DOCUMENTO]),
      detallesCount: ((r.fields[F.DETALLE_LINK] as string[]) || []).length,
    };
  } catch {
    return null;
  }
}

// ── Construcción de detalles ──────────────────────────────

function camposDetalleElemento(
  cfg: ConfigInspeccion,
  idInspeccion: string,
  cabeceraRecordId: string,
  det: DetalleElementoPayload
): Record<string, unknown> {
  const F = cfg.detalleFields;

  const fields: Record<string, unknown> = {
    [F.ID]: `DET-${idInspeccion}-${sufijoAleatorio()}`,
    [F.INSPECCION_LINK]: [cabeceraRecordId],
    [cfg.detalleEquipoLinkField]: [det.equipoRecordId],
    [F.ESTADO_ELEMENTO]: det.estadoElemento,
    [F.CANTIDAD]: det.cantidad,
  };

  if (cfg.detalleElementoLinkField) {
    fields[cfg.detalleElementoLinkField] = [det.elementoRecordId];
  }
  // Camilla no tiene columna de vencimiento; se omite en vez de fallar.
  if (cfg.detalleVencimientoField && det.fechaVencimiento) {
    fields[cfg.detalleVencimientoField] = det.fechaVencimiento;
  }
  if (det.observaciones) {
    fields[F.OBSERVACIONES] = det.observaciones;
  }

  return limpiarCampos(fields);
}

function camposDetalleCriterios(
  cfg: ConfigInspeccion,
  idInspeccion: string,
  cabeceraRecordId: string,
  det: DetalleCriteriosPayload
): Record<string, unknown> {
  const F = cfg.detalleFields;

  const fields: Record<string, unknown> = {
    [F.ID]: `DET-${idInspeccion}-${sufijoAleatorio()}`,
    [F.INSPECCION_LINK]: [cabeceraRecordId],
    [cfg.detalleEquipoLinkField]: [det.equipoRecordId],
  };

  for (const [clave, fieldId] of Object.entries(cfg.criterios || {})) {
    const valor = det.criterios?.[clave];
    if (valor) fields[fieldId] = valor;
  }

  if (det.observaciones) {
    fields[F.OBSERVACIONES] = det.observaciones;
  }

  return limpiarCampos(fields);
}

/**
 * Crea una inspección completa: cabecera, detalles, responsables y —para kit
 * de derrames— las verificaciones de procedimiento.
 *
 * Si falla la creación de detalles o responsables, borra la cabecera para no
 * dejar inspecciones huérfanas que el informe mensual contaría como válidas.
 */
export async function crearInspeccion(
  tipo: TipoInspeccion,
  payload: CrearInspeccionPayload
): Promise<{ recordId: string; idInspeccion: string }> {
  const cfg = getConfigInspeccion(tipo);
  const F = cfg.cabeceraFields;
  const idInspeccion = generarIdInspeccion(cfg.prefijo);

  const cabecera = await airtableFetch<AirtableRecord>(
    getSGSSTUrl(cfg.cabeceraTableId),
    {
      method: "POST",
      body: JSON.stringify({
        fields: limpiarCampos({
          [F.ID]: idInspeccion,
          [F.FECHA]: payload.fechaInspeccion,
          [F.INSPECTOR]: payload.inspector,
          [F.CARGO_INSPECTOR]: payload.cargoInspector,
          [F.ESTADO]: payload.estado || "Borrador",
          [F.OBSERVACIONES]: payload.observacionesGenerales,
        }),
        returnFieldsByFieldId: true,
        typecast: false,
      }),
    }
  );

  const cabeceraRecordId = cabecera.id;

  try {
    // ── Detalles ──────────────────────────────────────────
    const detalles = payload.detalles.map((det) => ({
      fields:
        cfg.forma === "criterios"
          ? camposDetalleCriterios(
              cfg,
              idInspeccion,
              cabeceraRecordId,
              det as DetalleCriteriosPayload
            )
          : camposDetalleElemento(
              cfg,
              idInspeccion,
              cabeceraRecordId,
              det as DetalleElementoPayload
            ),
    }));

    if (detalles.length > 0) {
      await crearEnLotes(cfg.detalleTableId, detalles);
    }

    // ── Responsables ──────────────────────────────────────
    const RF = cfg.responsablesFields;
    const responsables = payload.responsables.map((resp) => ({
      fields: limpiarCampos({
        [RF.ID_FIRMA]: `RESP-${idInspeccion}-${sufijoAleatorio()}`,
        [RF.INSPECCION_LINK]: [cabeceraRecordId],
        [RF.TIPO]: resp.tipo,
        [RF.NOMBRE]: resp.nombre,
        [RF.CARGO]: resp.cargo,
        [RF.FIRMADO]: false,
      }),
    }));

    if (responsables.length > 0) {
      await crearEnLotes(cfg.responsablesTableId, responsables);
    }

    // ── Verificaciones (solo kit de derrames) ─────────────
    if (
      payload.verificaciones &&
      cfg.verificacionesTableId &&
      cfg.verificacionesFields
    ) {
      const VF = cfg.verificacionesFields;
      await crearEnLotes(cfg.verificacionesTableId, [
        {
          fields: limpiarCampos({
            [VF.ID]: `VER-${idInspeccion}-${sufijoAleatorio()}`,
            [VF.INSPECCION_LINK]: [cabeceraRecordId],
            [VF.CONOCE_PROCEDIMIENTO]:
              payload.verificaciones.conoceProcedimiento,
            [VF.ALMACENAMIENTO_ADECUADO]:
              payload.verificaciones.almacenamientoAdecuado,
            [VF.ROTULADO_SENALIZADO]:
              payload.verificaciones.rotuladoSenalizado,
          }),
        },
      ]);
    }
  } catch (error) {
    // Revertir la cabecera para no dejar una inspección vacía.
    try {
      await airtableFetch(
        `${getSGSSTUrl(cfg.cabeceraTableId)}/${cabeceraRecordId}`,
        { method: "DELETE" }
      );
    } catch (errorBorrado) {
      console.error(
        `[inspecciones-emergencia] No se pudo revertir la cabecera ${cabeceraRecordId} de ${cfg.etiqueta}:`,
        errorBorrado
      );
    }
    throw error;
  }

  return { recordId: cabeceraRecordId, idInspeccion };
}

export async function actualizarInspeccion(
  tipo: TipoInspeccion,
  recordId: string,
  cambios: {
    fechaInspeccion?: string;
    inspector?: string;
    cargoInspector?: string;
    observacionesGenerales?: string;
    estado?: string;
  }
): Promise<void> {
  const cfg = getConfigInspeccion(tipo);
  const F = cfg.cabeceraFields;

  const fields = limpiarCampos({
    [F.FECHA]: cambios.fechaInspeccion,
    [F.INSPECTOR]: cambios.inspector,
    [F.CARGO_INSPECTOR]: cambios.cargoInspector,
    [F.OBSERVACIONES]: cambios.observacionesGenerales,
    [F.ESTADO]: cambios.estado,
  });

  await airtableFetch(`${getSGSSTUrl(cfg.cabeceraTableId)}/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false }),
  });
}
