/**
 * Configuración de Airtable para el módulo Sociodemográfico
 * Centraliza todos los Table IDs y Field IDs
 */

if (!process.env.AIRTABLE_SOCIO_BASE_ID) {
  throw new Error("AIRTABLE_SOCIO_BASE_ID no está definido");
}

export const SOCIO_CONFIG = {
  baseId: process.env.AIRTABLE_SOCIO_BASE_ID,
  apiToken: process.env.AIRTABLE_SGSST_API_TOKEN!,

  // ─── Tabla: socio_campanas ───
  campanas: {
    tableId: process.env.AIRTABLE_SOCIO_CAMPANAS_TABLE_ID!,
    fields: {
      NOMBRE: process.env.AIRTABLE_SOCIO_CAMPANAS_NOMBRE!,
      PERIODO: process.env.AIRTABLE_SOCIO_CAMPANAS_PERIODO!,
      ANO: process.env.AIRTABLE_SOCIO_CAMPANAS_ANO!,
      ESTADO: process.env.AIRTABLE_SOCIO_CAMPANAS_ESTADO!,
      FECHA_INICIO: process.env.AIRTABLE_SOCIO_CAMPANAS_FECHA_INICIO!,
      FECHA_CIERRE: process.env.AIRTABLE_SOCIO_CAMPANAS_FECHA_CIERRE!,
      CREADO_POR: process.env.AIRTABLE_SOCIO_CAMPANAS_CREADO_POR!,
      // Back-links: arrays de record IDs de tokens/respuestas vinculados
      TOKENS_LINK: process.env.AIRTABLE_SOCIO_CAMPANAS_TOKENS_LINK!,
      RESPUESTAS_LINK: process.env.AIRTABLE_SOCIO_CAMPANAS_RESPUESTAS_LINK!,
    },
  },

  // ─── Tabla: socio_tokens ───
  tokens: {
    tableId: process.env.AIRTABLE_SOCIO_TOKENS_TABLE_ID!,
    fields: {
      TOKEN: process.env.AIRTABLE_SOCIO_TOKENS_TOKEN!,
      CAMPANA: process.env.AIRTABLE_SOCIO_TOKENS_CAMPANA!,
      PERSONAL: process.env.AIRTABLE_SOCIO_TOKENS_PERSONAL!,
      USADO: process.env.AIRTABLE_SOCIO_TOKENS_USADO!,
      FECHA_USO: process.env.AIRTABLE_SOCIO_TOKENS_FECHA_USO!,
      // Back-link: array de record IDs de respuestas vinculadas
      RESPUESTAS_LINK: process.env.AIRTABLE_SOCIO_TOKENS_RESPUESTAS_LINK!,
    },
  },

  // ─── Tabla: socio_respuestas ───
  respuestas: {
    tableId: process.env.AIRTABLE_SOCIO_RESPUESTAS_TABLE_ID!,
    fields: {
      TOKEN: process.env.AIRTABLE_SOCIO_RESP_TOKEN!,
      CAMPANA: process.env.AIRTABLE_SOCIO_RESP_CAMPANA!,
      PERSONAL: process.env.AIRTABLE_SOCIO_RESP_PERSONAL!,
      NOMBRE_COMPLETO: process.env.AIRTABLE_SOCIO_RESP_NOMBRE_COMPLETO!,
      NUMERO_DOCUMENTO: process.env.AIRTABLE_SOCIO_RESP_NUMERO_DOCUMENTO!,
      FECHA_NACIMIENTO: process.env.AIRTABLE_SOCIO_RESP_FECHA_NACIMIENTO!,
      GENERO: process.env.AIRTABLE_SOCIO_RESP_GENERO!,
      ESTADO_CIVIL: process.env.AIRTABLE_SOCIO_RESP_ESTADO_CIVIL!,
      MUNICIPIO_RESIDENCIA: process.env.AIRTABLE_SOCIO_RESP_MUNICIPIO!,
      ESTRATO: process.env.AIRTABLE_SOCIO_RESP_ESTRATO!,
      TIPO_VIVIENDA: process.env.AIRTABLE_SOCIO_RESP_TIPO_VIVIENDA!,
      PERSONAS_A_CARGO: process.env.AIRTABLE_SOCIO_RESP_PERSONAS_CARGO!,
      ESCOLARIDAD: process.env.AIRTABLE_SOCIO_RESP_ESCOLARIDAD!,
      ESTUDIANDO_ACTUALMENTE: process.env.AIRTABLE_SOCIO_RESP_ESTUDIANDO!,
      CARRERA_ACTUAL: process.env.AIRTABLE_SOCIO_RESP_CARRERA_ACTUAL!,
      AREA_TRABAJO: process.env.AIRTABLE_SOCIO_RESP_AREA_TRABAJO!,
      CARGO: process.env.AIRTABLE_SOCIO_RESP_CARGO!,
      TIPO_CONTRATO: process.env.AIRTABLE_SOCIO_RESP_TIPO_CONTRATO!,
      FECHA_INGRESO_SIRIUS: process.env.AIRTABLE_SOCIO_RESP_FECHA_INGRESO!,
      TURNO_TRABAJO: process.env.AIRTABLE_SOCIO_RESP_TURNO!,
      OTRO_EMPLEO: process.env.AIRTABLE_SOCIO_RESP_OTRO_EMPLEO!,
      ENFERMEDAD_CRONICA: process.env.AIRTABLE_SOCIO_RESP_ENFERMEDAD_CRONICA!,
      CUAL_ENFERMEDAD_CRONICA: process.env.AIRTABLE_SOCIO_RESP_CUAL_ENFERMEDAD!,
      DISCAPACIDAD: process.env.AIRTABLE_SOCIO_RESP_DISCAPACIDAD!,
      CUAL_DISCAPACIDAD: process.env.AIRTABLE_SOCIO_RESP_CUAL_DISCAPACIDAD!,
      TRATAMIENTO_MEDICO: process.env.AIRTABLE_SOCIO_RESP_TRATAMIENTO_MEDICO!,
      ACCIDENTES_TRABAJO_PREVIOS: process.env.AIRTABLE_SOCIO_RESP_ACCIDENTES_PREVIOS!,
      ENFERMEDAD_LABORAL_PREVIA: process.env.AIRTABLE_SOCIO_RESP_ENFERMEDAD_LABORAL!,
      FUMA: process.env.AIRTABLE_SOCIO_RESP_FUMA!,
      ALCOHOL: process.env.AIRTABLE_SOCIO_RESP_ALCOHOL!,
      PRACTICA_DEPORTE: process.env.AIRTABLE_SOCIO_RESP_PRACTICA_DEPORTE!,
      CUAL_DEPORTE: process.env.AIRTABLE_SOCIO_RESP_CUAL_DEPORTE!,
      TIEMPO_LIBRE: process.env.AIRTABLE_SOCIO_RESP_TIEMPO_LIBRE!,
      MEDIO_TRANSPORTE: process.env.AIRTABLE_SOCIO_RESP_TRANSPORTE!,
      TIEMPO_DESPLAZAMIENTO: process.env.AIRTABLE_SOCIO_RESP_TIEMPO_DESPLAZAMIENTO!,
      ACEPTA_POLITICA_DATOS: process.env.AIRTABLE_SOCIO_RESP_ACEPTA_POLITICA!,
      FIRMA_VERACIDAD: process.env.AIRTABLE_SOCIO_RESP_FIRMA_VERACIDAD!,
    },
  },

  // ─── Tabla: socio_informes ───
  informes: {
    tableId: process.env.AIRTABLE_SOCIO_INFORMES_TABLE_ID!,
    fields: {
      CAMPANA: process.env.AIRTABLE_SOCIO_INFORMES_CAMPANA!,
      URL_PDF: process.env.AIRTABLE_SOCIO_INFORMES_URL_PDF!,
      GENERADO_POR: process.env.AIRTABLE_SOCIO_INFORMES_GENERADO_POR!,
      TOTAL_RESPUESTAS: process.env.AIRTABLE_SOCIO_INFORMES_TOTAL_RESPUESTAS!,
    },
  },
} as const;

// Validar que todas las variables estén definidas
Object.entries(SOCIO_CONFIG).forEach(([key, value]) => {
  if (key === "baseId" || key === "apiToken") {
    if (!value) throw new Error(`SOCIO_CONFIG.${key} no está definido`);
  } else if (typeof value === "object" && "tableId" in value) {
    if (!value.tableId) throw new Error(`SOCIO_CONFIG.${key}.tableId no está definido`);
  }
});
