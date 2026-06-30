#!/usr/bin/env node
/**
 * Descubre los Field IDs de la tabla veh_vehiculos
 * para corregir la configuración en .env.local
 */

require('dotenv').config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function main() {
  log('\n═══════════════════════════════════════════════', 'cyan');
  log('   DESCUBRIMIENTO DE FIELD IDs - veh_vehiculos', 'cyan');
  log('═══════════════════════════════════════════════\n', 'cyan');

  const baseId = process.env.AIRTABLE_SGSST_BASE_ID;
  const tableId = process.env.AIRTABLE_VEH_VEHICULOS_TABLE_ID;
  const apiToken = process.env.AIRTABLE_SGSST_API_TOKEN;

  if (!baseId || !tableId || !apiToken) {
    log('❌ Faltan variables de entorno', 'red');
    process.exit(1);
  }

  log('📋 Consultando esquema de la tabla...', 'blue');

  try {
    // Obtener el esquema de la base
    const metaUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
    const metaResponse = await fetch(metaUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    if (!metaResponse.ok) {
      log(`❌ Error: ${metaResponse.status}`, 'red');
      process.exit(1);
    }

    const metaData = await metaResponse.json();
    const vehiculosTable = metaData.tables.find(t => t.id === tableId);

    if (!vehiculosTable) {
      log(`❌ No se encontró la tabla ${tableId}`, 'red');
      process.exit(1);
    }

    log(`\n✅ Tabla encontrada: ${vehiculosTable.name}`, 'green');
    log(`\n📊 Fields de la tabla:\n`, 'cyan');

    // Mapeo de nombres esperados a nombres en español/inglés
    const fieldMapping = {
      'ID': ['ID', 'Autonumber', 'id'],
      'ID_PERSONAL_CORE': ['ID Personal Core', 'ID Empleado', 'Empleado', 'Colaborador', 'Personal'],
      'PLACA': ['Placa', 'Plate'],
      'TIPO_VEHICULO': ['Tipo Vehículo', 'Tipo', 'Type'],
      'PROPIETARIO_NOMBRE': ['Propietario Nombre', 'Propietario', 'Owner Name'],
      'PROPIETARIO_TIPO': ['Propietario Tipo', 'Owner Type'],
      'PROPIETARIO_DOCUMENTO': ['Propietario Documento', 'Propietario Cédula'],
      'ACTIVO': ['Activo', 'Active', 'Estado'],
      'OBSERVACIONES': ['Observaciones', 'Notas', 'Notes', 'Observations'],
      'CREATED_AT': ['Created', 'Creado', 'Fecha Creación'],
      'UPDATED_AT': ['Last modified', 'Modificado', 'Fecha Modificación'],
      'DOCUMENTOS_LINK': ['Documentos', 'Documents'],
    };

    const envVars = {};

    vehiculosTable.fields.forEach(field => {
      log(`  • ${field.name}`, 'yellow');
      log(`    ID: ${field.id}`, 'green');
      log(`    Tipo: ${field.type}`, 'blue');

      // Buscar coincidencias con los nombres esperados
      for (const [envKey, possibleNames] of Object.entries(fieldMapping)) {
        if (possibleNames.some(name => field.name.toLowerCase().includes(name.toLowerCase()))) {
          envVars[`AIRTABLE_VEH_VEH_${envKey}`] = field.id;
          log(`    ✓ Mapeado a: AIRTABLE_VEH_VEH_${envKey}`, 'cyan');
        }
      }

      log('');
    });

    // Generar configuración para .env.local
    log('\n═══════════════════════════════════════════════', 'cyan');
    log('   CONFIGURACIÓN SUGERIDA PARA .env.local', 'cyan');
    log('═══════════════════════════════════════════════\n', 'cyan');

    log('# Tabla veh_vehiculos - Fields', 'yellow');
    for (const [key, value] of Object.entries(envVars)) {
      log(`${key}=${value}`, 'green');
    }

    log('\n');

    // Verificar campos faltantes
    const expectedFields = Object.keys(fieldMapping);
    const foundFields = Object.keys(envVars).map(k => k.replace('AIRTABLE_VEH_VEH_', ''));
    const missingFields = expectedFields.filter(f => !foundFields.includes(f));

    if (missingFields.length > 0) {
      log('⚠️  Campos no encontrados automáticamente:', 'yellow');
      missingFields.forEach(f => log(`   • ${f}`, 'red'));
      log('\n   Revisa manualmente los nombres de campos en Airtable\n', 'yellow');
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    if (error.stack) log(error.stack, 'red');
    process.exit(1);
  }

  log('═══════════════════════════════════════════════\n', 'cyan');
}

main().catch(err => {
  log(`\n❌ Error fatal: ${err.message}`, 'red');
  process.exit(1);
});
