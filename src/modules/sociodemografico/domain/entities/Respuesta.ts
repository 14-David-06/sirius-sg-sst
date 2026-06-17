/**
 * Entidad Respuesta de Encuesta Sociodemográfica
 * Representa las respuestas inmutables de un colaborador
 */

// Tipos para campos single select
export type Genero = "Masculino" | "Femenino" | "No_binario" | "Prefiero_no_decir";
export type EstadoCivil = "Soltero" | "Casado" | "Union_libre" | "Divorciado" | "Viudo";
export type Estrato = "1" | "2" | "3" | "4" | "5" | "6";
export type TipoVivienda = "Propia" | "Arrendada" | "Familiar";
export type PersonasACargo = "Ninguna" | "1" | "2" | "3" | "4_o_mas";
export type Escolaridad = "Primaria" | "Bachillerato" | "Tecnico_Tecnologo" | "Profesional" | "Posgrado";
export type AreaTrabajo = "Pirolisis" | "Laboratorio" | "Bodega" | "Administrativo";
export type TipoContrato = "Termino_fijo" | "Termino_indefinido" | "Prestacion_servicios" | "Aprendiz";
export type JornadaTrabajo = "Jornada_completa" | "Media_jornada" | "Rotativo" | "Por_turnos";
export type Fuma = "Si" | "No" | "Exfumador";
export type Alcohol = "Nunca" | "Ocasionalmente" | "Frecuentemente";
export type TiempoLibre =
  | "Familia_amigos"
  | "Deportes"
  | "Leer"
  | "Musica"
  | "Videojuegos"
  | "Series_peliculas"
  | "Actividades_religiosas"
  | "Otro";
export type MedioTransporte =
  | "A_pie"
  | "Bus_Transmilenio"
  | "Bicicleta"
  | "Moto"
  | "Carro_particular"
  | "Ruta_empresa";
export type TiempoDesplazamiento = "Menos_30min" | "30_60min" | "1_2horas" | "Mas_2horas";

// Arrays de valores válidos para validación
export const MEDIOS_TRANSPORTE_VALIDOS: MedioTransporte[] = [
  "A_pie",
  "Bus_Transmilenio",
  "Bicicleta",
  "Moto",
  "Carro_particular",
  "Ruta_empresa",
];

export const TIEMPOS_DESPLAZAMIENTO_VALIDOS: TiempoDesplazamiento[] = [
  "Menos_30min",
  "30_60min",
  "1_2horas",
  "Mas_2horas",
];

export interface Respuesta {
  /** Record ID de Airtable */
  id: string;

  /** ID del token usado */
  tokenId: string;

  /** ID de la campaña */
  campanaId: string;

  /** Record ID del colaborador */
  personalId: string;

  // ── Sección 1: Datos Personales ──
  nombreCompleto: string;
  numeroDocumento: string;
  fechaNacimiento: Date;
  genero: Genero;
  estadoCivil: EstadoCivil;

  // ── Sección 2: Vivienda ──
  municipioResidencia: string;
  estrato: Estrato;
  tipoVivienda: TipoVivienda;
  personasACargo: PersonasACargo;

  // ── Sección 3: Educación ──
  escolaridad: Escolaridad;
  estudiandoActualmente: boolean;
  carreraActual?: string;

  // ── Sección 4: Trabajo ──
  areaTrabajo: AreaTrabajo;
  cargo: string;
  tipoContrato: TipoContrato;
  fechaIngresoSirius: Date;
  turnoTrabajo: JornadaTrabajo;
  otroEmpleo: boolean;
  descripcionOtroEmpleo?: string;

  // ── Sección 5: Salud ──
  enfermedadCronica: boolean;
  cualEnfermedadCronica?: string;
  discapacidad: boolean;
  cualDiscapacidad?: string;
  tratamientoMedico: boolean;
  descripcionTratamiento?: string;
  accidentesTrabajoPrevios: boolean;
  descripcionAccidentes?: string;
  enfermedadLaboralPrevia: boolean;
  descripcionEnfLaboral?: string;

  // ── Sección 6: Hábitos ──
  fuma: Fuma;
  alcohol: Alcohol;
  practicaDeporte: boolean;
  cualDeporte?: string;
  tiempoLibre: TiempoLibre[];
  descripcionOtroTiempoLibre?: string;

  // ── Sección 7: Transporte ──
  medioTransporte: MedioTransporte;
  tiempoDesplazamiento: TiempoDesplazamiento;

  // ── Consentimiento (Ley 1581/2012) ──
  aceptaPoliticaDatos: boolean;
  firmaVeracidad: boolean;

  // ── Firma Digital ──
  /** Firma cifrada (AES) con formato: {signature: dataUrl, timestamp: ISO} */
  firma?: string;

  /** Timestamps */
  createdTime?: Date;
}

/**
 * DTO para guardar respuesta (desde formulario público)
 */
export interface GuardarRespuestaDTO {
  token: string;

  // Sección 1
  nombreCompleto: string;
  numeroDocumento: string;
  fechaNacimiento: string; // ISO date string
  genero: Genero;
  estadoCivil: EstadoCivil;

  // Sección 2
  municipioResidencia: string;
  estrato: Estrato;
  tipoVivienda: TipoVivienda;
  personasACargo: PersonasACargo;

  // Sección 3
  escolaridad: Escolaridad;
  estudiandoActualmente: boolean;
  carreraActual?: string;

  // Sección 4
  areaTrabajo: AreaTrabajo;
  cargo: string;
  tipoContrato: TipoContrato;
  fechaIngresoSirius: string; // ISO date string
  turnoTrabajo: JornadaTrabajo;
  otroEmpleo: boolean;
  descripcionOtroEmpleo?: string;

  // Sección 5
  enfermedadCronica: boolean;
  cualEnfermedadCronica?: string;
  discapacidad: boolean;
  cualDiscapacidad?: string;
  tratamientoMedico: boolean;
  descripcionTratamiento?: string;
  accidentesTrabajoPrevios: boolean;
  descripcionAccidentes?: string;
  enfermedadLaboralPrevia: boolean;
  descripcionEnfLaboral?: string;

  // Sección 6
  fuma: Fuma;
  alcohol: Alcohol;
  practicaDeporte: boolean;
  cualDeporte?: string;
  tiempoLibre: TiempoLibre[];
  descripcionOtroTiempoLibre?: string;

  // Sección 7
  medioTransporte: MedioTransporte;
  tiempoDesplazamiento: TiempoDesplazamiento;

  // Consentimiento
  aceptaPoliticaDatos: boolean;
  firmaVeracidad: boolean;

  // Firma digital cifrada (formato AES: iv:encrypted)
  firma: string;
}
