// ══════════════════════════════════════════════════════════
// Tipos del módulo Incidentes y Accidentes de Trabajo
// Decreto 1072/2015 · Resolución 1401/2007
// Tablas: at_eventos, at_investigaciones, at_acciones, at_reportes
// ══════════════════════════════════════════════════════════

// ── Catálogos (deben coincidir con los singleSelect de Airtable) ──

export const TIPOS_EVENTO = [
  "Accidente de trabajo",
  "Incidente de trabajo",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const MECANISMOS = [
  "Caída de personas",
  "Caída de objetos",
  "Pisada, choque o golpe",
  "Atrapamiento",
  "Sobreesfuerzo",
  "Contacto con electricidad",
  "Contacto con temperatura extrema",
  "Contacto con sustancias químicas",
  "Exposición a ruido o vibración",
  "Accidente de tránsito",
  "Agresión o violencia",
  "Otro",
] as const;
export type Mecanismo = (typeof MECANISMOS)[number];

export const TIPOS_LESION = [
  "Sin lesión",
  "Golpe o contusión",
  "Herida",
  "Fractura",
  "Quemadura",
  "Lesión ocular",
  "Esguince o torcedura",
  "Amputación",
  "Intoxicación",
  "Trauma superficial",
  "Otro",
] as const;
export type TipoLesion = (typeof TIPOS_LESION)[number];

export const PARTES_CUERPO = [
  "Cabeza",
  "Ojos",
  "Cuello",
  "Tronco",
  "Espalda",
  "Miembros superiores",
  "Manos",
  "Miembros inferiores",
  "Pies",
  "Múltiples partes",
  "Otro",
] as const;
export type ParteCuerpo = (typeof PARTES_CUERPO)[number];

export const ESTADOS_ARL = [
  "Pendiente de reporte",
  "Reportado a ARL",
  "Reconocido por ARL",
  "Objetado por ARL",
  "En junta de calificación",
] as const;
export type EstadoARL = (typeof ESTADOS_ARL)[number];

export const ESTADOS_EVENTO = ["Abierto", "En investigación", "Cerrado"] as const;
export type EstadoEvento = (typeof ESTADOS_EVENTO)[number];

export const METODOLOGIAS = [
  "Árbol de causas",
  "Espina de pescado (Ishikawa)",
  "Cinco por qués",
  "Análisis de causa raíz",
  "Otra",
] as const;
export type Metodologia = (typeof METODOLOGIAS)[number];

export const ESTADOS_INVESTIGACION = [
  "Borrador",
  "Completada",
  "Enviada a ARL",
] as const;
export type EstadoInvestigacion = (typeof ESTADOS_INVESTIGACION)[number];

export const TIPOS_ACCION = ["Preventiva", "Correctiva"] as const;
export type TipoAccion = (typeof TIPOS_ACCION)[number];

export const JERARQUIAS_CONTROL = [
  "Eliminación",
  "Sustitución",
  "Control de ingeniería",
  "Control administrativo",
  "Elemento de protección personal",
] as const;
export type JerarquiaControl = (typeof JERARQUIAS_CONTROL)[number];

export const TIPOS_RESPONSABLE = [
  "Empresa",
  "Trabajador",
  "Contratista",
  "ARL",
] as const;
export type TipoResponsable = (typeof TIPOS_RESPONSABLE)[number];

export const ESTADOS_ACCION = [
  "Pendiente",
  "En proceso",
  "Cerrada",
  "Vencida",
] as const;
export type EstadoAccion = (typeof ESTADOS_ACCION)[number];

export const TIPOS_REPORTE = [
  "Casi accidente",
  "Acto inseguro",
  "Condición insegura",
] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];

export const NIVELES_RIESGO = ["Bajo", "Medio", "Alto", "Crítico"] as const;
export type NivelRiesgo = (typeof NIVELES_RIESGO)[number];

export const ESTADOS_REPORTE = ["Abierto", "En gestión", "Cerrado"] as const;
export type EstadoReporte = (typeof ESTADOS_REPORTE)[number];

// ── Entidades ─────────────────────────────────────────────

export interface EventoAT {
  recordId: string;
  idEvento: string;
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento: string;
  cargo: string;
  tipoEvento: TipoEvento | "";
  fechaEvento: string; // YYYY-MM-DD
  horaEvento: string;
  lugarArea: string;
  descripcion: string;
  mecanismo: Mecanismo | "";
  tipoLesion: TipoLesion | "";
  parteCuerpo: ParteCuerpo[];
  causaPrincipal: string;
  conLesion: boolean;
  grave: boolean;
  mortal: boolean;
  diasIncapacidad: number;
  fechaInicioIncapacidad: string | null;
  fechaFinIncapacidad: string | null;
  estadoARL: EstadoARL | "";
  fechaReporteARL: string | null;
  numeroFURAT: string;
  estado: EstadoEvento | "";
  evidencias: string[];
  observaciones: string;
  createdAt: string | null;
  updatedAt: string | null;
  tieneInvestigacion: boolean;
}

export interface InvestigacionAT {
  recordId: string;
  idInvestigacion: string;
  eventoRecordId: string | null;
  fechaInvestigacion: string | null;
  equipoInvestigador: string;
  metodologia: Metodologia | "";
  causasInmediatasActos: string;
  causasInmediatasCondiciones: string;
  causasBasicasPersonales: string;
  causasBasicasLaborales: string;
  conclusiones: string;
  fechaEnvioARL: string | null;
  estado: EstadoInvestigacion | "";
  documentoUrl: string;
  observaciones: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AccionAT {
  recordId: string;
  idAccion: string;
  investigacionRecordId: string | null;
  eventoRecordId: string | null;
  tipo: TipoAccion | "";
  jerarquiaControl: JerarquiaControl | "";
  descripcion: string;
  responsableNombre: string;
  responsableTipo: TipoResponsable | "";
  fechaEjecucion: string | null;
  fechaCierre: string | null;
  estado: EstadoAccion | "";
  evidencias: string[];
  observaciones: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ReporteCondicion {
  recordId: string;
  idReporte: string;
  tipo: TipoReporte | "";
  fechaReporte: string;
  reportanteIdCore: string;
  reportanteNombre: string;
  areaLugar: string;
  descripcion: string;
  nivelRiesgo: NivelRiesgo | "";
  accionInmediata: string;
  responsableNombre: string;
  estado: EstadoReporte | "";
  fechaCierre: string | null;
  evidencias: string[];
  observaciones: string;
  createdAt: string | null;
  updatedAt: string | null;
}

// ── Payloads de escritura ─────────────────────────────────

export interface CrearEventoPayload {
  idEmpleadoCore: string;
  nombreEmpleado: string;
  numeroDocumento?: string;
  cargo?: string;
  tipoEvento: TipoEvento;
  fechaEvento: string;
  horaEvento?: string;
  lugarArea?: string;
  descripcion: string;
  mecanismo?: Mecanismo;
  tipoLesion?: TipoLesion;
  parteCuerpo?: ParteCuerpo[];
  causaPrincipal?: string;
  conLesion?: boolean;
  grave?: boolean;
  mortal?: boolean;
  diasIncapacidad?: number;
  fechaInicioIncapacidad?: string | null;
  fechaFinIncapacidad?: string | null;
  estadoARL?: EstadoARL;
  fechaReporteARL?: string | null;
  numeroFURAT?: string;
  estado?: EstadoEvento;
  evidencias?: string[];
  observaciones?: string;
}

export type ActualizarEventoPayload = Partial<CrearEventoPayload>;

export interface CrearInvestigacionPayload {
  eventoRecordId: string;
  fechaInvestigacion?: string;
  equipoInvestigador?: string;
  metodologia?: Metodologia;
  causasInmediatasActos?: string;
  causasInmediatasCondiciones?: string;
  causasBasicasPersonales?: string;
  causasBasicasLaborales?: string;
  conclusiones?: string;
  fechaEnvioARL?: string | null;
  estado?: EstadoInvestigacion;
  documentoUrl?: string;
  observaciones?: string;
}

export type ActualizarInvestigacionPayload = Partial<
  Omit<CrearInvestigacionPayload, "eventoRecordId">
>;

export interface CrearAccionPayload {
  investigacionRecordId?: string;
  eventoRecordId?: string;
  tipo: TipoAccion;
  jerarquiaControl?: JerarquiaControl;
  descripcion: string;
  responsableNombre?: string;
  responsableTipo?: TipoResponsable;
  fechaEjecucion?: string | null;
  fechaCierre?: string | null;
  estado?: EstadoAccion;
  evidencias?: string[];
  observaciones?: string;
}

export type ActualizarAccionPayload = Partial<CrearAccionPayload>;

export interface CrearReportePayload {
  tipo: TipoReporte;
  fechaReporte: string;
  reportanteIdCore?: string;
  reportanteNombre?: string;
  areaLugar?: string;
  descripcion: string;
  nivelRiesgo?: NivelRiesgo;
  accionInmediata?: string;
  responsableNombre?: string;
  estado?: EstadoReporte;
  fechaCierre?: string | null;
  evidencias?: string[];
  observaciones?: string;
}

export type ActualizarReportePayload = Partial<CrearReportePayload>;

// ── Filtros de consulta ───────────────────────────────────

export interface FiltrosPeriodo {
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
}

export interface FiltrosEventos extends FiltrosPeriodo {
  tipoEvento?: TipoEvento;
  estado?: EstadoEvento;
  idEmpleadoCore?: string;
}

export interface FiltrosReportes extends FiltrosPeriodo {
  tipo?: TipoReporte;
  estado?: EstadoReporte;
}

// ── Indicadores del informe mensual ───────────────────────

/**
 * Estadísticas legales del informe de gestión SST que este módulo
 * puede calcular. Los indicadores de enfermedad laboral, ausentismo
 * por enfermedad general, reubicaciones y rehabilitaciones dependen
 * del módulo de medicina laboral (pendiente).
 */
export interface IndicadoresAccidentes {
  periodo: { desde: string; hasta: string };
  accidentesReconocidosARL: number;
  accidentesObjetadosARL: number;
  accidentesGraves: number;
  accidentesFatales: number;
  diasIncapacidadAT: number;
  casiAccidentes: number;
  actosInseguros: number;
  condicionesInseguras: number;
  // Complementarios (no exigidos en la tabla legal pero útiles)
  totalAccidentes: number;
  totalIncidentes: number;
  accidentesConLesion: number;
  investigacionesRealizadas: number;
  accionesCerradas: number;
  accionesPendientes: number;
}

/** Fila de la tabla "Gestión de Accidentes de Trabajo con lesión" */
export interface FilaAccidenteInforme {
  nombreTrabajador: string;
  fechaEvento: string;
  tipoLesion: string;
  causaPrincipal: string;
  diasIncapacidad: number;
  accidenteGrave: boolean;
}

/** Fila de la tabla "Gestión Investigación de accidentes de Trabajo" */
export interface FilaInvestigacionInforme {
  nombreTrabajador: string;
  accionPreventiva: string;
  accionCorrectiva: string;
  fechaEjecucion: string;
  responsable: string;
}
