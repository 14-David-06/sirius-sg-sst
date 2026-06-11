/**
 * Entidad Informe PDF Sociodemográfico
 * Representa un informe corporativo generado
 */

export interface Informe {
  /** Record ID de Airtable */
  id: string;

  /** ID de la campaña */
  campanaId: string;

  /** URL del PDF en Cloudflare R2 */
  urlPdf: string;

  /** Usuario SST que generó el informe */
  generadoPor: string;

  /** Total de respuestas incluidas en el informe */
  totalRespuestas: number;

  /** Timestamps */
  createdTime?: Date;
}

/**
 * DTO para generar informe
 */
export interface GenerarInformeDTO {
  campanaId: string;
  generadoPor: string;
}

/**
 * Estadísticas para el informe
 */
export interface EstadisticasCampana {
  totalRespuestas: number;

  // Distribuciones
  genero: Record<string, number>;
  estadoCivil: Record<string, number>;
  estrato: Record<string, number>;
  tipoVivienda: Record<string, number>;
  personasACargo: Record<string, number>;
  escolaridad: Record<string, number>;
  areaTrabajo: Record<string, number>;
  tipoContrato: Record<string, number>;
  turnoTrabajo: Record<string, number>;
  fuma: Record<string, number>;
  alcohol: Record<string, number>;
  medioTransporte: Record<string, number>;
  tiempoDesplazamiento: Record<string, number>;

  // Indicadores booleanos
  estudiandoActualmente: { si: number; no: number };
  otroEmpleo: { si: number; no: number };
  enfermedadCronica: { si: number; no: number };
  discapacidad: { si: number; no: number };
  tratamientoMedico: { si: number; no: number };
  accidentesTrabajoPrevios: { si: number; no: number };
  enfermedadLaboralPrevia: { si: number; no: number };
  practicaDeporte: { si: number; no: number };
}

/**
 * Datos para pirámide poblacional
 */
export interface PiramidePoblacional {
  rangos: Array<{
    rango: string;
    Masculino: number;
    Femenino: number;
    Otro: number;
  }>;
}
