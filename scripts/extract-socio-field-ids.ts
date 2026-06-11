/**
 * Script para extraer Field IDs de las tablas socio_* ya creadas en Airtable
 * Ejecutar DESPUÉS de crear las tablas manualmente
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const AIRTABLE_TOKEN = process.env.AIRTABLE_SGSST_API_TOKEN;
const BASE_ID = process.env.AIRTABLE_SGSST_BASE_ID;

if (!AIRTABLE_TOKEN || !BASE_ID) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const AIRTABLE_API = 'https://api.airtable.com/v0/meta/bases';

async function listTables() {
  const response = await fetch(`${AIRTABLE_API}/${BASE_ID}/tables`, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error listando tablas');
  }

  const data = await response.json();
  return data.tables;
}

async function main() {
  console.log('🔍 Extrayendo Field IDs de tablas socio_*...\n');

  const tables = await listTables();
  const socioTables = tables.filter((t: any) => t.name.startsWith('socio_'));

  if (socioTables.length === 0) {
    console.error('❌ No se encontraron tablas con prefijo socio_*');
    console.error('Por favor, crear las tablas manualmente según MODULO_SOCIODEMOGRAFICO_MANUAL.md');
    process.exit(1);
  }

  console.log(`✅ Encontradas ${socioTables.length} tablas\n`);

  const envVars: string[] = [];
  envVars.push('# ── MÓDULO SOCIODEMOGRÁFICO ─────────────────────────────────────────────────');
  envVars.push(`AIRTABLE_SOCIO_BASE_ID=${BASE_ID}`);
  envVars.push('');

  for (const table of socioTables) {
    console.log(`\n📋 Tabla: ${table.name} (${table.id})`);
    console.log(`   Campos: ${table.fields.length}`);

    // Normalizar nombre de tabla para variables de entorno
    const tablePrefix = table.name
      .replace('socio_', '')
      .toUpperCase()
      .replace(/_/g, '_');

    envVars.push(`# ${table.name}`);
    envVars.push(`AIRTABLE_SOCIO_${tablePrefix}_TABLE_ID=${table.id}`);

    for (const field of table.fields) {
      const fieldVarName = field.name.toUpperCase().replace(/_/g, '_');

      if (table.name === 'socio_campanas') {
        envVars.push(`AIRTABLE_SOCIO_CAMPANAS_${fieldVarName}=${field.id}`);
      } else if (table.name === 'socio_tokens') {
        envVars.push(`AIRTABLE_SOCIO_TOKENS_${fieldVarName}=${field.id}`);
      } else if (table.name === 'socio_respuestas') {
        envVars.push(`AIRTABLE_SOCIO_RESP_${fieldVarName}=${field.id}`);
      } else if (table.name === 'socio_informes') {
        envVars.push(`AIRTABLE_SOCIO_INFORMES_${fieldVarName}=${field.id}`);
      }
    }

    envVars.push('');
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('Variables de entorno generadas:');
  console.log('='.repeat(80) + '\n');

  envVars.forEach((line) => console.log(line));

  console.log('\n' + '='.repeat(80));
  console.log('✅ COPIAR TODO EL BLOQUE DE ARRIBA AL FINAL DE .env.local');
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
