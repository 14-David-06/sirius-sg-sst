/**
 * Script para crear la tabla "Políticas" en Airtable usando la API
 * Uso: npx tsx scripts/create-politicas-table.ts
 */

// Cargar variables de entorno
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const BASE_ID = process.env.AIRTABLE_SGSST_BASE_ID;
const API_TOKEN = process.env.AIRTABLE_SGSST_API_TOKEN;

if (!BASE_ID || !API_TOKEN) {
  console.error("❌ Error: Variables de entorno no configuradas");
  console.error("   AIRTABLE_SGSST_BASE_ID:", BASE_ID ? "✅" : "❌");
  console.error("   AIRTABLE_SGSST_API_TOKEN:", API_TOKEN ? "✅" : "❌");
  process.exit(1);
}

console.log("🔍 Configuración:");
console.log(`   Base ID: ${BASE_ID}`);
console.log(`   API Token: ${API_TOKEN ? "✅ Configurado" : "❌ No configurado"}`);
console.log();

// ══════════════════════════════════════════════════════════
// Definición de la tabla y campos
// ══════════════════════════════════════════════════════════

const tableDefinition = {
  name: "Políticas",
  description: "Catálogo de políticas empresariales para consulta y firma digital",
  fields: [
    {
      name: "Código",
      type: "singleLineText",
      description: "Código único de la política (PT-SST-001, PT-SST-002, etc.)",
    },
    {
      name: "Título",
      type: "singleLineText",
      description: "Título de la política",
    },
    {
      name: "Descripción",
      type: "multilineText",
      description: "Descripción detallada de la política",
    },
    {
      name: "Categoría",
      type: "singleSelect",
      description: "Categoría de la política",
      options: {
        choices: [
          { name: "Seguridad y Salud" },
          { name: "Reglamento Interno" },
          { name: "Recursos Humanos" },
          { name: "General" },
        ],
      },
    },
    {
      name: "Versión",
      type: "singleLineText",
      description: "Versión de la política (1.0, 1.1, etc.)",
    },
    {
      name: "Fecha Publicación",
      type: "date",
      description: "Fecha de publicación de la política",
      options: {
        dateFormat: {
          name: "local",
          format: "l",
        },
      },
    },
    {
      name: "Fecha Vigencia",
      type: "date",
      description: "Fecha desde la cual la política está vigente",
      options: {
        dateFormat: {
          name: "local",
          format: "l",
        },
      },
    },
    {
      name: "Estado",
      type: "singleSelect",
      description: "Estado actual de la política",
      options: {
        choices: [
          { name: "Activa" },
          { name: "En revisión" },
          { name: "Obsoleta" },
        ],
      },
    },
    {
      name: "URL Documento S3",
      type: "url",
      description: "URL del documento PDF en S3",
    },
    {
      name: "Requiere Firma",
      type: "checkbox",
      description: "Si la política requiere firma digital del colaborador",
      options: {
        color: "greenBright",
        icon: "check",
      },
    },
    {
      name: "Visible Colaboradores",
      type: "checkbox",
      description: "Si la política es visible para todos los colaboradores",
      options: {
        color: "blueBright",
        icon: "check",
      },
    },
    {
      name: "Orden Visualización",
      type: "number",
      description: "Orden para mostrar en la lista",
      options: {
        precision: 0, // Integer
      },
    },
    {
      name: "Creado Por",
      type: "singleLineText",
      description: "Usuario que creó el registro",
    },
    {
      name: "Fecha Creación",
      type: "dateTime",
      description: "Fecha y hora de creación",
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
      name: "Modificado Por",
      type: "singleLineText",
      description: "Usuario que modificó el registro por última vez",
    },
    {
      name: "Fecha Modificación",
      type: "dateTime",
      description: "Fecha y hora de última modificación",
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
  ],
};

// ══════════════════════════════════════════════════════════
// Función para crear la tabla
// ══════════════════════════════════════════════════════════

async function createTable() {
  console.log("🚀 Creando tabla 'Políticas' en Airtable...\n");

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

      if (response.status === 422) {
        console.error("\n⚠️  La tabla probablemente ya existe.");
        console.error("   Verifica en Airtable si la tabla 'Políticas' ya está creada.");
      }

      process.exit(1);
    }

    const data = await response.json();

    console.log("✅ Tabla creada exitosamente!\n");
    console.log("📋 Información de la tabla:");
    console.log(`   Nombre: ${data.name}`);
    console.log(`   ID: ${data.id}`);
    console.log(`   Campos creados: ${data.fields.length}`);
    console.log();

    console.log("📝 IDs de campos (agrégalos a .env.local):\n");
    console.log("# Tabla Políticas");
    console.log(`AIRTABLE_POLITICAS_TABLE_ID=${data.id}`);
    console.log();

    // Mapeo de nombres de campos a nombres de variables de entorno
    const fieldMapping: Record<string, string> = {
      "Código": "AIRTABLE_POL_CODIGO",
      "Título": "AIRTABLE_POL_TITULO",
      "Descripción": "AIRTABLE_POL_DESCRIPCION",
      "Categoría": "AIRTABLE_POL_CATEGORIA",
      "Versión": "AIRTABLE_POL_VERSION",
      "Fecha Publicación": "AIRTABLE_POL_FECHA_PUBLICACION",
      "Fecha Vigencia": "AIRTABLE_POL_FECHA_VIGENCIA",
      "Estado": "AIRTABLE_POL_ESTADO",
      "URL Documento S3": "AIRTABLE_POL_URL_DOCUMENTO",
      "Requiere Firma": "AIRTABLE_POL_REQUIERE_FIRMA",
      "Visible Colaboradores": "AIRTABLE_POL_VISIBLE",
      "Orden Visualización": "AIRTABLE_POL_ORDEN",
      "Creado Por": "AIRTABLE_POL_CREADO_POR",
      "Fecha Creación": "AIRTABLE_POL_FECHA_CREACION",
      "Modificado Por": "AIRTABLE_POL_MODIFICADO_POR",
      "Fecha Modificación": "AIRTABLE_POL_FECHA_MODIFICACION",
    };

    // Mostrar los Field IDs
    data.fields.forEach((field: any) => {
      const envVarName = fieldMapping[field.name];
      if (envVarName) {
        console.log(`${envVarName}=${field.id}`);
      }
    });

    console.log();
    console.log("=".repeat(70));
    console.log("✅ SIGUIENTE PASO:");
    console.log("   1. Copia las variables de arriba");
    console.log("   2. Pégalas en tu archivo .env.local");
    console.log("   3. Ejecuta: npx tsx scripts/create-politicas-records.ts");
    console.log("=".repeat(70));

  } catch (error) {
    console.error("💥 Error al crear la tabla:", error);
    process.exit(1);
  }
}

// Ejecutar
createTable();
