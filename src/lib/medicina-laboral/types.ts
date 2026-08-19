// ══════════════════════════════════════════════════════════
// Tipos del módulo de Medicina Laboral
// ══════════════════════════════════════════════════════════

// ── Exámenes Médicos ──────────────────────────────────────

export const TIPOS_EXAMEN = [
  "Ingreso",
  "Periódico",
  "Egreso",
  "Reintegro",
] as const;

export const ESTADOS_EXAMEN = ["Programado", "Realizado", "Cancelado"] as const;

export const CONCEPTOS_APTITUD = [
  "Apto",
  "Apto con restricciones",
  "No apto temporal",
  "No apto definitivo",
] as const;

export type TipoExamen = (typeof TIPOS_EXAMEN)[number];
export type EstadoExamen = (typeof ESTADOS_EXAMEN)[number];
export type ConceptoAptitud = (typeof CONCEPTOS_APTITUD)[number];

export interface ExamenMedico {
  recordId: string;
  consecutivo: string;
  fechaExamen: string; // YYYY-MM-DD
  tipoExamen: TipoExamen;
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargo: string;
  ipsEntidad: string | null;
  conceptoAptitud: ConceptoAptitud | null;
  restricciones: string | null;
  recomendaciones: string | null;
  estado: EstadoExamen;
  fechaProgramada: string | null; // YYYY-MM-DD
  documentoUrl: string | null;
  observaciones: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrearExamenPayload {
  fechaExamen: string;
  tipoExamen: TipoExamen;
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargo: string;
  ipsEntidad?: string;
  conceptoAptitud?: ConceptoAptitud;
  restricciones?: string;
  recomendaciones?: string;
  estado?: EstadoExamen;
  fechaProgramada?: string;
  observaciones?: string;
}

export interface FiltrosExamenes {
  desde?: string;
  hasta?: string;
  tipoExamen?: TipoExamen;
  idEmpleadoCore?: string;
  estado?: EstadoExamen;
}

// ── Seguimientos Médicos ──────────────────────────────────

export const TIPOS_SEGUIMIENTO = [
  "Restricción médica",
  "Control periódico",
  "Valoración especializada",
  "Otro",
] as const;

export type TipoSeguimiento = (typeof TIPOS_SEGUIMIENTO)[number];

export interface SeguimientoMedico {
  recordId: string;
  consecutivo: string;
  fechaSeguimiento: string; // YYYY-MM-DD
  tipoSeguimiento: TipoSeguimiento;
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargo: string;
  diagnostico: string | null;
  accionesRealizadas: string | null;
  recomendaciones: string | null;
  proximaCita: string | null; // YYYY-MM-DD
  documentoUrl: string | null;
  observaciones: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrearSeguimientoPayload {
  fechaSeguimiento: string;
  tipoSeguimiento: TipoSeguimiento;
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargo: string;
  diagnostico?: string;
  accionesRealizadas?: string;
  recomendaciones?: string;
  proximaCita?: string;
  observaciones?: string;
}

export interface FiltrosSeguimientos {
  desde?: string;
  hasta?: string;
  idEmpleadoCore?: string;
  tipoSeguimiento?: TipoSeguimiento;
}

// ── Incapacidades ─────────────────────────────────────────

export const TIPOS_INCAPACIDAD = [
  "Enfermedad general",
  "Enfermedad laboral",
  "Accidente de trabajo",
  "Licencia maternidad",
  "Licencia paternidad",
] as const;

export type TipoIncapacidad = (typeof TIPOS_INCAPACIDAD)[number];

export interface Incapacidad {
  recordId: string;
  consecutivo: string;
  tipo: TipoIncapacidad;
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargo: string;
  diagnostico: string | null;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  diasIncapacidad: number;
  entidadEmisora: string | null;
  numeroIncapacidad: string | null;
  prorroga: boolean;
  incapacidadOrigenRecordId: string | null;
  documentoUrl: string | null;
  observaciones: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrearIncapacidadPayload {
  tipo: TipoIncapacidad;
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargo: string;
  diagnostico?: string;
  fechaInicio: string;
  fechaFin: string;
  entidadEmisora?: string;
  numeroIncapacidad?: string;
  prorroga?: boolean;
  incapacidadOrigenRecordId?: string;
  observaciones?: string;
}

export interface FiltrosIncapacidades {
  desde?: string;
  hasta?: string;
  tipo?: TipoIncapacidad;
  idEmpleadoCore?: string;
}

// ── Reubicaciones ─────────────────────────────────────────

export const TIPOS_REUBICACION = ["Temporal", "Definitiva"] as const;

export const ESTADOS_REUBICACION = ["Activa", "Rehabilitado", "Cerrada"] as const;

export type TipoReubicacion = (typeof TIPOS_REUBICACION)[number];
export type EstadoReubicacion = (typeof ESTADOS_REUBICACION)[number];

export interface Reubicacion {
  recordId: string;
  consecutivo: string;
  tipo: TipoReubicacion;
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargoOrigen: string;
  cargoDestino: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFinEstimada: string | null; // YYYY-MM-DD
  fechaCierre: string | null; // YYYY-MM-DD
  motivo: string | null;
  restricciones: string | null;
  estado: EstadoReubicacion;
  rehabilitado: boolean;
  documentoUrl: string | null;
  observaciones: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrearReubicacionPayload {
  tipo: TipoReubicacion;
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargoOrigen: string;
  cargoDestino: string;
  fechaInicio: string;
  fechaFinEstimada?: string;
  motivo?: string;
  restricciones?: string;
  estado?: EstadoReubicacion;
  observaciones?: string;
}

export interface FiltrosReubicaciones {
  desde?: string;
  hasta?: string;
  tipo?: TipoReubicacion;
  idEmpleadoCore?: string;
  estado?: EstadoReubicacion;
}

// ── Enfermedades Laborales ────────────────────────────────

export const ESTADOS_ENFERMEDAD_LABORAL = [
  "En proceso de calificación",
  "Reconocida por ARL",
  "Objetada",
  "En junta de calificación",
  "Cerrada",
] as const;

export type EstadoEnfermedadLaboral = (typeof ESTADOS_ENFERMEDAD_LABORAL)[number];

export interface EnfermedadLaboral {
  recordId: string;
  consecutivo: string;
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargo: string;
  diagnostico: string | null;
  fechaDiagnostico: string; // YYYY-MM-DD
  fechaInicioSintomas: string | null; // YYYY-MM-DD
  estado: EstadoEnfermedadLaboral;
  entidadCalificadora: string | null;
  fechaCalificacion: string | null; // YYYY-MM-DD
  pcl: number | null; // Porcentaje de pérdida de capacidad laboral
  fechaEstructuracion: string | null; // YYYY-MM-DD
  documentoUrl: string | null;
  observaciones: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrearEnfermedadLaboralPayload {
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargo: string;
  diagnostico?: string;
  fechaDiagnostico: string;
  fechaInicioSintomas?: string;
  estado?: EstadoEnfermedadLaboral;
  entidadCalificadora?: string;
  fechaCalificacion?: string;
  pcl?: number;
  fechaEstructuracion?: string;
  observaciones?: string;
}

export interface FiltrosEnfermedadesLaborales {
  desde?: string;
  hasta?: string;
  estado?: EstadoEnfermedadLaboral;
  idEmpleadoCore?: string;
}

// ── Indicadores del Informe ───────────────────────────────

export interface IndicadoresMedicinaLaboral {
  periodo: {
    desde: string;
    hasta: string;
    mes?: number;
    anio?: number;
  };
  indicadores: {
    diasIncapacidadEnfermedadGeneral: number;
    enfermedadesLaboralesEnProceso: number;
    enfermedadesLaboralesReconocidas: number;
    trabajadoresReubicadosTemporales: number;
    trabajadoresReubicadosDefinitivos: number;
    trabajadoresRehabilitados: number;
  };
  filasSeguimientos: Array<{
    nombreTrabajador: string;
    tipoSeguimiento: string;
    observaciones: string;
  }>;
  filasIncapacidades: Array<{
    nombreTrabajador: string;
    tipo: string;
    diasIncapacidad: number;
    fechaInicio: string;
    fechaFin: string;
  }>;
}
