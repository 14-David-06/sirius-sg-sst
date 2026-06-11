/**
 * Script para eliminar las tablas del módulo Sociodemográfico
 * Ejecutar con: npx tsx scripts/delete-socio-tables.ts
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

async function deleteTable(tableId: string, tableName: string) {
  console.log(`🗑️  Eliminando tabla: ${tableName} (${tableId})...`);

  const response = await fetch(`${AIRTABLE_API}/${BASE_ID}/tables/${tableId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Error eliminando ${tableName}: ${error}`);
  } else {
    console.log(`✅ Tabla ${tableName} eliminada`);
  }
}

async function main() {
  console.log('🔍 Buscando tablas del módulo sociodemográfico...\n');

  const tables = await listTables();
  const socioTables = tables.filter((t: any) => t.name.startsWith('socio_'));

  if (socioTables.length === 0) {
    console.log('✅ No hay tablas socio_* para eliminar');
    return;
  }

  console.log(`📋 Encontradas ${socioTables.length} tablas:\n`);
  socioTables.forEach((t: any) => console.log(`  - ${t.name} (${t.id})`));
  console.log('');

  // Eliminar en orden inverso (respuestas → tokens → campañas)
  // Para respetar las relaciones de FK
  const deleteOrder = ['socio_informes', 'socio_respuestas', 'socio_tokens', 'socio_campanas'];

  for (const tableName of deleteOrder) {
    const table = socioTables.find((t: any) => t.name === tableName);
    if (table) {
      await deleteTable(table.id, table.name);
      // Pequeña pausa entre eliminaciones
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log('\n✅ Proceso completado');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
