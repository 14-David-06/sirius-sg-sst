/**
 * Script: Obtener Field IDs de Medicina Laboral desde Airtable
 *
 * Este script consulta las tablas de medicina laboral en Airtable y genera
 * automáticamente las variables de entorno con los Field IDs correctos.
 *
 * Requisitos:
 * 1. Las 5 tablas deben estar creadas en Airtable (base SG-SST)
 * 2. AIRTABLE_SGSST_API_TOKEN debe estar configurado en .env.local
 * 3. AIRTABLE_SGSST_BASE_ID debe estar configurado en .env.local
 * 4. Los Table IDs de las 5 tablas deben estar en .env.local
 *
 * Uso:
 *   npx tsx scripts/obtener-field-ids-medicina-laboral.ts
 *
 * El script generará un archivo con las variables de entorno listas para copiar.
 */

import fs from "fs";
import path from "path";

// ══════════════════════════════════════════════════════════
// Configuración
// ══════════════════════════════════════════════════════════

const API_TOKEN = process.env.AIRTABLE_SGSST_API_TOKEN;
const BASE_ID = process.env.AIRTABLE_SGSST_BASE_ID;

if (!API_TOKEN || !BASE_ID) {
  console.error("❌ Error: AIRTABLE_SGSST_API_TOKEN y AIRTABLE_SGSST_BASE_ID deben estar configurados en .env.local");
  process.exit(1);
}

// IDs de las tablas (obtener de .env.local)
const TABLES = {
  med_examenes: process.env.AIRTABLE_MED_EXAMENES_TABLE_ID || "",
  med_seguimientos: process.env.AIRTABLE_MED_SEGUIMIENTOS_TABLE_ID || "",
  med_incapacidades: process.env.AIRTABLE_MED_INCAPACIDADES_TABLE_ID || "",
  med_reubicaciones: process.env.AIRTABLE_MED_REUBICACIONES_TABLE_ID || "",
  med_enfermedades_laborales: process.env.AIRTABLE_MED_ENFERMEDADES_LABORALES_TABLE_ID || "",
};

// Mapeo de nombres de campos esperados a prefijos de variables
const FIELD_MAPPINGS = {
  med_examenes: {
    prefix: "AIRTABLE_MED_EXM_",
    fields: {
      Consecutivo: "CONSECUTIVO",
      Fecha_Examen: "FECHA_EXAMEN",
      Tipo_Examen: "TIPO_EXAMEN",
      ID_Empleado_Core: "ID_EMPLEADO_CORE",
      Nombre_Empleado: "NOMBRE_EMPLEADO",
      Numero_Documento: "NUMERO_DOCUMENTO",
      Cargo: "CARGO",
      IPS_Entidad: "IPS_ENTIDAD",
      Concepto_Aptitud: "CONCEPTO_APTITUD",
      Restricciones: "RESTRICCIONES",
      Recomendaciones: "RECOMENDACIONES",
      Estado: "ESTADO",
      Fecha_Programada: "FECHA_PROGRAMADA",
      Documento_URL: "DOCUMENTO_URL",
      Observaciones: "OBSERVACIONES",
      Activo: "ACTIVO",
      Created_At: "CREATED_AT",
      Updated_At: "UPDATED_AT",
    },
  },
  med_seguimientos: {
    prefix: "AIRTABLE_MED_SEG_",
    fields: {
      Consecutivo: "CONSECUTIVO",
      Fecha_Seguimiento: "FECHA_SEGUIMIENTO",
      Tipo_Seguimiento: "TIPO_SEGUIMIENTO",
      ID_Empleado_Core: "ID_EMPLEADO_CORE",
      Nombre_Empleado: "NOMBRE_EMPLEADO",
      Numero_Documento: "NUMERO_DOCUMENTO",
      Cargo: "CARGO",
      Diagnostico: "DIAGNOSTICO",
      Acciones_Realizadas: "ACCIONES_REALIZADAS",
      Recomendaciones: "RECOMENDACIONES",
      Proxima_Cita: "PROXIMA_CITA",
      Documento_URL: "DOCUMENTO_URL",
      Observaciones: "OBSERVACIONES",
      Activo: "ACTIVO",
      Created_At: "CREATED_AT",
      Updated_At: "UPDATED_AT",
    },
  },
  med_incapacidades: {
    prefix: "AIRTABLE_MED_INC_",
    fields: {
      Consecutivo: "CONSECUTIVO",
      Tipo: "TIPO",
      ID_Empleado_Core: "ID_EMPLEADO_CORE",
      Nombre_Empleado: "NOMBRE_EMPLEADO",
      Numero_Documento: "NUMERO_DOCUMENTO",
      Cargo: "CARGO",
      Diagnostico: "DIAGNOSTICO",
      Fecha_Inicio: "FECHA_INICIO",
      Fecha_Fin: "FECHA_FIN",
      Dias_Incapacidad: "DIAS_INCAPACIDAD",
      Entidad_Emisora: "ENTIDAD_EMISORA",
      Numero_Incapacidad: "NUMERO_INCAPACIDAD",
      Prorroga: "PRORROGA",
      Incapacidad_Origen_Link: "INCAPACIDAD_ORIGEN_LINK",
      Documento_URL: "DOCUMENTO_URL",
      Observaciones: "OBSERVACIONES",
      Activo: "ACTIVO",
      Created_At: "CREATED_AT",
      Updated_At: "UPDATED_AT",
    },
  },
  med_reubicaciones: {
    prefix: "AIRTABLE_MED_REU_",
    fields: {
      Consecutivo: "CONSECUTIVO",
      Tipo: "TIPO",
      ID_Empleado_Core: "ID_EMPLEADO_CORE",
      Nombre_Empleado: "NOMBRE_EMPLEADO",
      Numero_Documento: "NUMERO_DOCUMENTO",
      Cargo_Origen: "CARGO_ORIGEN",
      Cargo_Destino: "CARGO_DESTINO",
      Fecha_Inicio: "FECHA_INICIO",
      Fecha_Fin_Estimada: "FECHA_FIN_ESTIMADA",
      Fecha_Cierre: "FECHA_CIERRE",
      Motivo: "MOTIVO",
      Restricciones: "RESTRICCIONES",
      Estado: "ESTADO",
      Rehabilitado: "REHABILITADO",
      Documento_URL: "DOCUMENTO_URL",
      Observaciones: "OBSERVACIONES",
      Activo: "ACTIVO",
      Created_At: "CREATED_AT",
      Updated_At: "UPDATED_AT",
    },
  },
  med_enfermedades_laborales: {
    prefix: "AIRTABLE_MED_EL_",
    fields: {
      Consecutivo: "CONSECUTIVO",
      ID_Empleado_Core: "ID_EMPLEADO_CORE",
      Nombre_Empleado: "NOMBRE_EMPLEADO",
      Numero_Documento: "NUMERO_DOCUMENTO",
      Cargo: "CARGO",
      Diagnostico: "DIAGNOSTICO",
      Fecha_Diagnostico: "FECHA_DIAGNOSTICO",
      Fecha_Inicio_Sintomas: "FECHA_INICIO_SINTOMAS",
      Estado: "ESTADO",
      Entidad_Calificadora: "ENTIDAD_CALIFICADORA",
      Fecha_Calificacion: "FECHA_CALIFICACION",
      PCL: "PCL",
      Fecha_Estructuracion: "FECHA_ESTRUCTURACION",
      Documento_URL: "DOCUMENTO_URL",
      Observaciones: "OBSERVACIONES",
      Activo: "ACTIVO",
      Created_At: "CREATED_AT",
      Updated_At: "UPDATED_AT",
    },
  },
};

// ══════════════════════════════════════════════════════════
// Funciones auxiliares
// ══════════════════════════════════════════════════════════

interface AirtableField {
  id: string;
  name: string;
  type: string;
}

interface AirtableTable {
  id: string;
  name: string;
  fields: AirtableField[];
}

async function obtenerEsquemaTabla(tableId: string): Promise<AirtableTable | null> {
  try {
    const url = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ Error al obtener esquema: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const tabla = data.tables.find((t: AirtableTable) => t.id === tableId);
    return tabla || null;
  } catch (error) {
    console.error("❌ Error al consultar Airtable:", error);
    return null;
  }
}

// ══════════════════════════════════════════════════════════
// Script principal
// ══════════════════════════════════════════════════════════

async function main() {
  console.log("🔍 Obteniendo Field IDs de las tablas de Medicina Laboral...\n");

  let outputLines: string[] = [];
  let errores = 0;
  let advertencias = 0;

  outputLines.push("# ══════════════════════════════════════════════════════════");
  outputLines.push("# MÓDULO MEDICINA LABORAL (med_*) - Field IDs");
  outputLines.push("# Generado automáticamente por scripts/obtener-field-ids-medicina-laboral.ts");
  outputLines.push(`# Fecha: ${new Date().toISOString()}`);
  outputLines.push("# ══════════════════════════════════════════════════════════");
  outputLines.push("");

  for (const [tableName, tableId] of Object.entries(TABLES)) {
    if (!tableId || tableId.startsWith("tblPENDIENTE")) {
      console.log(`⚠️  Tabla "${tableName}" no tiene Table ID configurado. Saltando...`);
      advertencias++;
      continue;
    }

    console.log(`📋 Procesando tabla: ${tableName} (${tableId})`);

    const tabla = await obtenerEsquemaTabla(tableId);
    if (!tabla) {
      console.error(`❌ No se pudo obtener el esquema de la tabla "${tableName}"`);
      errores++;
      continue;
    }

    const mapping = FIELD_MAPPINGS[tableName as keyof typeof FIELD_MAPPINGS];
    if (!mapping) {
      console.error(`❌ No hay mapeo definido para la tabla "${tableName}"`);
      errores++;
      continue;
    }

    outputLines.push(`# ── Tabla "${tableName}" ────────────────────────────────`);
    outputLines.push(`${mapping.prefix.replace("_", "_").slice(0, -1).replace("_MED_", "_MED_")}TABLE_ID=${tableId}`);

    const camposEncontrados: string[] = [];
    const camposFaltantes: string[] = [];

    for (const [nombreCampo, varSuffix] of Object.entries(mapping.fields)) {
      const field = tabla.fields.find((f) => f.name === nombreCampo);
      if (field) {
        outputLines.push(`${mapping.prefix}${varSuffix}=${field.id}`);
        camposEncontrados.push(nombreCampo);
      } else {
        outputLines.push(`# ⚠️  FALTANTE: ${mapping.prefix}${varSuffix}=fldPENDIENTE  # Campo "${nombreCampo}" no encontrado`);
        camposFaltantes.push(nombreCampo);
      }
    }

    outputLines.push("");

    console.log(`   ✅ ${camposEncontrados.length} campos encontrados`);
    if (camposFaltantes.length > 0) {
      console.log(`   ⚠️  ${camposFaltantes.length} campos faltantes:`);
      camposFaltantes.forEach((c) => console.log(`      - ${c}`));
      advertencias += camposFaltantes.length;
    }
    console.log("");
  }

  // Guardar resultado
  const outputPath = path.join(process.cwd(), "scripts", "output-field-ids-medicina-laboral.txt");
  fs.writeFileSync(outputPath, outputLines.join("\n"), "utf-8");

  console.log("✅ Script completado!");
  console.log(`📄 Resultado guardado en: ${outputPath}`);
  console.log("");
  console.log("📊 Resumen:");
  console.log(`   Errores: ${errores}`);
  console.log(`   Advertencias: ${advertencias}`);
  console.log("");

  if (errores === 0 && advertencias === 0) {
    console.log("🎉 ¡Todos los Field IDs fueron obtenidos exitosamente!");
    console.log("");
    console.log("📋 Siguiente paso:");
    console.log("   1. Abre el archivo: scripts/output-field-ids-medicina-laboral.txt");
    console.log("   2. Copia las variables generadas");
    console.log("   3. Reemplaza las secciones correspondientes en .env.local");
    console.log("   4. Reinicia el servidor: npm run dev");
  } else {
    console.log("⚠️  Hay campos faltantes o errores.");
    console.log("   Revisa el archivo de salida y verifica que:");
    console.log("   1. Las tablas estén creadas en Airtable");
    console.log("   2. Los nombres de campos sean exactos (con mayúsculas, guiones bajos)");
    console.log("   3. Los Table IDs estén correctamente configurados en .env.local");
  }
}

// Ejecutar
main().catch((error) => {
  console.error("💥 Error fatal:", error);
  process.exit(1);
});
