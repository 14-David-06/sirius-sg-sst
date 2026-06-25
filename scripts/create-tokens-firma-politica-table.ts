/**
 * Script para crear la tabla "Tokens Firma Política"
 * Uso: npx tsx scripts/create-tokens-firma-politica-table.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const BASE_ID = process.env.AIRTABLE_SGSST_BASE_ID;
const API_TOKEN = process.env.AIRTABLE_SGSST_API_TOKEN;
const POLITICAS_TABLE_ID = process.env.AIRTABLE_POLITICAS_TABLE_ID;

const tableDefinition = {
  name: "Tokens Firma Política",
  description: "Tokens para enviar enlaces personalizados de firma de políticas",
  fields: [
    {
      name: "Token ID",
      type: "singleLineText",
      description: "Token único para el enlace",
    },
    {
      name: "Política",
      type: "multipleRecordLinks",
      description: "Política a firmar",
      options: {
        linkedTableId: POLITICAS_TABLE_ID,
      },
    },
    {
      name: "ID Empleado Core",
      type: "singleLineText",
      description: "ID del empleado",
    },
    {
      name: "Fecha Generación",
      type: "dateTime",
      description: "Cuándo se generó el token",
      options: {
        dateFormat: { name: "local", format: "l" },
        timeFormat: { name: "24hour", format: "HH:mm" },
        timeZone: "America/Bogota",
      },
    },
    {
      name: "Fecha Expiración",
      type: "dateTime",
      description: "Cuándo expira el token",
      options: {
        dateFormat: { name: "local", format: "l" },
        timeFormat: { name: "24hour", format: "HH:mm" },
        timeZone: "America/Bogota",
      },
    },
    {
      name: "Estado",
      type: "singleSelect",
      description: "Estado del token",
      options: {
        choices: [
          { name: "Activo" },
          { name: "Usado" },
          { name: "Expirado" },
        ],
      },
    },
  ],
};

async function createTable() {
  console.log("🚀 Creando tabla 'Tokens Firma Política'...\n");

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

    console.log("✅ Tabla creada!\n");
    console.log("📝 Variables para .env.local:\n");
    console.log("# Tabla Tokens Firma Política");
    console.log(`AIRTABLE_TOKPOL_TABLE_ID=${data.id}`);

    const fieldMapping: Record<string, string> = {
      "Token ID": "AIRTABLE_TOKPOL_TOKEN_ID",
      "Política": "AIRTABLE_TOKPOL_POLITICA_LINK",
      "ID Empleado Core": "AIRTABLE_TOKPOL_ID_EMPLEADO",
      "Fecha Generación": "AIRTABLE_TOKPOL_FECHA_GENERACION",
      "Fecha Expiración": "AIRTABLE_TOKPOL_FECHA_EXPIRACION",
      "Estado": "AIRTABLE_TOKPOL_ESTADO",
    };

    data.fields.forEach((field: any) => {
      const envVarName = fieldMapping[field.name];
      if (envVarName) console.log(`${envVarName}=${field.id}`);
    });

    console.log("\n✅ Copia estas variables a .env.local");
  } catch (error) {
    console.error("💥 Error:", error);
    process.exit(1);
  }
}

createTable();
