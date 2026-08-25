// ══════════════════════════════════════════════════════════
// Tipos compartidos — Inspecciones de equipos de emergencia
// Cubre botiquín, extintor, camilla y kit de derrames.
// ══════════════════════════════════════════════════════════

/** Los cuatro tipos de inspección específica de emergencia. */
export type TipoInspeccion = "botiquin" | "extintor" | "camilla" | "kit-derrames";

/**
 * Forma del detalle de la inspección:
 * - `elementos`: una fila por elemento del catálogo (botiquín, camilla, kit).
 * - `criterios`: una fila por equipo, con criterios de verificación (extintor).
 */
export type FormaDetalle = "elementos" | "criterios";

export const ESTADOS_ELEMENTO = ["Bueno", "Regular", "Malo", "Faltante"] as const;
export type EstadoElemento = (typeof ESTADOS_ELEMENTO)[number];

export const ESTADOS_CRITERIO = ["Cumple", "No cumple", "No aplica"] as const;
export type EstadoCriterio = (typeof ESTADOS_CRITERIO)[number];

export const ESTADOS_INSPECCION = ["Borrador", "Completada", "Firmada"] as const;
export type EstadoInspeccion = (typeof ESTADOS_INSPECCION)[number];

export const TIPOS_RESPONSABLE = [
  "Inspector",
  "Responsable SG-SST",
  "COPASST",
] as const;
export type TipoResponsable = (typeof TIPOS_RESPONSABLE)[number];

// ── Payloads de entrada ───────────────────────────────────

/** Detalle por elemento de catálogo (botiquín, camilla, kit de derrames). */
export interface DetalleElementoPayload {
  /** recordId del equipo en su catálogo (botiquín, camilla o kit). */
  equipoRecordId: string;
  /** recordId del elemento en el catálogo de elementos. */
  elementoRecordId: string;
  estadoElemento: EstadoElemento;
  cantidad: number;
  /** Solo aplica donde el catálogo lo soporta (botiquín, kit de derrames). */
  fechaVencimiento?: string;
  observaciones?: string;
}

/** Detalle por criterios de verificación (extintor). */
export interface DetalleCriteriosPayload {
  /** recordId del extintor en su catálogo. */
  equipoRecordId: string;
  /** Mapa criterio → estado. Las claves válidas las define la config del tipo. */
  criterios: Record<string, EstadoCriterio>;
  observaciones?: string;
}

export type DetallePayload = DetalleElementoPayload | DetalleCriteriosPayload;

export interface ResponsablePayload {
  tipo: TipoResponsable;
  nombre: string;
  cargo: string;
}

/** Verificaciones de procedimiento — solo kit de derrames. */
export interface VerificacionesPayload {
  conoceProcedimiento: boolean;
  almacenamientoAdecuado: boolean;
  rotuladoSenalizado: boolean;
}

export interface CrearInspeccionPayload {
  fechaInspeccion: string;
  inspector: string;
  cargoInspector: string;
  observacionesGenerales?: string;
  estado?: EstadoInspeccion;
  detalles: DetallePayload[];
  responsables: ResponsablePayload[];
  verificaciones?: VerificacionesPayload;
}

// ── Salidas ───────────────────────────────────────────────

export interface InspeccionResumen {
  recordId: string;
  idInspeccion: string;
  tipo: TipoInspeccion;
  fecha: string;
  inspector: string;
  cargoInspector: string | null;
  estado: string;
  observaciones: string | null;
  urlDocumento: string | null;
  detallesCount: number;
}

export interface ItemCatalogo {
  recordId: string;
  codigo: string;
  nombre: string;
  ubicacion: string | null;
}

export interface ElementoCatalogo {
  recordId: string;
  codigo: string;
  nombre: string;
  unidad: string | null;
  requiereVencimiento: boolean;
}

export interface FiltrosInspecciones {
  desde?: string;
  hasta?: string;
  estado?: string;
}
