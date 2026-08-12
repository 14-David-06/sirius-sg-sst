// ══════════════════════════════════════════════════════════
// Repositorio Airtable — Incidentes y Accidentes de Trabajo
// Tablas: at_eventos, at_investigaciones, at_acciones, at_reportes
//
// Convenciones del proyecto:
//   • Campos referenciados por Field ID (variables de entorno)
//   • Lectura con returnFieldsByFieldId=true
//   • Soft-delete mediante el campo Activo
//   • Fechas en zona America/Bogota
// ══════════════════════════════════════════════════════════
import {
  airtableSGSSTConfig,
  getSGSSTHeaders,
  getSGSSTUrl,
} from "@/infrastructure/config/airtableSGSST";
import type {
  AccionAT,
  ActualizarAccionPayload,
  ActualizarEventoPayload,
  ActualizarInvestigacionPayload,
  ActualizarReportePayload,
  CrearAccionPayload,
  CrearEventoPayload,
  CrearInvestigacionPayload,
  CrearReportePayload,
  EstadoARL,
  EstadoAccion,
  EstadoEvento,
  EstadoInvestigacion,
  EstadoReporte,
  EventoAT,
  FilaAccidenteInforme,
  FilaInvestigacionInforme,
  FiltrosEventos,
  FiltrosPeriodo,
  FiltrosReportes,
  IndicadoresAccidentes,
  InvestigacionAT,
  JerarquiaControl,
  Mecanismo,
  Metodologia,
  NivelRiesgo,
  ParteCuerpo,
  ReporteCondicion,
  TipoAccion,
  TipoEvento,
  TipoLesion,
  TipoReporte,
  TipoResponsable,
} from "./types";

// ══════════════════════════════════════════════════════════
// Helpers HTTP
// ══════════════════════════════════════════════════════════
interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}
interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

const EVT = airtableSGSSTConfig.atEventosFields;
const INV = airtableSGSSTConfig.atInvestigacionesFields;
const ACC = airtableSGSSTConfig.atAccionesFields;
const REP = airtableSGSSTConfig.atReportesFields;

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

/**
 * Elimina claves vacías o con el literal "undefined" (ocurre cuando una
 * variable de entorno de Field ID no está configurada). Airtable rechaza
 * cualquier campo con nombre desconocido.
 */
function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k && k.trim() !== "" && k !== "undefined") out[k] = v;
  }
  return out;
}

/** Recorre todas las páginas de una tabla aplicando un filtro opcional. */
async function fetchAll(
  tableId: string,
  filterFormula?: string
): Promise<AirtableRecord[]> {
  const out: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({
      returnFieldsByFieldId: "true",
      pageSize: "100",
    });
    if (filterFormula) params.set("filterByFormula", filterFormula);
    if (offset) params.set("offset", offset);
    const data = await airtableFetch<AirtableResponse>(
      `${getSGSSTUrl(tableId)}?${params.toString()}`
    );
    out.push(...data.records);
    offset = data.offset;
  } while (offset);
  return out;
}

async function createRecord(
  tableId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  const data = await airtableFetch<{ records: AirtableRecord[] }>(
    getSGSSTUrl(tableId),
    {
      method: "POST",
      // typecast queda desactivado a propósito: con typecast Airtable crea en
      // silencio una opción nueva cuando un valor de singleSelect no coincide
      // exactamente (p. ej. por una tilde faltante). Los catálogos ya se
      // validan en la capa de API, así que preferimos que Airtable falle.
      body: JSON.stringify({
        records: [{ fields: cleanFields(fields) }],
        typecast: false,
      }),
    }
  );
  return data.records[0];
}

async function updateRecord(
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  return airtableFetch<AirtableRecord>(
    `${getSGSSTUrl(tableId)}/${recordId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ fields: cleanFields(fields), typecast: false }),
    }
  );
}

async function getRecord(
  tableId: string,
  recordId: string
): Promise<AirtableRecord> {
  return airtableFetch<AirtableRecord>(
    `${getSGSSTUrl(tableId)}/${recordId}?returnFieldsByFieldId=true`
  );
}

// ══════════════════════════════════════════════════════════
// Helpers de fechas y fórmulas
// ══════════════════════════════════════════════════════════

/** Marca de tiempo ISO en zona America/Bogota (para Created_At/Updated_At). */
export function ahoraColombia(): string {
  return new Date().toISOString();
}

/** Año actual en zona America/Bogota. */
function anioColombia(): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
  });
  return parseInt(fmt.format(new Date()), 10);
}

function escapeFormulaValue(v: string): string {
  return v.replace(/'/g, "\\'");
}

/** Condiciones de rango de fechas sobre un campo tipo date. */
function condicionesPeriodo(
  fieldId: string,
  filtros: FiltrosPeriodo
): string[] {
  const cond: string[] = [];
  if (filtros.desde) {
    cond.push(
      `NOT(IS_BEFORE({${fieldId}}, DATETIME_PARSE('${escapeFormulaValue(
        filtros.desde
      )}', 'YYYY-MM-DD')))`
    );
  }
  if (filtros.hasta) {
    cond.push(
      `NOT(IS_AFTER({${fieldId}}, DATETIME_PARSE('${escapeFormulaValue(
        filtros.hasta
      )}', 'YYYY-MM-DD')))`
    );
  }
  return cond;
}

function combinarAnd(condiciones: string[]): string | undefined {
  const validas = condiciones.filter(Boolean);
  if (validas.length === 0) return undefined;
  if (validas.length === 1) return validas[0];
  return `AND(${validas.join(", ")})`;
}

/** Las evidencias se guardan como JSON en un campo de texto largo. */
function parseEvidencias(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  const texto = String(raw).trim();
  if (!texto) return [];
  try {
    const parsed = JSON.parse(texto);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [String(parsed)];
  } catch {
    // Tolerar valores legados separados por coma o salto de línea
    return texto
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function serializarEvidencias(evidencias: string[] | undefined): string {
  return JSON.stringify(evidencias ?? []);
}

function texto(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function fechaONull(v: unknown): string | null {
  const s = texto(v);
  return s ? s : null;
}

// ══════════════════════════════════════════════════════════
// Consecutivos: AT-2026-001, INV-2026-001, ACC-2026-001, REP-2026-001
// ══════════════════════════════════════════════════════════
async function siguienteConsecutivo(
  tableId: string,
  fieldId: string,
  prefijo: string
): Promise<string> {
  const anio = anioColombia();
  const base = `${prefijo}-${anio}-`;
  try {
    const registros = await fetchAll(
      tableId,
      `FIND('${base}', {${fieldId}}) > 0`
    );
    const max = registros.reduce((acc, r) => {
      const valor = texto(r.fields[fieldId]);
      const n = parseInt(valor.slice(base.length), 10);
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 0);
    return `${base}${String(max + 1).padStart(3, "0")}`;
  } catch (e) {
    console.error(`[accidentes] consecutivo ${prefijo}:`, e);
    throw new Error(
      `No se pudo generar el consecutivo ${prefijo}. Intente nuevamente.`
    );
  }
}

// ══════════════════════════════════════════════════════════
// Mappers
// ══════════════════════════════════════════════════════════
function mapEvento(r: AirtableRecord): EventoAT {
  const f = r.fields;
  const parteCuerpoRaw = f[EVT.PARTE_CUERPO];
  const investigaciones = f[EVT.INVESTIGACIONES_LINK];
  return {
    recordId: r.id,
    idEvento: texto(f[EVT.ID_EVENTO]),
    idEmpleadoCore: texto(f[EVT.ID_EMPLEADO_CORE]),
    nombreEmpleado: texto(f[EVT.NOMBRE_EMPLEADO]),
    numeroDocumento: texto(f[EVT.NUMERO_DOCUMENTO]),
    cargo: texto(f[EVT.CARGO]),
    tipoEvento: texto(f[EVT.TIPO_EVENTO]) as TipoEvento | "",
    fechaEvento: texto(f[EVT.FECHA_EVENTO]),
    horaEvento: texto(f[EVT.HORA_EVENTO]),
    lugarArea: texto(f[EVT.LUGAR_AREA]),
    descripcion: texto(f[EVT.DESCRIPCION]),
    mecanismo: texto(f[EVT.MECANISMO]) as Mecanismo | "",
    tipoLesion: texto(f[EVT.TIPO_LESION]) as TipoLesion | "",
    parteCuerpo: Array.isArray(parteCuerpoRaw)
      ? (parteCuerpoRaw as ParteCuerpo[])
      : [],
    causaPrincipal: texto(f[EVT.CAUSA_PRINCIPAL]),
    conLesion: Boolean(f[EVT.CON_LESION]),
    grave: Boolean(f[EVT.GRAVE]),
    mortal: Boolean(f[EVT.MORTAL]),
    diasIncapacidad: Number(f[EVT.DIAS_INCAPACIDAD] ?? 0) || 0,
    fechaInicioIncapacidad: fechaONull(f[EVT.FECHA_INICIO_INCAPACIDAD]),
    fechaFinIncapacidad: fechaONull(f[EVT.FECHA_FIN_INCAPACIDAD]),
    estadoARL: texto(f[EVT.ESTADO_ARL]) as EstadoARL | "",
    fechaReporteARL: fechaONull(f[EVT.FECHA_REPORTE_ARL]),
    numeroFURAT: texto(f[EVT.NUMERO_FURAT]),
    estado: texto(f[EVT.ESTADO]) as EstadoEvento | "",
    evidencias: parseEvidencias(f[EVT.EVIDENCIAS_URL]),
    observaciones: texto(f[EVT.OBSERVACIONES]),
    createdAt: fechaONull(f[EVT.CREATED_AT]),
    updatedAt: fechaONull(f[EVT.UPDATED_AT]),
    tieneInvestigacion: Array.isArray(investigaciones)
      ? investigaciones.length > 0
      : false,
  };
}

function mapInvestigacion(r: AirtableRecord): InvestigacionAT {
  const f = r.fields;
  const evento = f[INV.EVENTO_LINK];
  return {
    recordId: r.id,
    idInvestigacion: texto(f[INV.ID_INVESTIGACION]),
    eventoRecordId: Array.isArray(evento) ? texto(evento[0]) : null,
    fechaInvestigacion: fechaONull(f[INV.FECHA_INVESTIGACION]),
    equipoInvestigador: texto(f[INV.EQUIPO_INVESTIGADOR]),
    metodologia: texto(f[INV.METODOLOGIA]) as Metodologia | "",
    causasInmediatasActos: texto(f[INV.CAUSAS_INM_ACTOS]),
    causasInmediatasCondiciones: texto(f[INV.CAUSAS_INM_CONDICIONES]),
    causasBasicasPersonales: texto(f[INV.CAUSAS_BAS_PERSONALES]),
    causasBasicasLaborales: texto(f[INV.CAUSAS_BAS_LABORALES]),
    conclusiones: texto(f[INV.CONCLUSIONES]),
    fechaEnvioARL: fechaONull(f[INV.FECHA_ENVIO_ARL]),
    estado: texto(f[INV.ESTADO]) as EstadoInvestigacion | "",
    documentoUrl: texto(f[INV.DOCUMENTO_URL]),
    observaciones: texto(f[INV.OBSERVACIONES]),
    createdAt: fechaONull(f[INV.CREATED_AT]),
    updatedAt: fechaONull(f[INV.UPDATED_AT]),
  };
}

function mapAccion(r: AirtableRecord): AccionAT {
  const f = r.fields;
  const inv = f[ACC.INVESTIGACION_LINK];
  const evt = f[ACC.EVENTO_LINK];
  return {
    recordId: r.id,
    idAccion: texto(f[ACC.ID_ACCION]),
    investigacionRecordId: Array.isArray(inv) ? texto(inv[0]) : null,
    eventoRecordId: Array.isArray(evt) ? texto(evt[0]) : null,
    tipo: texto(f[ACC.TIPO]) as TipoAccion | "",
    jerarquiaControl: texto(f[ACC.JERARQUIA_CONTROL]) as JerarquiaControl | "",
    descripcion: texto(f[ACC.DESCRIPCION]),
    responsableNombre: texto(f[ACC.RESPONSABLE_NOMBRE]),
    responsableTipo: texto(f[ACC.RESPONSABLE_TIPO]) as TipoResponsable | "",
    fechaEjecucion: fechaONull(f[ACC.FECHA_EJECUCION]),
    fechaCierre: fechaONull(f[ACC.FECHA_CIERRE]),
    estado: texto(f[ACC.ESTADO]) as EstadoAccion | "",
    evidencias: parseEvidencias(f[ACC.EVIDENCIA_URL]),
    observaciones: texto(f[ACC.OBSERVACIONES]),
    createdAt: fechaONull(f[ACC.CREATED_AT]),
    updatedAt: fechaONull(f[ACC.UPDATED_AT]),
  };
}

function mapReporte(r: AirtableRecord): ReporteCondicion {
  const f = r.fields;
  return {
    recordId: r.id,
    idReporte: texto(f[REP.ID_REPORTE]),
    tipo: texto(f[REP.TIPO]) as TipoReporte | "",
    fechaReporte: texto(f[REP.FECHA_REPORTE]),
    reportanteIdCore: texto(f[REP.REPORTANTE_ID_CORE]),
    reportanteNombre: texto(f[REP.REPORTANTE_NOMBRE]),
    areaLugar: texto(f[REP.AREA_LUGAR]),
    descripcion: texto(f[REP.DESCRIPCION]),
    nivelRiesgo: texto(f[REP.NIVEL_RIESGO]) as NivelRiesgo | "",
    accionInmediata: texto(f[REP.ACCION_INMEDIATA]),
    responsableNombre: texto(f[REP.RESPONSABLE_NOMBRE]),
    estado: texto(f[REP.ESTADO]) as EstadoReporte | "",
    fechaCierre: fechaONull(f[REP.FECHA_CIERRE]),
    evidencias: parseEvidencias(f[REP.EVIDENCIA_URL]),
    observaciones: texto(f[REP.OBSERVACIONES]),
    createdAt: fechaONull(f[REP.CREATED_AT]),
    updatedAt: fechaONull(f[REP.UPDATED_AT]),
  };
}

// ══════════════════════════════════════════════════════════
// Eventos (accidentes e incidentes)
// ══════════════════════════════════════════════════════════
export async function listarEventos(
  filtros: FiltrosEventos = {}
): Promise<EventoAT[]> {
  const cond = [`{${EVT.ACTIVO}} = 1`, ...condicionesPeriodo(EVT.FECHA_EVENTO, filtros)];
  if (filtros.tipoEvento) {
    cond.push(`{${EVT.TIPO_EVENTO}} = '${escapeFormulaValue(filtros.tipoEvento)}'`);
  }
  if (filtros.estado) {
    cond.push(`{${EVT.ESTADO}} = '${escapeFormulaValue(filtros.estado)}'`);
  }
  if (filtros.idEmpleadoCore) {
    cond.push(
      `{${EVT.ID_EMPLEADO_CORE}} = '${escapeFormulaValue(filtros.idEmpleadoCore)}'`
    );
  }
  const registros = await fetchAll(
    airtableSGSSTConfig.atEventosTableId,
    combinarAnd(cond)
  );
  return registros
    .map(mapEvento)
    .sort((a, b) => b.fechaEvento.localeCompare(a.fechaEvento));
}

export async function obtenerEvento(recordId: string): Promise<EventoAT> {
  const registro = await getRecord(airtableSGSSTConfig.atEventosTableId, recordId);
  return mapEvento(registro);
}

function camposEvento(
  payload: CrearEventoPayload | ActualizarEventoPayload
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (payload.idEmpleadoCore !== undefined) out[EVT.ID_EMPLEADO_CORE] = payload.idEmpleadoCore;
  if (payload.nombreEmpleado !== undefined) out[EVT.NOMBRE_EMPLEADO] = payload.nombreEmpleado;
  if (payload.numeroDocumento !== undefined) out[EVT.NUMERO_DOCUMENTO] = payload.numeroDocumento;
  if (payload.cargo !== undefined) out[EVT.CARGO] = payload.cargo;
  if (payload.tipoEvento !== undefined) out[EVT.TIPO_EVENTO] = payload.tipoEvento;
  if (payload.fechaEvento !== undefined) out[EVT.FECHA_EVENTO] = payload.fechaEvento;
  if (payload.horaEvento !== undefined) out[EVT.HORA_EVENTO] = payload.horaEvento;
  if (payload.lugarArea !== undefined) out[EVT.LUGAR_AREA] = payload.lugarArea;
  if (payload.descripcion !== undefined) out[EVT.DESCRIPCION] = payload.descripcion;
  if (payload.mecanismo !== undefined) out[EVT.MECANISMO] = payload.mecanismo;
  if (payload.tipoLesion !== undefined) out[EVT.TIPO_LESION] = payload.tipoLesion;
  if (payload.parteCuerpo !== undefined) out[EVT.PARTE_CUERPO] = payload.parteCuerpo;
  if (payload.causaPrincipal !== undefined) out[EVT.CAUSA_PRINCIPAL] = payload.causaPrincipal;
  if (payload.conLesion !== undefined) out[EVT.CON_LESION] = payload.conLesion;
  if (payload.grave !== undefined) out[EVT.GRAVE] = payload.grave;
  if (payload.mortal !== undefined) out[EVT.MORTAL] = payload.mortal;
  if (payload.diasIncapacidad !== undefined) out[EVT.DIAS_INCAPACIDAD] = payload.diasIncapacidad;
  if (payload.fechaInicioIncapacidad !== undefined) out[EVT.FECHA_INICIO_INCAPACIDAD] = payload.fechaInicioIncapacidad;
  if (payload.fechaFinIncapacidad !== undefined) out[EVT.FECHA_FIN_INCAPACIDAD] = payload.fechaFinIncapacidad;
  if (payload.estadoARL !== undefined) out[EVT.ESTADO_ARL] = payload.estadoARL;
  if (payload.fechaReporteARL !== undefined) out[EVT.FECHA_REPORTE_ARL] = payload.fechaReporteARL;
  if (payload.numeroFURAT !== undefined) out[EVT.NUMERO_FURAT] = payload.numeroFURAT;
  if (payload.estado !== undefined) out[EVT.ESTADO] = payload.estado;
  if (payload.evidencias !== undefined) out[EVT.EVIDENCIAS_URL] = serializarEvidencias(payload.evidencias);
  if (payload.observaciones !== undefined) out[EVT.OBSERVACIONES] = payload.observaciones;
  return out;
}

export async function crearEvento(
  payload: CrearEventoPayload
): Promise<EventoAT> {
  const idEvento = await siguienteConsecutivo(
    airtableSGSSTConfig.atEventosTableId,
    EVT.ID_EVENTO,
    "AT"
  );
  const ahora = ahoraColombia();
  const registro = await createRecord(airtableSGSSTConfig.atEventosTableId, {
    ...camposEvento(payload),
    [EVT.ID_EVENTO]: idEvento,
    [EVT.ESTADO]: payload.estado ?? "Abierto",
    [EVT.ESTADO_ARL]: payload.estadoARL ?? "Pendiente de reporte",
    [EVT.ACTIVO]: true,
    [EVT.CREATED_AT]: ahora,
    [EVT.UPDATED_AT]: ahora,
  });
  return mapEvento(registro);
}

export async function actualizarEvento(
  recordId: string,
  payload: ActualizarEventoPayload
): Promise<EventoAT> {
  const registro = await updateRecord(
    airtableSGSSTConfig.atEventosTableId,
    recordId,
    { ...camposEvento(payload), [EVT.UPDATED_AT]: ahoraColombia() }
  );
  return mapEvento(registro);
}

/** Soft-delete: marca el evento como inactivo, no lo elimina. */
export async function desactivarEvento(recordId: string): Promise<void> {
  await updateRecord(airtableSGSSTConfig.atEventosTableId, recordId, {
    [EVT.ACTIVO]: false,
    [EVT.UPDATED_AT]: ahoraColombia(),
  });
}

// ══════════════════════════════════════════════════════════
// Investigaciones
// ══════════════════════════════════════════════════════════
export async function listarInvestigaciones(
  filtros: FiltrosPeriodo & { eventoRecordId?: string } = {}
): Promise<InvestigacionAT[]> {
  const cond = [
    `{${INV.ACTIVO}} = 1`,
    ...condicionesPeriodo(INV.FECHA_INVESTIGACION, filtros),
  ];
  const registros = await fetchAll(
    airtableSGSSTConfig.atInvestigacionesTableId,
    combinarAnd(cond)
  );
  const investigaciones = registros.map(mapInvestigacion);
  // El filtro por evento se aplica en memoria: Airtable no permite comparar
  // directamente contra el recordId de un campo de tipo link.
  const filtradas = filtros.eventoRecordId
    ? investigaciones.filter((i) => i.eventoRecordId === filtros.eventoRecordId)
    : investigaciones;
  return filtradas.sort((a, b) =>
    (b.fechaInvestigacion ?? "").localeCompare(a.fechaInvestigacion ?? "")
  );
}

export async function obtenerInvestigacionPorEvento(
  eventoRecordId: string
): Promise<InvestigacionAT | null> {
  const investigaciones = await listarInvestigaciones({ eventoRecordId });
  return investigaciones[0] ?? null;
}

function camposInvestigacion(
  payload: CrearInvestigacionPayload | ActualizarInvestigacionPayload
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (payload.fechaInvestigacion !== undefined) out[INV.FECHA_INVESTIGACION] = payload.fechaInvestigacion;
  if (payload.equipoInvestigador !== undefined) out[INV.EQUIPO_INVESTIGADOR] = payload.equipoInvestigador;
  if (payload.metodologia !== undefined) out[INV.METODOLOGIA] = payload.metodologia;
  if (payload.causasInmediatasActos !== undefined) out[INV.CAUSAS_INM_ACTOS] = payload.causasInmediatasActos;
  if (payload.causasInmediatasCondiciones !== undefined) out[INV.CAUSAS_INM_CONDICIONES] = payload.causasInmediatasCondiciones;
  if (payload.causasBasicasPersonales !== undefined) out[INV.CAUSAS_BAS_PERSONALES] = payload.causasBasicasPersonales;
  if (payload.causasBasicasLaborales !== undefined) out[INV.CAUSAS_BAS_LABORALES] = payload.causasBasicasLaborales;
  if (payload.conclusiones !== undefined) out[INV.CONCLUSIONES] = payload.conclusiones;
  if (payload.fechaEnvioARL !== undefined) out[INV.FECHA_ENVIO_ARL] = payload.fechaEnvioARL;
  if (payload.estado !== undefined) out[INV.ESTADO] = payload.estado;
  if (payload.documentoUrl !== undefined) out[INV.DOCUMENTO_URL] = payload.documentoUrl;
  if (payload.observaciones !== undefined) out[INV.OBSERVACIONES] = payload.observaciones;
  return out;
}

export async function crearInvestigacion(
  payload: CrearInvestigacionPayload
): Promise<InvestigacionAT> {
  const idInvestigacion = await siguienteConsecutivo(
    airtableSGSSTConfig.atInvestigacionesTableId,
    INV.ID_INVESTIGACION,
    "INV"
  );
  const ahora = ahoraColombia();
  const registro = await createRecord(
    airtableSGSSTConfig.atInvestigacionesTableId,
    {
      ...camposInvestigacion(payload),
      [INV.ID_INVESTIGACION]: idInvestigacion,
      [INV.EVENTO_LINK]: [payload.eventoRecordId],
      [INV.ESTADO]: payload.estado ?? "Borrador",
      [INV.ACTIVO]: true,
      [INV.CREATED_AT]: ahora,
      [INV.UPDATED_AT]: ahora,
    }
  );
  // El evento pasa a "En investigación" salvo que ya esté cerrado.
  try {
    const evento = await obtenerEvento(payload.eventoRecordId);
    if (evento.estado !== "Cerrado") {
      await actualizarEvento(payload.eventoRecordId, { estado: "En investigación" });
    }
  } catch (e) {
    console.error("[accidentes] no se pudo actualizar el estado del evento:", e);
  }
  return mapInvestigacion(registro);
}

export async function actualizarInvestigacion(
  recordId: string,
  payload: ActualizarInvestigacionPayload
): Promise<InvestigacionAT> {
  const registro = await updateRecord(
    airtableSGSSTConfig.atInvestigacionesTableId,
    recordId,
    { ...camposInvestigacion(payload), [INV.UPDATED_AT]: ahoraColombia() }
  );
  return mapInvestigacion(registro);
}

export async function desactivarInvestigacion(recordId: string): Promise<void> {
  await updateRecord(airtableSGSSTConfig.atInvestigacionesTableId, recordId, {
    [INV.ACTIVO]: false,
    [INV.UPDATED_AT]: ahoraColombia(),
  });
}

// ══════════════════════════════════════════════════════════
// Acciones preventivas y correctivas
// ══════════════════════════════════════════════════════════
export async function listarAcciones(
  filtros: FiltrosPeriodo & {
    eventoRecordId?: string;
    investigacionRecordId?: string;
    estado?: EstadoAccion;
  } = {}
): Promise<AccionAT[]> {
  const cond = [
    `{${ACC.ACTIVO}} = 1`,
    ...condicionesPeriodo(ACC.FECHA_EJECUCION, filtros),
  ];
  if (filtros.estado) {
    cond.push(`{${ACC.ESTADO}} = '${escapeFormulaValue(filtros.estado)}'`);
  }
  const registros = await fetchAll(
    airtableSGSSTConfig.atAccionesTableId,
    combinarAnd(cond)
  );
  let acciones = registros.map(mapAccion);
  if (filtros.eventoRecordId) {
    acciones = acciones.filter((a) => a.eventoRecordId === filtros.eventoRecordId);
  }
  if (filtros.investigacionRecordId) {
    acciones = acciones.filter(
      (a) => a.investigacionRecordId === filtros.investigacionRecordId
    );
  }
  return acciones.sort((a, b) =>
    (a.fechaEjecucion ?? "").localeCompare(b.fechaEjecucion ?? "")
  );
}

function camposAccion(
  payload: CrearAccionPayload | ActualizarAccionPayload
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (payload.tipo !== undefined) out[ACC.TIPO] = payload.tipo;
  if (payload.jerarquiaControl !== undefined) out[ACC.JERARQUIA_CONTROL] = payload.jerarquiaControl;
  if (payload.descripcion !== undefined) out[ACC.DESCRIPCION] = payload.descripcion;
  if (payload.responsableNombre !== undefined) out[ACC.RESPONSABLE_NOMBRE] = payload.responsableNombre;
  if (payload.responsableTipo !== undefined) out[ACC.RESPONSABLE_TIPO] = payload.responsableTipo;
  if (payload.fechaEjecucion !== undefined) out[ACC.FECHA_EJECUCION] = payload.fechaEjecucion;
  if (payload.fechaCierre !== undefined) out[ACC.FECHA_CIERRE] = payload.fechaCierre;
  if (payload.estado !== undefined) out[ACC.ESTADO] = payload.estado;
  if (payload.evidencias !== undefined) out[ACC.EVIDENCIA_URL] = serializarEvidencias(payload.evidencias);
  if (payload.observaciones !== undefined) out[ACC.OBSERVACIONES] = payload.observaciones;
  if (payload.investigacionRecordId !== undefined) out[ACC.INVESTIGACION_LINK] = [payload.investigacionRecordId];
  if (payload.eventoRecordId !== undefined) out[ACC.EVENTO_LINK] = [payload.eventoRecordId];
  return out;
}

export async function crearAccion(
  payload: CrearAccionPayload
): Promise<AccionAT> {
  const idAccion = await siguienteConsecutivo(
    airtableSGSSTConfig.atAccionesTableId,
    ACC.ID_ACCION,
    "ACC"
  );
  const ahora = ahoraColombia();
  const registro = await createRecord(airtableSGSSTConfig.atAccionesTableId, {
    ...camposAccion(payload),
    [ACC.ID_ACCION]: idAccion,
    [ACC.ESTADO]: payload.estado ?? "Pendiente",
    [ACC.ACTIVO]: true,
    [ACC.CREATED_AT]: ahora,
    [ACC.UPDATED_AT]: ahora,
  });
  return mapAccion(registro);
}

export async function actualizarAccion(
  recordId: string,
  payload: ActualizarAccionPayload
): Promise<AccionAT> {
  const registro = await updateRecord(
    airtableSGSSTConfig.atAccionesTableId,
    recordId,
    { ...camposAccion(payload), [ACC.UPDATED_AT]: ahoraColombia() }
  );
  return mapAccion(registro);
}

export async function desactivarAccion(recordId: string): Promise<void> {
  await updateRecord(airtableSGSSTConfig.atAccionesTableId, recordId, {
    [ACC.ACTIVO]: false,
    [ACC.UPDATED_AT]: ahoraColombia(),
  });
}

// ══════════════════════════════════════════════════════════
// Reportes de casi accidentes, actos y condiciones inseguras
// ══════════════════════════════════════════════════════════
export async function listarReportes(
  filtros: FiltrosReportes = {}
): Promise<ReporteCondicion[]> {
  const cond = [
    `{${REP.ACTIVO}} = 1`,
    ...condicionesPeriodo(REP.FECHA_REPORTE, filtros),
  ];
  if (filtros.tipo) {
    cond.push(`{${REP.TIPO}} = '${escapeFormulaValue(filtros.tipo)}'`);
  }
  if (filtros.estado) {
    cond.push(`{${REP.ESTADO}} = '${escapeFormulaValue(filtros.estado)}'`);
  }
  const registros = await fetchAll(
    airtableSGSSTConfig.atReportesTableId,
    combinarAnd(cond)
  );
  return registros
    .map(mapReporte)
    .sort((a, b) => b.fechaReporte.localeCompare(a.fechaReporte));
}

function camposReporte(
  payload: CrearReportePayload | ActualizarReportePayload
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (payload.tipo !== undefined) out[REP.TIPO] = payload.tipo;
  if (payload.fechaReporte !== undefined) out[REP.FECHA_REPORTE] = payload.fechaReporte;
  if (payload.reportanteIdCore !== undefined) out[REP.REPORTANTE_ID_CORE] = payload.reportanteIdCore;
  if (payload.reportanteNombre !== undefined) out[REP.REPORTANTE_NOMBRE] = payload.reportanteNombre;
  if (payload.areaLugar !== undefined) out[REP.AREA_LUGAR] = payload.areaLugar;
  if (payload.descripcion !== undefined) out[REP.DESCRIPCION] = payload.descripcion;
  if (payload.nivelRiesgo !== undefined) out[REP.NIVEL_RIESGO] = payload.nivelRiesgo;
  if (payload.accionInmediata !== undefined) out[REP.ACCION_INMEDIATA] = payload.accionInmediata;
  if (payload.responsableNombre !== undefined) out[REP.RESPONSABLE_NOMBRE] = payload.responsableNombre;
  if (payload.estado !== undefined) out[REP.ESTADO] = payload.estado;
  if (payload.fechaCierre !== undefined) out[REP.FECHA_CIERRE] = payload.fechaCierre;
  if (payload.evidencias !== undefined) out[REP.EVIDENCIA_URL] = serializarEvidencias(payload.evidencias);
  if (payload.observaciones !== undefined) out[REP.OBSERVACIONES] = payload.observaciones;
  return out;
}

export async function crearReporte(
  payload: CrearReportePayload
): Promise<ReporteCondicion> {
  const idReporte = await siguienteConsecutivo(
    airtableSGSSTConfig.atReportesTableId,
    REP.ID_REPORTE,
    "REP"
  );
  const ahora = ahoraColombia();
  const registro = await createRecord(airtableSGSSTConfig.atReportesTableId, {
    ...camposReporte(payload),
    [REP.ID_REPORTE]: idReporte,
    [REP.ESTADO]: payload.estado ?? "Abierto",
    [REP.ACTIVO]: true,
    [REP.CREATED_AT]: ahora,
    [REP.UPDATED_AT]: ahora,
  });
  return mapReporte(registro);
}

export async function actualizarReporte(
  recordId: string,
  payload: ActualizarReportePayload
): Promise<ReporteCondicion> {
  const registro = await updateRecord(
    airtableSGSSTConfig.atReportesTableId,
    recordId,
    { ...camposReporte(payload), [REP.UPDATED_AT]: ahoraColombia() }
  );
  return mapReporte(registro);
}

export async function desactivarReporte(recordId: string): Promise<void> {
  await updateRecord(airtableSGSSTConfig.atReportesTableId, recordId, {
    [REP.ACTIVO]: false,
    [REP.UPDATED_AT]: ahoraColombia(),
  });
}

// ══════════════════════════════════════════════════════════
// Indicadores del informe mensual de gestión SST
// ══════════════════════════════════════════════════════════
export async function calcularIndicadores(
  desde: string,
  hasta: string
): Promise<{
  indicadores: IndicadoresAccidentes;
  filasAccidentes: FilaAccidenteInforme[];
  filasInvestigaciones: FilaInvestigacionInforme[];
}> {
  const periodo: FiltrosPeriodo = { desde, hasta };

  // Investigaciones y acciones se traen completas y se filtran en memoria:
  // una investigación de un evento del periodo cuenta para el informe aunque
  // se haya realizado el mes siguiente, y viceversa. El volumen es bajo
  // (los accidentes son eventos poco frecuentes).
  const [eventos, reportes, todasInvestigaciones, todasAcciones] =
    await Promise.all([
      listarEventos(periodo),
      listarReportes(periodo),
      listarInvestigaciones(),
      listarAcciones(),
    ]);

  const accidentes = eventos.filter((e) => e.tipoEvento === "Accidente de trabajo");
  const incidentes = eventos.filter((e) => e.tipoEvento === "Incidente de trabajo");

  const recordIdsPeriodo = new Set(eventos.map((e) => e.recordId));
  const enPeriodo = (fecha: string | null): boolean =>
    Boolean(fecha) && fecha! >= desde && fecha! <= hasta;

  const investigaciones = todasInvestigaciones.filter(
    (i) =>
      enPeriodo(i.fechaInvestigacion) ||
      (i.eventoRecordId !== null && recordIdsPeriodo.has(i.eventoRecordId))
  );

  const recordIdsInvestigaciones = new Set(investigaciones.map((i) => i.recordId));
  const accionesRelacionadas = todasAcciones.filter(
    (a) =>
      (a.investigacionRecordId !== null &&
        recordIdsInvestigaciones.has(a.investigacionRecordId)) ||
      (a.eventoRecordId !== null && recordIdsPeriodo.has(a.eventoRecordId))
  );

  // Para los contadores de gestión sí importa la fecha de ejecución del periodo.
  const acciones = todasAcciones.filter((a) => enPeriodo(a.fechaEjecucion));

  const contarReportes = (tipo: TipoReporte) =>
    reportes.filter((r) => r.tipo === tipo).length;

  const indicadores: IndicadoresAccidentes = {
    periodo: { desde, hasta },
    accidentesReconocidosARL: accidentes.filter(
      (e) => e.estadoARL === "Reconocido por ARL"
    ).length,
    accidentesObjetadosARL: accidentes.filter(
      (e) => e.estadoARL === "Objetado por ARL" || e.estadoARL === "En junta de calificación"
    ).length,
    accidentesGraves: accidentes.filter((e) => e.grave).length,
    accidentesFatales: accidentes.filter((e) => e.mortal).length,
    diasIncapacidadAT: accidentes.reduce((s, e) => s + e.diasIncapacidad, 0),
    casiAccidentes: contarReportes("Casi accidente"),
    actosInseguros: contarReportes("Acto inseguro"),
    condicionesInseguras: contarReportes("Condición insegura"),
    totalAccidentes: accidentes.length,
    totalIncidentes: incidentes.length,
    accidentesConLesion: accidentes.filter((e) => e.conLesion).length,
    investigacionesRealizadas: investigaciones.length,
    accionesCerradas: acciones.filter((a) => a.estado === "Cerrada").length,
    accionesPendientes: acciones.filter((a) => a.estado !== "Cerrada").length,
  };

  const filasAccidentes: FilaAccidenteInforme[] = accidentes
    .filter((e) => e.conLesion)
    .map((e) => ({
      nombreTrabajador: e.nombreEmpleado,
      fechaEvento: e.fechaEvento,
      tipoLesion: e.tipoLesion || "—",
      causaPrincipal: e.causaPrincipal || "—",
      diasIncapacidad: e.diasIncapacidad,
      accidenteGrave: e.grave,
    }));

  // Una fila por evento investigado, agrupando sus acciones por tipo.
  const eventosPorRecordId = new Map(eventos.map((e) => [e.recordId, e]));
  // Una investigación del periodo puede corresponder a un evento anterior:
  // se resuelven esos eventos puntualmente para no perder el nombre.
  const faltantes = investigaciones
    .map((i) => i.eventoRecordId)
    .filter((id): id is string => Boolean(id) && !eventosPorRecordId.has(id!));
  for (const recordId of new Set(faltantes)) {
    try {
      eventosPorRecordId.set(recordId, await obtenerEvento(recordId));
    } catch (e) {
      console.error(`[accidentes] evento ${recordId} no resuelto:`, e);
    }
  }

  const filasInvestigaciones: FilaInvestigacionInforme[] = investigaciones.map(
    (inv) => {
      const accionesInv = accionesRelacionadas.filter(
        (a) => a.investigacionRecordId === inv.recordId
      );
      const preventivas = accionesInv
        .filter((a) => a.tipo === "Preventiva")
        .map((a) => a.descripcion)
        .join("; ");
      const correctivas = accionesInv
        .filter((a) => a.tipo === "Correctiva")
        .map((a) => a.descripcion)
        .join("; ");
      const evento = inv.eventoRecordId
        ? eventosPorRecordId.get(inv.eventoRecordId)
        : undefined;
      const fechaEjecucion = accionesInv
        .map((a) => a.fechaEjecucion)
        .filter((f): f is string => Boolean(f))
        .sort()[0];
      return {
        nombreTrabajador: evento?.nombreEmpleado ?? "—",
        accionPreventiva: preventivas || "—",
        accionCorrectiva: correctivas || "—",
        fechaEjecucion: fechaEjecucion ?? "—",
        responsable:
          accionesInv.map((a) => a.responsableNombre).filter(Boolean).join(", ") ||
          "—",
      };
    }
  );

  return { indicadores, filasAccidentes, filasInvestigaciones };
}
