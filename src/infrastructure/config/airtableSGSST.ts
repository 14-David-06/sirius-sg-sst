// ══════════════════════════════════════════════════════════
// Configuración Airtable — Base "Sirius SG-SST"
// Tablas de entregas EPP, detalle, tokens y historial
// ══════════════════════════════════════════════════════════

export const airtableSGSSTConfig = {
  apiToken: process.env.AIRTABLE_SGSST_API_TOKEN!,
  baseId: process.env.AIRTABLE_SGSST_BASE_ID!,
  baseUrl: "https://api.airtable.com/v0",

  // ── Tabla "Entregas EPP" ──────────────────────────────
  entregasTableId: process.env.AIRTABLE_ENTREGAS_TABLE_ID!,
  entregasFields: {
    ID_ENTREGA: process.env.AIRTABLE_ENT_ID_ENTREGA!,
    ID: process.env.AIRTABLE_ENT_ID!,
    FECHA_ENTREGA: process.env.AIRTABLE_ENT_FECHA_ENTREGA!,
    RESPONSABLE: process.env.AIRTABLE_ENT_RESPONSABLE!,
    OBSERVACIONES: process.env.AIRTABLE_ENT_OBSERVACIONES!,
    FECHA_CONFIRMACION: process.env.AIRTABLE_ENT_FECHA_CONFIRMACION!,
    DETALLE_LINK: process.env.AIRTABLE_ENT_DETALLE_LINK!,
    TOKENS_LINK: process.env.AIRTABLE_ENT_TOKENS_LINK!,
    ACTIVIDADES_SST: process.env.AIRTABLE_ENT_ACTIVIDADES_SST!,
    ID_EMPLEADO_CORE: process.env.AIRTABLE_ENT_ID_EMPLEADO_CORE!,
    ESTADO: process.env.AIRTABLE_ENT_ESTADO!,
    MOTIVO: process.env.AIRTABLE_ENT_MOTIVO!,
    HISTORIAL_LINK: process.env.AIRTABLE_ENT_HISTORIAL_LINK!,
  },

  // ── Tabla "Detalle Entrega EPP" ───────────────────────
  detalleTableId: process.env.AIRTABLE_DETALLE_TABLE_ID!,
  detalleFields: {
    ID: process.env.AIRTABLE_DET_ID!,
    CANTIDAD: process.env.AIRTABLE_DET_CANTIDAD!,
    VIDA_UTIL: process.env.AIRTABLE_DET_VIDA_UTIL!,
    FECHA_VENCIMIENTO: process.env.AIRTABLE_DET_FECHA_VENCIMIENTO!,
    OBSERVACIONES: process.env.AIRTABLE_DET_OBSERVACIONES!,
    ENTREGA_LINK: process.env.AIRTABLE_DET_ENTREGA_LINK!,
    TALLA: process.env.AIRTABLE_DET_TALLA!,
    CONDICION: process.env.AIRTABLE_DET_CONDICION!,
    CODIGO_INSUMO: process.env.AIRTABLE_DET_CODIGO_INSUMO!,
  },

  // ── Tabla "Tokens Entrega" ────────────────────────────
  tokensTableId: process.env.AIRTABLE_TOKENS_TABLE_ID!,
  tokensFields: {
    TOKEN_ID: process.env.AIRTABLE_TOK_TOKEN_ID!,
    FECHA_GENERACION: process.env.AIRTABLE_TOK_FECHA_GENERACION!,
    FECHA_EXPIRACION: process.env.AIRTABLE_TOK_FECHA_EXPIRACION!,
    TIPO_VERIFICACION: process.env.AIRTABLE_TOK_TIPO_VERIFICACION!,
    HASH_FIRMA: process.env.AIRTABLE_TOK_HASH_FIRMA!,
    ENTREGA_LINK: process.env.AIRTABLE_TOK_ENTREGA_LINK!,
    ID_EMPLEADO_CORE: process.env.AIRTABLE_TOK_ID_EMPLEADO_CORE!,
    ESTADO: process.env.AIRTABLE_TOK_ESTADO!,
  },

  // ── Tabla "Historial EPP Empleado" ────────────────────
  historialTableId: process.env.AIRTABLE_HIST_TABLE_ID!,
  historialFields: {
    DIAS_RESTANTES: process.env.AIRTABLE_HIST_DIAS_RESTANTES!,
    FECHA_ENTREGA: process.env.AIRTABLE_HIST_FECHA_ENTREGA!,
    FECHA_VENCIMIENTO: process.env.AIRTABLE_HIST_FECHA_VENCIMIENTO!,
    ESTADO: process.env.AIRTABLE_HIST_ESTADO!,
    ID_EMPLEADO_CORE: process.env.AIRTABLE_HIST_ID_EMPLEADO_CORE!,
    REQUIERE_REPOSICION: process.env.AIRTABLE_HIST_REQUIERE_REPOSICION!,
    ENTREGA_ORIGEN: process.env.AIRTABLE_HIST_ENTREGA_ORIGEN!,
    CODIGO_INSUMO: process.env.AIRTABLE_HIST_CODIGO_INSUMO!,
  },

  // ── Tabla "Inspecciones EPP" (cabecera) ───────────────
  inspeccionesTableId: process.env.AIRTABLE_INSP_TABLE_ID!,
  inspeccionesFields: {
    ID: process.env.AIRTABLE_INSP_ID!,
    FECHA: process.env.AIRTABLE_INSP_FECHA!,
    INSPECTOR: process.env.AIRTABLE_INSP_INSPECTOR!,
    ESTADO: process.env.AIRTABLE_INSP_ESTADO!,
    DETALLE_LINK: process.env.AIRTABLE_INSP_DETALLE_LINK!,
  },

  // ── Tabla "Detalle Inspección EPP" ────────────────────
  detalleInspeccionTableId: process.env.AIRTABLE_DETINSP_TABLE_ID!,
  detalleInspeccionFields: {
    ID: process.env.AIRTABLE_DETINSP_ID!,
    ID_EMPLEADO: process.env.AIRTABLE_DETINSP_ID_EMPLEADO!,
    NOMBRE: process.env.AIRTABLE_DETINSP_NOMBRE!,
    OBSERVACIONES: process.env.AIRTABLE_DETINSP_OBSERVACIONES!,
    FIRMA: process.env.AIRTABLE_DETINSP_FIRMA!,
    INSPECCION_LINK: process.env.AIRTABLE_DETINSP_INSPECCION_LINK!,
    CASCO: process.env.AIRTABLE_DETINSP_CASCO!,
    P_AUDITIVA: process.env.AIRTABLE_DETINSP_P_AUDITIVA!,
    P_VISUAL: process.env.AIRTABLE_DETINSP_P_VISUAL!,
    P_RESPIRATORIA: process.env.AIRTABLE_DETINSP_P_RESPIRATORIA!,
    ROPA: process.env.AIRTABLE_DETINSP_ROPA!,
    GUANTES: process.env.AIRTABLE_DETINSP_GUANTES!,
    BOTAS: process.env.AIRTABLE_DETINSP_BOTAS!,
    P_CAIDAS: process.env.AIRTABLE_DETINSP_P_CAIDAS!,
    OTROS: process.env.AIRTABLE_DETINSP_OTROS!,
  },
};

export function getSGSSTUrl(tableId: string): string {
  return `${airtableSGSSTConfig.baseUrl}/${airtableSGSSTConfig.baseId}/${tableId}`;
}

export function getSGSSTHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${airtableSGSSTConfig.apiToken}`,
    "Content-Type": "application/json",
  };
}
