/**
 * Entidad Campaña de Perfil Sociodemográfico
 * Representa una campaña semestral de recolección de datos
 */

export type PeriodoCampana = "Semestre_1" | "Semestre_2";
export type EstadoCampana = "Activa" | "Cerrada";

export interface Campana {
  /** Record ID de Airtable */
  id: string;

  /** Nombre descriptivo de la campaña */
  nombre: string;

  /** Semestre de la campaña */
  periodo: PeriodoCampana;

  /** Año de la campaña */
  año: number;

  /** Estado actual de la campaña */
  estado: EstadoCampana;

  /** Fecha de inicio de la campaña */
  fechaInicio: Date;

  /** Fecha de cierre de la campaña (opcional) */
  fechaCierre?: Date;

  /** Usuario SST que creó la campaña */
  creadoPor: string;

  /** ID generado automáticamente (SOCIO-XXXX) */
  idCampana?: string;

  /** Número de tokens generados para esta campaña */
  tokensGenerados?: number;

  /** Número de respuestas completadas */
  respuestasCompletadas?: number;

  /** Timestamps */
  createdTime?: Date;
}

/**
 * Datos para crear una nueva campaña
 */
export interface CrearCampanaDTO {
  nombre: string;
  periodo: PeriodoCampana;
  año: number;
  fechaInicio: Date;
  creadoPor: string;
}

/**
 * Datos para cerrar una campaña
 */
export interface CerrarCampanaDTO {
  campanaId: string;
  fechaCierre: Date;
}
