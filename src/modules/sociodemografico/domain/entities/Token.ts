/**
 * Entidad Token de Encuesta
 * Representa un link único de acceso a la encuesta para un colaborador
 */

export interface Token {
  /** Record ID de Airtable */
  id: string;

  /** UUID v4 único del token */
  token: string;

  /** ID de la campaña a la que pertenece */
  campanaId: string;

  /** Record ID del colaborador en la tabla Personal */
  personalId: string;

  /** Si el token ya fue usado (encuesta respondida) */
  usado: boolean;

  /** Fecha y hora en que fue usado el token */
  fechaUso?: Date;

  /** Timestamps */
  createdTime?: Date;
}

/**
 * Datos para generar tokens
 */
export interface GenerarTokensDTO {
  campanaId: string;
  personalIds: string[];
}

/**
 * Resultado de generación de token
 */
export interface TokenGenerado {
  personalId: string;
  token: string;
  link: string;
}

/**
 * Token con información del colaborador para envío
 */
export interface TokenConPersonal extends Token {
  nombreCompleto: string;
  correo: string;
  numeroDocumento: string;
}
