// ══════════════════════════════════════════════════════════
// Repositorio Airtable — Medicina Laboral
// ══════════════════════════════════════════════════════════
import {
  airtableSGSSTConfig,
  getSGSSTHeaders,
  getSGSSTUrl,
} from "@/infrastructure/config/airtableSGSST";
import type {
  CrearEnfermedadLaboralPayload,
  CrearExamenPayload,
  CrearIncapacidadPayload,
  CrearReubicacionPayload,
  CrearSeguimientoPayload,
  EnfermedadLaboral,
  ExamenMedico,
  FiltrosEnfermedadesLaborales,
  FiltrosExamenes,
  FiltrosIncapacidades,
  FiltrosReubicaciones,
  FiltrosSeguimientos,
  IndicadoresMedicinaLaboral,
  Incapacidad,
  Reubicacion,
  SeguimientoMedico,
} from "./types";

// ── Helpers ────────────────────────────────────────────────

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

function fechaISO(): string {
  const now = new Date();
  return now.toISOString();
}

// ══════════════════════════════════════════════════════════
// EXÁMENES MÉDICOS
// ══════════════════════════════════════════════════════════

export async function listarExamenes(
  filtros: FiltrosExamenes
): Promise<ExamenMedico[]> {
  const F = airtableSGSSTConfig.medExamenesFields;
  const predicados: string[] = [`{${F.ACTIVO}} = TRUE()`];

  if (filtros.desde) {
    predicados.push(`{${F.FECHA_EXAMEN}} >= '${escapeFormula(filtros.desde)}'`);
  }
  if (filtros.hasta) {
    predicados.push(`{${F.FECHA_EXAMEN}} <= '${escapeFormula(filtros.hasta)}'`);
  }
  if (filtros.tipoExamen) {
    predicados.push(`{${F.TIPO_EXAMEN}} = '${escapeFormula(filtros.tipoExamen)}'`);
  }
  if (filtros.estado) {
    predicados.push(`{${F.ESTADO}} = '${escapeFormula(filtros.estado)}'`);
  }
  if (filtros.idEmpleadoCore) {
    predicados.push(
      `{${F.ID_EMPLEADO_CORE}} = '${escapeFormula(filtros.idEmpleadoCore)}'`
    );
  }

  const formula = `AND(${predicados.join(", ")})`;
  const params = new URLSearchParams({
    filterByFormula: formula,
    returnFieldsByFieldId: "true",
    pageSize: "100",
  });

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medExamenesTableId)}?${params}`;
  const data = await airtableFetch(url);

  return data.records.map((r) => ({
    recordId: r.id,
    consecutivo: String(r.fields[F.CONSECUTIVO] || ""),
    fechaExamen: String(r.fields[F.FECHA_EXAMEN] || ""),
    tipoExamen: r.fields[F.TIPO_EXAMEN] as any,
    idEmpleadoCore: String(r.fields[F.ID_EMPLEADO_CORE] || ""),
    nombreEmpleado: String(r.fields[F.NOMBRE_EMPLEADO] || ""),
    numeroDocumento: String(r.fields[F.NUMERO_DOCUMENTO] || ""),
    cargo: String(r.fields[F.CARGO] || ""),
    ipsEntidad: (r.fields[F.IPS_ENTIDAD] as string) || null,
    conceptoAptitud: (r.fields[F.CONCEPTO_APTITUD] as any) || null,
    restricciones: (r.fields[F.RESTRICCIONES] as string) || null,
    recomendaciones: (r.fields[F.RECOMENDACIONES] as string) || null,
    estado: r.fields[F.ESTADO] as any,
    fechaProgramada: (r.fields[F.FECHA_PROGRAMADA] as string) || null,
    documentoUrl: (r.fields[F.DOCUMENTO_URL] as string) || null,
    observaciones: (r.fields[F.OBSERVACIONES] as string) || null,
    activo: Boolean(r.fields[F.ACTIVO]),
    createdAt: String(r.fields[F.CREATED_AT] || r.createdTime || ""),
    updatedAt: String(r.fields[F.UPDATED_AT] || ""),
  }));
}

export async function obtenerExamen(
  recordId: string
): Promise<ExamenMedico | null> {
  const F = airtableSGSSTConfig.medExamenesFields;
  try {
    const url = `${getSGSSTUrl(airtableSGSSTConfig.medExamenesTableId)}/${recordId}?returnFieldsByFieldId=true`;
    const r = await airtableFetch<AirtableRecord>(url);
    return {
      recordId: r.id,
      consecutivo: String(r.fields[F.CONSECUTIVO] || ""),
      fechaExamen: String(r.fields[F.FECHA_EXAMEN] || ""),
      tipoExamen: r.fields[F.TIPO_EXAMEN] as any,
      idEmpleadoCore: String(r.fields[F.ID_EMPLEADO_CORE] || ""),
      nombreEmpleado: String(r.fields[F.NOMBRE_EMPLEADO] || ""),
      numeroDocumento: String(r.fields[F.NUMERO_DOCUMENTO] || ""),
      cargo: String(r.fields[F.CARGO] || ""),
      ipsEntidad: (r.fields[F.IPS_ENTIDAD] as string) || null,
      conceptoAptitud: (r.fields[F.CONCEPTO_APTITUD] as any) || null,
      restricciones: (r.fields[F.RESTRICCIONES] as string) || null,
      recomendaciones: (r.fields[F.RECOMENDACIONES] as string) || null,
      estado: r.fields[F.ESTADO] as any,
      fechaProgramada: (r.fields[F.FECHA_PROGRAMADA] as string) || null,
      documentoUrl: (r.fields[F.DOCUMENTO_URL] as string) || null,
      observaciones: (r.fields[F.OBSERVACIONES] as string) || null,
      activo: Boolean(r.fields[F.ACTIVO]),
      createdAt: String(r.fields[F.CREATED_AT] || r.createdTime || ""),
      updatedAt: String(r.fields[F.UPDATED_AT] || ""),
    };
  } catch {
    return null;
  }
}

async function generarConsecutivoExamen(anio: number): Promise<string> {
  const F = airtableSGSSTConfig.medExamenesFields;
  const filtro = `AND(FIND('EXM-${anio}-', {${F.CONSECUTIVO}}) > 0, {${F.ACTIVO}} = TRUE())`;
  const params = new URLSearchParams({
    filterByFormula: filtro,
    returnFieldsByFieldId: "true",
    pageSize: "100",
    "sort[0][field]": F.CONSECUTIVO,
    "sort[0][direction]": "desc",
  });

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medExamenesTableId)}?${params}`;
  const data = await airtableFetch(url);

  if (data.records.length === 0) {
    return `EXM-${anio}-001`;
  }

  const ultimo = String(data.records[0].fields[F.CONSECUTIVO] || "");
  const match = ultimo.match(/EXM-\d{4}-(\d+)/);
  if (!match) return `EXM-${anio}-001`;

  const num = parseInt(match[1], 10) + 1;
  return `EXM-${anio}-${String(num).padStart(3, "0")}`;
}

export async function crearExamen(
  payload: CrearExamenPayload
): Promise<ExamenMedico> {
  const F = airtableSGSSTConfig.medExamenesFields;
  const anio = new Date().getFullYear();
  const consecutivo = await generarConsecutivoExamen(anio);
  const now = fechaISO();

  const fields: Record<string, unknown> = {
    [F.CONSECUTIVO]: consecutivo,
    [F.FECHA_EXAMEN]: payload.fechaExamen,
    [F.TIPO_EXAMEN]: payload.tipoExamen,
    [F.ID_EMPLEADO_CORE]: payload.idEmpleadoCore,
    [F.NOMBRE_EMPLEADO]: payload.nombreEmpleado,
    [F.NUMERO_DOCUMENTO]: payload.numeroDocumento,
    [F.CARGO]: payload.cargo,
    [F.ESTADO]: payload.estado || "Programado",
    [F.ACTIVO]: true,
    [F.CREATED_AT]: now,
    [F.UPDATED_AT]: now,
  };

  if (payload.ipsEntidad) fields[F.IPS_ENTIDAD] = payload.ipsEntidad;
  if (payload.conceptoAptitud) fields[F.CONCEPTO_APTITUD] = payload.conceptoAptitud;
  if (payload.restricciones) fields[F.RESTRICCIONES] = payload.restricciones;
  if (payload.recomendaciones) fields[F.RECOMENDACIONES] = payload.recomendaciones;
  if (payload.fechaProgramada) fields[F.FECHA_PROGRAMADA] = payload.fechaProgramada;
  if (payload.observaciones) fields[F.OBSERVACIONES] = payload.observaciones;

  const url = getSGSSTUrl(airtableSGSSTConfig.medExamenesTableId);
  const body = JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false });
  const r = await airtableFetch<AirtableRecord>(url, {
    method: "POST",
    body,
  });

  return {
    recordId: r.id,
    consecutivo,
    fechaExamen: payload.fechaExamen,
    tipoExamen: payload.tipoExamen,
    idEmpleadoCore: payload.idEmpleadoCore,
    nombreEmpleado: payload.nombreEmpleado,
    numeroDocumento: payload.numeroDocumento,
    cargo: payload.cargo,
    ipsEntidad: payload.ipsEntidad || null,
    conceptoAptitud: payload.conceptoAptitud || null,
    restricciones: payload.restricciones || null,
    recomendaciones: payload.recomendaciones || null,
    estado: payload.estado || "Programado",
    fechaProgramada: payload.fechaProgramada || null,
    documentoUrl: null,
    observaciones: payload.observaciones || null,
    activo: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function actualizarExamen(
  recordId: string,
  cambios: Partial<CrearExamenPayload>
): Promise<void> {
  const F = airtableSGSSTConfig.medExamenesFields;
  const fields: Record<string, unknown> = {
    [F.UPDATED_AT]: fechaISO(),
  };

  if (cambios.fechaExamen !== undefined) fields[F.FECHA_EXAMEN] = cambios.fechaExamen;
  if (cambios.tipoExamen) fields[F.TIPO_EXAMEN] = cambios.tipoExamen;
  if (cambios.idEmpleadoCore) fields[F.ID_EMPLEADO_CORE] = cambios.idEmpleadoCore;
  if (cambios.nombreEmpleado) fields[F.NOMBRE_EMPLEADO] = cambios.nombreEmpleado;
  if (cambios.numeroDocumento) fields[F.NUMERO_DOCUMENTO] = cambios.numeroDocumento;
  if (cambios.cargo) fields[F.CARGO] = cambios.cargo;
  if (cambios.ipsEntidad !== undefined) fields[F.IPS_ENTIDAD] = cambios.ipsEntidad;
  if (cambios.conceptoAptitud !== undefined)
    fields[F.CONCEPTO_APTITUD] = cambios.conceptoAptitud;
  if (cambios.restricciones !== undefined)
    fields[F.RESTRICCIONES] = cambios.restricciones;
  if (cambios.recomendaciones !== undefined)
    fields[F.RECOMENDACIONES] = cambios.recomendaciones;
  if (cambios.estado) fields[F.ESTADO] = cambios.estado;
  if (cambios.fechaProgramada !== undefined)
    fields[F.FECHA_PROGRAMADA] = cambios.fechaProgramada;
  if (cambios.observaciones !== undefined)
    fields[F.OBSERVACIONES] = cambios.observaciones;

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medExamenesTableId)}/${recordId}`;
  const body = JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false });
  await airtableFetch(url, { method: "PATCH", body });
}

export async function eliminarExamen(recordId: string): Promise<void> {
  const F = airtableSGSSTConfig.medExamenesFields;
  const fields = {
    [F.ACTIVO]: false,
    [F.UPDATED_AT]: fechaISO(),
  };

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medExamenesTableId)}/${recordId}`;
  await airtableFetch(url, {
    method: "PATCH",
    body: JSON.stringify({ fields, returnFieldsByFieldId: true }),
  });
}

// ══════════════════════════════════════════════════════════
// SEGUIMIENTOS MÉDICOS
// ══════════════════════════════════════════════════════════

export async function listarSeguimientos(
  filtros: FiltrosSeguimientos
): Promise<SeguimientoMedico[]> {
  const F = airtableSGSSTConfig.medSeguimientosFields;
  const predicados: string[] = [`{${F.ACTIVO}} = TRUE()`];

  if (filtros.desde) {
    predicados.push(`{${F.FECHA_SEGUIMIENTO}} >= '${escapeFormula(filtros.desde)}'`);
  }
  if (filtros.hasta) {
    predicados.push(`{${F.FECHA_SEGUIMIENTO}} <= '${escapeFormula(filtros.hasta)}'`);
  }
  if (filtros.tipoSeguimiento) {
    predicados.push(
      `{${F.TIPO_SEGUIMIENTO}} = '${escapeFormula(filtros.tipoSeguimiento)}'`
    );
  }
  if (filtros.idEmpleadoCore) {
    predicados.push(
      `{${F.ID_EMPLEADO_CORE}} = '${escapeFormula(filtros.idEmpleadoCore)}'`
    );
  }

  const formula = `AND(${predicados.join(", ")})`;
  const params = new URLSearchParams({
    filterByFormula: formula,
    returnFieldsByFieldId: "true",
    pageSize: "100",
  });

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medSeguimientosTableId)}?${params}`;
  const data = await airtableFetch(url);

  return data.records.map((r) => ({
    recordId: r.id,
    consecutivo: String(r.fields[F.CONSECUTIVO] || ""),
    fechaSeguimiento: String(r.fields[F.FECHA_SEGUIMIENTO] || ""),
    tipoSeguimiento: r.fields[F.TIPO_SEGUIMIENTO] as any,
    idEmpleadoCore: String(r.fields[F.ID_EMPLEADO_CORE] || ""),
    nombreEmpleado: String(r.fields[F.NOMBRE_EMPLEADO] || ""),
    numeroDocumento: String(r.fields[F.NUMERO_DOCUMENTO] || ""),
    cargo: String(r.fields[F.CARGO] || ""),
    diagnostico: (r.fields[F.DIAGNOSTICO] as string) || null,
    accionesRealizadas: (r.fields[F.ACCIONES_REALIZADAS] as string) || null,
    recomendaciones: (r.fields[F.RECOMENDACIONES] as string) || null,
    proximaCita: (r.fields[F.PROXIMA_CITA] as string) || null,
    documentoUrl: (r.fields[F.DOCUMENTO_URL] as string) || null,
    observaciones: (r.fields[F.OBSERVACIONES] as string) || null,
    activo: Boolean(r.fields[F.ACTIVO]),
    createdAt: String(r.fields[F.CREATED_AT] || r.createdTime || ""),
    updatedAt: String(r.fields[F.UPDATED_AT] || ""),
  }));
}

async function generarConsecutivoSeguimiento(anio: number): Promise<string> {
  const F = airtableSGSSTConfig.medSeguimientosFields;
  const filtro = `AND(FIND('SEG-${anio}-', {${F.CONSECUTIVO}}) > 0, {${F.ACTIVO}} = TRUE())`;
  const params = new URLSearchParams({
    filterByFormula: filtro,
    returnFieldsByFieldId: "true",
    pageSize: "100",
    "sort[0][field]": F.CONSECUTIVO,
    "sort[0][direction]": "desc",
  });

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medSeguimientosTableId)}?${params}`;
  const data = await airtableFetch(url);

  if (data.records.length === 0) {
    return `SEG-${anio}-001`;
  }

  const ultimo = String(data.records[0].fields[F.CONSECUTIVO] || "");
  const match = ultimo.match(/SEG-\d{4}-(\d+)/);
  if (!match) return `SEG-${anio}-001`;

  const num = parseInt(match[1], 10) + 1;
  return `SEG-${anio}-${String(num).padStart(3, "0")}`;
}

export async function crearSeguimiento(
  payload: CrearSeguimientoPayload
): Promise<SeguimientoMedico> {
  const F = airtableSGSSTConfig.medSeguimientosFields;
  const anio = new Date().getFullYear();
  const consecutivo = await generarConsecutivoSeguimiento(anio);
  const now = fechaISO();

  const fields: Record<string, unknown> = {
    [F.CONSECUTIVO]: consecutivo,
    [F.FECHA_SEGUIMIENTO]: payload.fechaSeguimiento,
    [F.TIPO_SEGUIMIENTO]: payload.tipoSeguimiento,
    [F.ID_EMPLEADO_CORE]: payload.idEmpleadoCore,
    [F.NOMBRE_EMPLEADO]: payload.nombreEmpleado,
    [F.NUMERO_DOCUMENTO]: payload.numeroDocumento,
    [F.CARGO]: payload.cargo,
    [F.ACTIVO]: true,
    [F.CREATED_AT]: now,
    [F.UPDATED_AT]: now,
  };

  if (payload.diagnostico) fields[F.DIAGNOSTICO] = payload.diagnostico;
  if (payload.accionesRealizadas)
    fields[F.ACCIONES_REALIZADAS] = payload.accionesRealizadas;
  if (payload.recomendaciones) fields[F.RECOMENDACIONES] = payload.recomendaciones;
  if (payload.proximaCita) fields[F.PROXIMA_CITA] = payload.proximaCita;
  if (payload.observaciones) fields[F.OBSERVACIONES] = payload.observaciones;

  const url = getSGSSTUrl(airtableSGSSTConfig.medSeguimientosTableId);
  const body = JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false });
  const r = await airtableFetch<AirtableRecord>(url, {
    method: "POST",
    body,
  });

  return {
    recordId: r.id,
    consecutivo,
    fechaSeguimiento: payload.fechaSeguimiento,
    tipoSeguimiento: payload.tipoSeguimiento,
    idEmpleadoCore: payload.idEmpleadoCore,
    nombreEmpleado: payload.nombreEmpleado,
    numeroDocumento: payload.numeroDocumento,
    cargo: payload.cargo,
    diagnostico: payload.diagnostico || null,
    accionesRealizadas: payload.accionesRealizadas || null,
    recomendaciones: payload.recomendaciones || null,
    proximaCita: payload.proximaCita || null,
    documentoUrl: null,
    observaciones: payload.observaciones || null,
    activo: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function actualizarSeguimiento(
  recordId: string,
  cambios: Partial<CrearSeguimientoPayload>
): Promise<void> {
  const F = airtableSGSSTConfig.medSeguimientosFields;
  const fields: Record<string, unknown> = {
    [F.UPDATED_AT]: fechaISO(),
  };

  if (cambios.fechaSeguimiento !== undefined)
    fields[F.FECHA_SEGUIMIENTO] = cambios.fechaSeguimiento;
  if (cambios.tipoSeguimiento) fields[F.TIPO_SEGUIMIENTO] = cambios.tipoSeguimiento;
  if (cambios.diagnostico !== undefined) fields[F.DIAGNOSTICO] = cambios.diagnostico;
  if (cambios.accionesRealizadas !== undefined)
    fields[F.ACCIONES_REALIZADAS] = cambios.accionesRealizadas;
  if (cambios.recomendaciones !== undefined)
    fields[F.RECOMENDACIONES] = cambios.recomendaciones;
  if (cambios.proximaCita !== undefined) fields[F.PROXIMA_CITA] = cambios.proximaCita;
  if (cambios.observaciones !== undefined)
    fields[F.OBSERVACIONES] = cambios.observaciones;

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medSeguimientosTableId)}/${recordId}`;
  const body = JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false });
  await airtableFetch(url, { method: "PATCH", body });
}

export async function eliminarSeguimiento(recordId: string): Promise<void> {
  const F = airtableSGSSTConfig.medSeguimientosFields;
  const fields = {
    [F.ACTIVO]: false,
    [F.UPDATED_AT]: fechaISO(),
  };

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medSeguimientosTableId)}/${recordId}`;
  await airtableFetch(url, {
    method: "PATCH",
    body: JSON.stringify({ fields, returnFieldsByFieldId: true }),
  });
}

// ══════════════════════════════════════════════════════════
// INCAPACIDADES
// ══════════════════════════════════════════════════════════

export async function listarIncapacidades(
  filtros: FiltrosIncapacidades
): Promise<Incapacidad[]> {
  const F = airtableSGSSTConfig.medIncapacidadesFields;
  const predicados: string[] = [`{${F.ACTIVO}} = TRUE()`];

  if (filtros.desde) {
    predicados.push(`{${F.FECHA_INICIO}} >= '${escapeFormula(filtros.desde)}'`);
  }
  if (filtros.hasta) {
    predicados.push(`{${F.FECHA_FIN}} <= '${escapeFormula(filtros.hasta)}'`);
  }
  if (filtros.tipo) {
    predicados.push(`{${F.TIPO}} = '${escapeFormula(filtros.tipo)}'`);
  }
  if (filtros.idEmpleadoCore) {
    predicados.push(
      `{${F.ID_EMPLEADO_CORE}} = '${escapeFormula(filtros.idEmpleadoCore)}'`
    );
  }

  const formula = `AND(${predicados.join(", ")})`;
  const params = new URLSearchParams({
    filterByFormula: formula,
    returnFieldsByFieldId: "true",
    pageSize: "100",
  });

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medIncapacidadesTableId)}?${params}`;
  const data = await airtableFetch(url);

  return data.records.map((r) => ({
    recordId: r.id,
    consecutivo: String(r.fields[F.CONSECUTIVO] || ""),
    tipo: r.fields[F.TIPO] as any,
    idEmpleadoCore: String(r.fields[F.ID_EMPLEADO_CORE] || ""),
    nombreEmpleado: String(r.fields[F.NOMBRE_EMPLEADO] || ""),
    numeroDocumento: String(r.fields[F.NUMERO_DOCUMENTO] || ""),
    cargo: String(r.fields[F.CARGO] || ""),
    diagnostico: (r.fields[F.DIAGNOSTICO] as string) || null,
    fechaInicio: String(r.fields[F.FECHA_INICIO] || ""),
    fechaFin: String(r.fields[F.FECHA_FIN] || ""),
    diasIncapacidad: Number(r.fields[F.DIAS_INCAPACIDAD] || 0),
    entidadEmisora: (r.fields[F.ENTIDAD_EMISORA] as string) || null,
    numeroIncapacidad: (r.fields[F.NUMERO_INCAPACIDAD] as string) || null,
    prorroga: Boolean(r.fields[F.PRORROGA]),
    incapacidadOrigenRecordId: (r.fields[F.INCAPACIDAD_ORIGEN_LINK] as any)?.[0] || null,
    documentoUrl: (r.fields[F.DOCUMENTO_URL] as string) || null,
    observaciones: (r.fields[F.OBSERVACIONES] as string) || null,
    activo: Boolean(r.fields[F.ACTIVO]),
    createdAt: String(r.fields[F.CREATED_AT] || r.createdTime || ""),
    updatedAt: String(r.fields[F.UPDATED_AT] || ""),
  }));
}

async function generarConsecutivoIncapacidad(anio: number): Promise<string> {
  const F = airtableSGSSTConfig.medIncapacidadesFields;
  const filtro = `AND(FIND('INC-${anio}-', {${F.CONSECUTIVO}}) > 0, {${F.ACTIVO}} = TRUE())`;
  const params = new URLSearchParams({
    filterByFormula: filtro,
    returnFieldsByFieldId: "true",
    pageSize: "100",
    "sort[0][field]": F.CONSECUTIVO,
    "sort[0][direction]": "desc",
  });

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medIncapacidadesTableId)}?${params}`;
  const data = await airtableFetch(url);

  if (data.records.length === 0) {
    return `INC-${anio}-001`;
  }

  const ultimo = String(data.records[0].fields[F.CONSECUTIVO] || "");
  const match = ultimo.match(/INC-\d{4}-(\d+)/);
  if (!match) return `INC-${anio}-001`;

  const num = parseInt(match[1], 10) + 1;
  return `INC-${anio}-${String(num).padStart(3, "0")}`;
}

function calcularDiasIncapacidad(fechaInicio: string, fechaFin: string): number {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diff = fin.getTime() - inicio.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // Incluye el día final
}

export async function crearIncapacidad(
  payload: CrearIncapacidadPayload
): Promise<Incapacidad> {
  const F = airtableSGSSTConfig.medIncapacidadesFields;
  const anio = new Date().getFullYear();
  const consecutivo = await generarConsecutivoIncapacidad(anio);
  const now = fechaISO();

  const diasIncapacidad = calcularDiasIncapacidad(
    payload.fechaInicio,
    payload.fechaFin
  );

  const fields: Record<string, unknown> = {
    [F.CONSECUTIVO]: consecutivo,
    [F.TIPO]: payload.tipo,
    [F.ID_EMPLEADO_CORE]: payload.idEmpleadoCore,
    [F.NOMBRE_EMPLEADO]: payload.nombreEmpleado,
    [F.NUMERO_DOCUMENTO]: payload.numeroDocumento,
    [F.CARGO]: payload.cargo,
    [F.FECHA_INICIO]: payload.fechaInicio,
    [F.FECHA_FIN]: payload.fechaFin,
    [F.DIAS_INCAPACIDAD]: diasIncapacidad,
    [F.PRORROGA]: Boolean(payload.prorroga),
    [F.ACTIVO]: true,
    [F.CREATED_AT]: now,
    [F.UPDATED_AT]: now,
  };

  if (payload.diagnostico) fields[F.DIAGNOSTICO] = payload.diagnostico;
  if (payload.entidadEmisora) fields[F.ENTIDAD_EMISORA] = payload.entidadEmisora;
  if (payload.numeroIncapacidad)
    fields[F.NUMERO_INCAPACIDAD] = payload.numeroIncapacidad;
  if (payload.incapacidadOrigenRecordId)
    fields[F.INCAPACIDAD_ORIGEN_LINK] = [payload.incapacidadOrigenRecordId];
  if (payload.observaciones) fields[F.OBSERVACIONES] = payload.observaciones;

  const url = getSGSSTUrl(airtableSGSSTConfig.medIncapacidadesTableId);
  const body = JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false });
  const r = await airtableFetch<AirtableRecord>(url, {
    method: "POST",
    body,
  });

  return {
    recordId: r.id,
    consecutivo,
    tipo: payload.tipo,
    idEmpleadoCore: payload.idEmpleadoCore,
    nombreEmpleado: payload.nombreEmpleado,
    numeroDocumento: payload.numeroDocumento,
    cargo: payload.cargo,
    diagnostico: payload.diagnostico || null,
    fechaInicio: payload.fechaInicio,
    fechaFin: payload.fechaFin,
    diasIncapacidad,
    entidadEmisora: payload.entidadEmisora || null,
    numeroIncapacidad: payload.numeroIncapacidad || null,
    prorroga: Boolean(payload.prorroga),
    incapacidadOrigenRecordId: payload.incapacidadOrigenRecordId || null,
    documentoUrl: null,
    observaciones: payload.observaciones || null,
    activo: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function actualizarIncapacidad(
  recordId: string,
  cambios: Partial<CrearIncapacidadPayload>
): Promise<void> {
  const F = airtableSGSSTConfig.medIncapacidadesFields;
  const fields: Record<string, unknown> = {
    [F.UPDATED_AT]: fechaISO(),
  };

  if (cambios.tipo) fields[F.TIPO] = cambios.tipo;
  if (cambios.diagnostico !== undefined) fields[F.DIAGNOSTICO] = cambios.diagnostico;
  if (cambios.fechaInicio !== undefined) fields[F.FECHA_INICIO] = cambios.fechaInicio;
  if (cambios.fechaFin !== undefined) fields[F.FECHA_FIN] = cambios.fechaFin;
  if (cambios.fechaInicio && cambios.fechaFin) {
    fields[F.DIAS_INCAPACIDAD] = calcularDiasIncapacidad(
      cambios.fechaInicio,
      cambios.fechaFin
    );
  }
  if (cambios.entidadEmisora !== undefined)
    fields[F.ENTIDAD_EMISORA] = cambios.entidadEmisora;
  if (cambios.numeroIncapacidad !== undefined)
    fields[F.NUMERO_INCAPACIDAD] = cambios.numeroIncapacidad;
  if (cambios.prorroga !== undefined) fields[F.PRORROGA] = cambios.prorroga;
  if (cambios.incapacidadOrigenRecordId !== undefined)
    fields[F.INCAPACIDAD_ORIGEN_LINK] = cambios.incapacidadOrigenRecordId
      ? [cambios.incapacidadOrigenRecordId]
      : [];
  if (cambios.observaciones !== undefined)
    fields[F.OBSERVACIONES] = cambios.observaciones;

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medIncapacidadesTableId)}/${recordId}`;
  const body = JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false });
  await airtableFetch(url, { method: "PATCH", body });
}

export async function eliminarIncapacidad(recordId: string): Promise<void> {
  const F = airtableSGSSTConfig.medIncapacidadesFields;
  const fields = {
    [F.ACTIVO]: false,
    [F.UPDATED_AT]: fechaISO(),
  };

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medIncapacidadesTableId)}/${recordId}`;
  await airtableFetch(url, {
    method: "PATCH",
    body: JSON.stringify({ fields, returnFieldsByFieldId: true }),
  });
}

// ══════════════════════════════════════════════════════════
// REUBICACIONES
// ══════════════════════════════════════════════════════════

export async function listarReubicaciones(
  filtros: FiltrosReubicaciones
): Promise<Reubicacion[]> {
  const F = airtableSGSSTConfig.medReubicacionesFields;
  const predicados: string[] = [`{${F.ACTIVO}} = TRUE()`];

  if (filtros.desde) {
    predicados.push(`{${F.FECHA_INICIO}} >= '${escapeFormula(filtros.desde)}'`);
  }
  if (filtros.hasta) {
    predicados.push(`{${F.FECHA_INICIO}} <= '${escapeFormula(filtros.hasta)}'`);
  }
  if (filtros.tipo) {
    predicados.push(`{${F.TIPO}} = '${escapeFormula(filtros.tipo)}'`);
  }
  if (filtros.estado) {
    predicados.push(`{${F.ESTADO}} = '${escapeFormula(filtros.estado)}'`);
  }
  if (filtros.idEmpleadoCore) {
    predicados.push(
      `{${F.ID_EMPLEADO_CORE}} = '${escapeFormula(filtros.idEmpleadoCore)}'`
    );
  }

  const formula = `AND(${predicados.join(", ")})`;
  const params = new URLSearchParams({
    filterByFormula: formula,
    returnFieldsByFieldId: "true",
    pageSize: "100",
  });

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medReubicacionesTableId)}?${params}`;
  const data = await airtableFetch(url);

  return data.records.map((r) => ({
    recordId: r.id,
    consecutivo: String(r.fields[F.CONSECUTIVO] || ""),
    tipo: r.fields[F.TIPO] as any,
    idEmpleadoCore: String(r.fields[F.ID_EMPLEADO_CORE] || ""),
    nombreEmpleado: String(r.fields[F.NOMBRE_EMPLEADO] || ""),
    numeroDocumento: String(r.fields[F.NUMERO_DOCUMENTO] || ""),
    cargoOrigen: String(r.fields[F.CARGO_ORIGEN] || ""),
    cargoDestino: String(r.fields[F.CARGO_DESTINO] || ""),
    fechaInicio: String(r.fields[F.FECHA_INICIO] || ""),
    fechaFinEstimada: (r.fields[F.FECHA_FIN_ESTIMADA] as string) || null,
    fechaCierre: (r.fields[F.FECHA_CIERRE] as string) || null,
    motivo: (r.fields[F.MOTIVO] as string) || null,
    restricciones: (r.fields[F.RESTRICCIONES] as string) || null,
    estado: r.fields[F.ESTADO] as any,
    rehabilitado: Boolean(r.fields[F.REHABILITADO]),
    documentoUrl: (r.fields[F.DOCUMENTO_URL] as string) || null,
    observaciones: (r.fields[F.OBSERVACIONES] as string) || null,
    activo: Boolean(r.fields[F.ACTIVO]),
    createdAt: String(r.fields[F.CREATED_AT] || r.createdTime || ""),
    updatedAt: String(r.fields[F.UPDATED_AT] || ""),
  }));
}

async function generarConsecutivoReubicacion(anio: number): Promise<string> {
  const F = airtableSGSSTConfig.medReubicacionesFields;
  const filtro = `AND(FIND('REU-${anio}-', {${F.CONSECUTIVO}}) > 0, {${F.ACTIVO}} = TRUE())`;
  const params = new URLSearchParams({
    filterByFormula: filtro,
    returnFieldsByFieldId: "true",
    pageSize: "100",
    "sort[0][field]": F.CONSECUTIVO,
    "sort[0][direction]": "desc",
  });

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medReubicacionesTableId)}?${params}`;
  const data = await airtableFetch(url);

  if (data.records.length === 0) {
    return `REU-${anio}-001`;
  }

  const ultimo = String(data.records[0].fields[F.CONSECUTIVO] || "");
  const match = ultimo.match(/REU-\d{4}-(\d+)/);
  if (!match) return `REU-${anio}-001`;

  const num = parseInt(match[1], 10) + 1;
  return `REU-${anio}-${String(num).padStart(3, "0")}`;
}

export async function crearReubicacion(
  payload: CrearReubicacionPayload
): Promise<Reubicacion> {
  const F = airtableSGSSTConfig.medReubicacionesFields;
  const anio = new Date().getFullYear();
  const consecutivo = await generarConsecutivoReubicacion(anio);
  const now = fechaISO();

  const fields: Record<string, unknown> = {
    [F.CONSECUTIVO]: consecutivo,
    [F.TIPO]: payload.tipo,
    [F.ID_EMPLEADO_CORE]: payload.idEmpleadoCore,
    [F.NOMBRE_EMPLEADO]: payload.nombreEmpleado,
    [F.NUMERO_DOCUMENTO]: payload.numeroDocumento,
    [F.CARGO_ORIGEN]: payload.cargoOrigen,
    [F.CARGO_DESTINO]: payload.cargoDestino,
    [F.FECHA_INICIO]: payload.fechaInicio,
    [F.ESTADO]: payload.estado || "Activa",
    [F.REHABILITADO]: false,
    [F.ACTIVO]: true,
    [F.CREATED_AT]: now,
    [F.UPDATED_AT]: now,
  };

  if (payload.fechaFinEstimada)
    fields[F.FECHA_FIN_ESTIMADA] = payload.fechaFinEstimada;
  if (payload.motivo) fields[F.MOTIVO] = payload.motivo;
  if (payload.restricciones) fields[F.RESTRICCIONES] = payload.restricciones;
  if (payload.observaciones) fields[F.OBSERVACIONES] = payload.observaciones;

  const url = getSGSSTUrl(airtableSGSSTConfig.medReubicacionesTableId);
  const body = JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false });
  const r = await airtableFetch<AirtableRecord>(url, {
    method: "POST",
    body,
  });

  return {
    recordId: r.id,
    consecutivo,
    tipo: payload.tipo,
    idEmpleadoCore: payload.idEmpleadoCore,
    nombreEmpleado: payload.nombreEmpleado,
    numeroDocumento: payload.numeroDocumento,
    cargoOrigen: payload.cargoOrigen,
    cargoDestino: payload.cargoDestino,
    fechaInicio: payload.fechaInicio,
    fechaFinEstimada: payload.fechaFinEstimada || null,
    fechaCierre: null,
    motivo: payload.motivo || null,
    restricciones: payload.restricciones || null,
    estado: payload.estado || "Activa",
    rehabilitado: false,
    documentoUrl: null,
    observaciones: payload.observaciones || null,
    activo: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function actualizarReubicacion(
  recordId: string,
  cambios: Partial<CrearReubicacionPayload> & {
    fechaCierre?: string;
    rehabilitado?: boolean;
  }
): Promise<void> {
  const F = airtableSGSSTConfig.medReubicacionesFields;
  const fields: Record<string, unknown> = {
    [F.UPDATED_AT]: fechaISO(),
  };

  if (cambios.tipo) fields[F.TIPO] = cambios.tipo;
  if (cambios.fechaInicio !== undefined) fields[F.FECHA_INICIO] = cambios.fechaInicio;
  if (cambios.fechaFinEstimada !== undefined)
    fields[F.FECHA_FIN_ESTIMADA] = cambios.fechaFinEstimada;
  if (cambios.fechaCierre !== undefined) fields[F.FECHA_CIERRE] = cambios.fechaCierre;
  if (cambios.motivo !== undefined) fields[F.MOTIVO] = cambios.motivo;
  if (cambios.restricciones !== undefined)
    fields[F.RESTRICCIONES] = cambios.restricciones;
  if (cambios.estado) fields[F.ESTADO] = cambios.estado;
  if (cambios.rehabilitado !== undefined)
    fields[F.REHABILITADO] = cambios.rehabilitado;
  if (cambios.observaciones !== undefined)
    fields[F.OBSERVACIONES] = cambios.observaciones;

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medReubicacionesTableId)}/${recordId}`;
  const body = JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false });
  await airtableFetch(url, { method: "PATCH", body });
}

export async function eliminarReubicacion(recordId: string): Promise<void> {
  const F = airtableSGSSTConfig.medReubicacionesFields;
  const fields = {
    [F.ACTIVO]: false,
    [F.UPDATED_AT]: fechaISO(),
  };

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medReubicacionesTableId)}/${recordId}`;
  await airtableFetch(url, {
    method: "PATCH",
    body: JSON.stringify({ fields, returnFieldsByFieldId: true }),
  });
}

// ══════════════════════════════════════════════════════════
// ENFERMEDADES LABORALES
// ══════════════════════════════════════════════════════════

export async function listarEnfermedadesLaborales(
  filtros: FiltrosEnfermedadesLaborales
): Promise<EnfermedadLaboral[]> {
  const F = airtableSGSSTConfig.medEnfermedadesLaboralesFields;
  const predicados: string[] = [`{${F.ACTIVO}} = TRUE()`];

  if (filtros.desde) {
    predicados.push(
      `{${F.FECHA_DIAGNOSTICO}} >= '${escapeFormula(filtros.desde)}'`
    );
  }
  if (filtros.hasta) {
    predicados.push(
      `{${F.FECHA_DIAGNOSTICO}} <= '${escapeFormula(filtros.hasta)}'`
    );
  }
  if (filtros.estado) {
    predicados.push(`{${F.ESTADO}} = '${escapeFormula(filtros.estado)}'`);
  }
  if (filtros.idEmpleadoCore) {
    predicados.push(
      `{${F.ID_EMPLEADO_CORE}} = '${escapeFormula(filtros.idEmpleadoCore)}'`
    );
  }

  const formula = `AND(${predicados.join(", ")})`;
  const params = new URLSearchParams({
    filterByFormula: formula,
    returnFieldsByFieldId: "true",
    pageSize: "100",
  });

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medEnfermedadesLaboralesTableId)}?${params}`;
  const data = await airtableFetch(url);

  return data.records.map((r) => ({
    recordId: r.id,
    consecutivo: String(r.fields[F.CONSECUTIVO] || ""),
    idEmpleadoCore: String(r.fields[F.ID_EMPLEADO_CORE] || ""),
    nombreEmpleado: String(r.fields[F.NOMBRE_EMPLEADO] || ""),
    numeroDocumento: String(r.fields[F.NUMERO_DOCUMENTO] || ""),
    cargo: String(r.fields[F.CARGO] || ""),
    diagnostico: (r.fields[F.DIAGNOSTICO] as string) || null,
    fechaDiagnostico: String(r.fields[F.FECHA_DIAGNOSTICO] || ""),
    fechaInicioSintomas: (r.fields[F.FECHA_INICIO_SINTOMAS] as string) || null,
    estado: r.fields[F.ESTADO] as any,
    entidadCalificadora: (r.fields[F.ENTIDAD_CALIFICADORA] as string) || null,
    fechaCalificacion: (r.fields[F.FECHA_CALIFICACION] as string) || null,
    pcl: (r.fields[F.PCL] as number) || null,
    fechaEstructuracion: (r.fields[F.FECHA_ESTRUCTURACION] as string) || null,
    documentoUrl: (r.fields[F.DOCUMENTO_URL] as string) || null,
    observaciones: (r.fields[F.OBSERVACIONES] as string) || null,
    activo: Boolean(r.fields[F.ACTIVO]),
    createdAt: String(r.fields[F.CREATED_AT] || r.createdTime || ""),
    updatedAt: String(r.fields[F.UPDATED_AT] || ""),
  }));
}

async function generarConsecutivoEnfermedadLaboral(anio: number): Promise<string> {
  const F = airtableSGSSTConfig.medEnfermedadesLaboralesFields;
  const filtro = `AND(FIND('EL-${anio}-', {${F.CONSECUTIVO}}) > 0, {${F.ACTIVO}} = TRUE())`;
  const params = new URLSearchParams({
    filterByFormula: filtro,
    returnFieldsByFieldId: "true",
    pageSize: "100",
    "sort[0][field]": F.CONSECUTIVO,
    "sort[0][direction]": "desc",
  });

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medEnfermedadesLaboralesTableId)}?${params}`;
  const data = await airtableFetch(url);

  if (data.records.length === 0) {
    return `EL-${anio}-001`;
  }

  const ultimo = String(data.records[0].fields[F.CONSECUTIVO] || "");
  const match = ultimo.match(/EL-\d{4}-(\d+)/);
  if (!match) return `EL-${anio}-001`;

  const num = parseInt(match[1], 10) + 1;
  return `EL-${anio}-${String(num).padStart(3, "0")}`;
}

export async function crearEnfermedadLaboral(
  payload: CrearEnfermedadLaboralPayload
): Promise<EnfermedadLaboral> {
  const F = airtableSGSSTConfig.medEnfermedadesLaboralesFields;
  const anio = new Date().getFullYear();
  const consecutivo = await generarConsecutivoEnfermedadLaboral(anio);
  const now = fechaISO();

  const fields: Record<string, unknown> = {
    [F.CONSECUTIVO]: consecutivo,
    [F.ID_EMPLEADO_CORE]: payload.idEmpleadoCore,
    [F.NOMBRE_EMPLEADO]: payload.nombreEmpleado,
    [F.NUMERO_DOCUMENTO]: payload.numeroDocumento,
    [F.CARGO]: payload.cargo,
    [F.FECHA_DIAGNOSTICO]: payload.fechaDiagnostico,
    [F.ESTADO]: payload.estado || "En proceso de calificación",
    [F.ACTIVO]: true,
    [F.CREATED_AT]: now,
    [F.UPDATED_AT]: now,
  };

  if (payload.diagnostico) fields[F.DIAGNOSTICO] = payload.diagnostico;
  if (payload.fechaInicioSintomas)
    fields[F.FECHA_INICIO_SINTOMAS] = payload.fechaInicioSintomas;
  if (payload.entidadCalificadora)
    fields[F.ENTIDAD_CALIFICADORA] = payload.entidadCalificadora;
  if (payload.fechaCalificacion)
    fields[F.FECHA_CALIFICACION] = payload.fechaCalificacion;
  if (payload.pcl !== undefined) fields[F.PCL] = payload.pcl;
  if (payload.fechaEstructuracion)
    fields[F.FECHA_ESTRUCTURACION] = payload.fechaEstructuracion;
  if (payload.observaciones) fields[F.OBSERVACIONES] = payload.observaciones;

  const url = getSGSSTUrl(airtableSGSSTConfig.medEnfermedadesLaboralesTableId);
  const body = JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false });
  const r = await airtableFetch<AirtableRecord>(url, {
    method: "POST",
    body,
  });

  return {
    recordId: r.id,
    consecutivo,
    idEmpleadoCore: payload.idEmpleadoCore,
    nombreEmpleado: payload.nombreEmpleado,
    numeroDocumento: payload.numeroDocumento,
    cargo: payload.cargo,
    diagnostico: payload.diagnostico || null,
    fechaDiagnostico: payload.fechaDiagnostico,
    fechaInicioSintomas: payload.fechaInicioSintomas || null,
    estado: payload.estado || "En proceso de calificación",
    entidadCalificadora: payload.entidadCalificadora || null,
    fechaCalificacion: payload.fechaCalificacion || null,
    pcl: payload.pcl || null,
    fechaEstructuracion: payload.fechaEstructuracion || null,
    documentoUrl: null,
    observaciones: payload.observaciones || null,
    activo: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function actualizarEnfermedadLaboral(
  recordId: string,
  cambios: Partial<CrearEnfermedadLaboralPayload>
): Promise<void> {
  const F = airtableSGSSTConfig.medEnfermedadesLaboralesFields;
  const fields: Record<string, unknown> = {
    [F.UPDATED_AT]: fechaISO(),
  };

  if (cambios.diagnostico !== undefined) fields[F.DIAGNOSTICO] = cambios.diagnostico;
  if (cambios.fechaDiagnostico !== undefined)
    fields[F.FECHA_DIAGNOSTICO] = cambios.fechaDiagnostico;
  if (cambios.fechaInicioSintomas !== undefined)
    fields[F.FECHA_INICIO_SINTOMAS] = cambios.fechaInicioSintomas;
  if (cambios.estado) fields[F.ESTADO] = cambios.estado;
  if (cambios.entidadCalificadora !== undefined)
    fields[F.ENTIDAD_CALIFICADORA] = cambios.entidadCalificadora;
  if (cambios.fechaCalificacion !== undefined)
    fields[F.FECHA_CALIFICACION] = cambios.fechaCalificacion;
  if (cambios.pcl !== undefined) fields[F.PCL] = cambios.pcl;
  if (cambios.fechaEstructuracion !== undefined)
    fields[F.FECHA_ESTRUCTURACION] = cambios.fechaEstructuracion;
  if (cambios.observaciones !== undefined)
    fields[F.OBSERVACIONES] = cambios.observaciones;

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medEnfermedadesLaboralesTableId)}/${recordId}`;
  const body = JSON.stringify({ fields, returnFieldsByFieldId: true, typecast: false });
  await airtableFetch(url, { method: "PATCH", body });
}

export async function eliminarEnfermedadLaboral(recordId: string): Promise<void> {
  const F = airtableSGSSTConfig.medEnfermedadesLaboralesFields;
  const fields = {
    [F.ACTIVO]: false,
    [F.UPDATED_AT]: fechaISO(),
  };

  const url = `${getSGSSTUrl(airtableSGSSTConfig.medEnfermedadesLaboralesTableId)}/${recordId}`;
  await airtableFetch(url, {
    method: "PATCH",
    body: JSON.stringify({ fields, returnFieldsByFieldId: true }),
  });
}

// ══════════════════════════════════════════════════════════
// INDICADORES DEL INFORME MENSUAL
// ══════════════════════════════════════════════════════════

export async function calcularIndicadoresMedicinaLaboral(
  desde: string,
  hasta: string,
  mes?: number,
  anio?: number
): Promise<IndicadoresMedicinaLaboral> {
  // Traer todas las entidades del periodo
  const [incapacidades, enfermedadesLab, reubicaciones, seguimientos] =
    await Promise.all([
      listarIncapacidades({ desde, hasta }),
      listarEnfermedadesLaborales({ desde, hasta }),
      listarReubicaciones({ desde, hasta }),
      listarSeguimientos({ desde, hasta }),
    ]);

  // Calcular indicadores
  const diasIncapacidadEnfermedadGeneral = incapacidades
    .filter((inc) => inc.tipo === "Enfermedad general")
    .reduce((sum, inc) => sum + inc.diasIncapacidad, 0);

  const enfermedadesLaboralesEnProceso = enfermedadesLab.filter(
    (el) => el.estado === "En proceso de calificación"
  ).length;

  const enfermedadesLaboralesReconocidas = enfermedadesLab.filter(
    (el) => el.estado === "Reconocida por ARL"
  ).length;

  const trabajadoresReubicadosTemporales = reubicaciones.filter(
    (r) => r.tipo === "Temporal"
  ).length;

  const trabajadoresReubicadosDefinitivos = reubicaciones.filter(
    (r) => r.tipo === "Definitiva"
  ).length;

  const trabajadoresRehabilitados = reubicaciones.filter(
    (r) => r.rehabilitado && r.fechaCierre && r.fechaCierre >= desde && r.fechaCierre <= hasta
  ).length;

  // Filas para el informe
  const filasSeguimientos = seguimientos.map((s) => ({
    nombreTrabajador: s.nombreEmpleado,
    tipoSeguimiento: s.tipoSeguimiento,
    observaciones: s.observaciones || "(sin observaciones)",
  }));

  const filasIncapacidades = incapacidades.map((inc) => ({
    nombreTrabajador: inc.nombreEmpleado,
    tipo: inc.tipo,
    diasIncapacidad: inc.diasIncapacidad,
    fechaInicio: inc.fechaInicio,
    fechaFin: inc.fechaFin,
  }));

  return {
    periodo: { desde, hasta, mes, anio },
    indicadores: {
      diasIncapacidadEnfermedadGeneral,
      enfermedadesLaboralesEnProceso,
      enfermedadesLaboralesReconocidas,
      trabajadoresReubicadosTemporales,
      trabajadoresReubicadosDefinitivos,
      trabajadoresRehabilitados,
    },
    filasSeguimientos,
    filasIncapacidades,
  };
}
