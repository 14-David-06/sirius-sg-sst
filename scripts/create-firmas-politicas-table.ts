/**
 * Script para crear la tabla "Firmas Políticas" en Airtable
 * Uso: npx tsx scripts/create-firmas-politicas-table.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const BASE_ID = process.env.AIRTABLE_SGSST_BASE_ID;
const API_TOKEN = process.env.AIRTABLE_SGSST_API_TOKEN;
const POLITICAS_TABLE_ID = process.env.AIRTABLE_POLITICAS_TABLE_ID;

console.log("🔍 Configuración:");
console.log(`   Base ID: ${BASE_ID}`);
console.log(`   Políticas Table ID: ${POLITICAS_TABLE_ID}`);
console.log();

const tableDefinition = {
  name: "Firmas Políticas",
  description: "Registro de firmas digitales de políticas por parte de colaboradores",
  fields: [
    {
      name: "ID Empleado Core",
      type: "singleLineText",
      description: "ID del empleado en la base Personal",
    },
    {
      name: "Política",
      type: "multipleRecordLinks",
      description: "Política firmada",
      options: {
        linkedTableId: POLITICAS_TABLE_ID,
      },
    },
    {
      name: "Nombre Empleado",
      type: "singleLineText",
      description: "Nombre completo del empleado",
    },
    {
      name: "Fecha Firma",
      type: "dateTime",
      description: "Fecha y hora de la firma",
      options: {
        dateFormat: {
          name: "local",
          format: "l",
        },
        timeFormat: {
          name: "24hour",
          format: "HH:mm",
        },
        timeZone: "America/Bogota",
      },
    },
    {
      name: "Firma",
      type: "multilineText",
      description: "Firma digital (data URL)",
    },
  ],
};

async function createTable() {
  console.log("🚀 Creando tabla 'Firmas Políticas'...\n");

  const url = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tableDefinition),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error ${response.status}:`, errorText);
      process.exit(1);
    }

    const data = await response.json();

    console.log("✅ Tabla creada exitosamente!\n");
    console.log("📋 Información:");
    console.log(`   Nombre: ${data.name}`);
    console.log(`   ID: ${data.id}`);
    console.log();

    console.log("📝 Variables para .env.local:\n");
    console.log("# Tabla Firmas Políticas");
    console.log(`AIRTABLE_FIRMPOL_TABLE_ID=${data.id}`);
    console.log();

    const fieldMapping: Record<string, string> = {
      "Política": "AIRTABLE_FIRMPOL_POLITICA_LINK",
      "ID Empleado Core": "AIRTABLE_FIRMPOL_ID_EMPLEADO",
      "Nombre Empleado": "AIRTABLE_FIRMPOL_NOMBRE_EMPLEADO",
      "Fecha Firma": "AIRTABLE_FIRMPOL_FECHA_FIRMA",
      "Firma": "AIRTABLE_FIRMPOL_FIRMA",
    };

    data.fields.forEach((field: any) => {
      const envVarName = fieldMapping[field.name];
      if (envVarName) {
        console.log(`${envVarName}=${field.id}`);
      }
    });

    console.log();
    console.log("=".repeat(70));
    console.log("✅ Copia estas variables a .env.local");
    console.log("=".repeat(70));

  } catch (error) {
    console.error("💥 Error:", error);
    process.exit(1);
  }
}

createTable();
