#!/usr/bin/env node
/**
 * Diagnóstico del módulo vehicular
 * Verifica la configuración y los datos en Airtable
 */

require('dotenv').config({ path: '.env.local' });

// Colores para terminal
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
  log('   DIAGNÓSTICO MÓDULO VEHICULAR', 'cyan');
  log('═══════════════════════════════════════════════\n', 'cyan');

  // 1. Verificar variables de entorno
  log('📋 1. Verificando variables de entorno...', 'blue');

  const requiredVars = {
    'Base SG-SST': {
      'AIRTABLE_SGSST_API_TOKEN': process.env.AIRTABLE_SGSST_API_TOKEN,
      'AIRTABLE_SGSST_BASE_ID': process.env.AIRTABLE_SGSST_BASE_ID,
      'AIRTABLE_VEH_VEHICULOS_TABLE_ID': process.env.AIRTABLE_VEH_VEHICULOS_TABLE_ID,
      'AIRTABLE_VEH_VEH_ID': process.env.AIRTABLE_VEH_VEH_ID,
      'AIRTABLE_VEH_VEH_ID_PERSONAL_CORE': process.env.AIRTABLE_VEH_VEH_ID_PERSONAL_CORE,
      'AIRTABLE_VEH_VEH_PLACA': process.env.AIRTABLE_VEH_VEH_PLACA,
      'AIRTABLE_VEH_VEH_TIPO_VEHICULO': process.env.AIRTABLE_VEH_VEH_TIPO_VEHICULO,
      'AIRTABLE_VEH_VEH_ACTIVO': process.env.AIRTABLE_VEH_VEH_ACTIVO,
    },
    'Base Personal': {
      'AIRTABLE_API_TOKEN': process.env.AIRTABLE_API_TOKEN,
      'AIRTABLE_BASE_ID': process.env.AIRTABLE_BASE_ID,
      'AIRTABLE_PERSONAL_TABLE_ID': process.env.AIRTABLE_PERSONAL_TABLE_ID,
      'AIRTABLE_PF_ID_EMPLEADO': process.env.AIRTABLE_PF_ID_EMPLEADO,
      'AIRTABLE_PF_NOMBRE_COMPLETO': process.env.AIRTABLE_PF_NOMBRE_COMPLETO,
      'AIRTABLE_PF_AREAS': process.env.AIRTABLE_PF_AREAS,
    }
  };

  let configOK = true;
  for (const [section, vars] of Object.entries(requiredVars)) {
    log(`\n  ${section}:`, 'yellow');
    for (const [name, value] of Object.entries(vars)) {
      if (!value) {
        log(`    ✗ ${name}: NO DEFINIDA`, 'red');
        configOK = false;
      } else {
        // Ocultar valores sensibles - solo mostrar que están definidas
        log(`    ✓ ${name}: [definida]`, 'green');
      }
    }
  }

  if (!configOK) {
    log('\n❌ Faltan variables de entorno requeridas', 'red');
    log('   Revisa tu archivo .env.local\n', 'yellow');
    process.exit(1);
  }

  log('\n✅ Todas las variables de entorno están definidas\n', 'green');

  // 2. Probar conexión a Base SG-SST (vehículos)
  log('🚗 2. Consultando vehículos en Airtable...', 'blue');

  try {
    const baseUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_SGSST_BASE_ID}/${process.env.AIRTABLE_VEH_VEHICULOS_TABLE_ID}`;
    const response = await fetch(baseUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_SGSST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      log(`\n❌ Error consultando vehículos: ${response.status}`, 'red');
      log(`   ${error}\n`, 'red');
      process.exit(1);
    }

    const data = await response.json();
    const vehiculos = data.records || [];

    log(`\n  ✓ Total de vehículos: ${vehiculos.length}`, 'green');

    if (vehiculos.length > 0) {
      log('\n  Muestra de vehículos:', 'cyan');

      const idPersonalField = process.env.AIRTABLE_VEH_VEH_ID_PERSONAL_CORE;
      const placaField = process.env.AIRTABLE_VEH_VEH_PLACA;
      const activoField = process.env.AIRTABLE_VEH_VEH_ACTIVO;

      let vehiculosSinID = 0;
      let vehiculosActivos = 0;
      const idsUnicos = new Set();

      vehiculos.slice(0, 5).forEach((veh, idx) => {
        const idPersonal = veh.fields[idPersonalField];
        const placa = veh.fields[placaField];
        const activo = veh.fields[activoField];

        if (activo) vehiculosActivos++;

        log(`\n    ${idx + 1}. Placa: ${placa || 'Sin placa'}`, 'yellow');
        log(`       ID Personal Core: ${idPersonal || '❌ NO DEFINIDO'}`, idPersonal ? 'green' : 'red');
        log(`       Activo: ${activo ? 'Sí' : 'No'}`, activo ? 'green' : 'yellow');

        if (!idPersonal) vehiculosSinID++;
        else idsUnicos.add(idPersonal);
      });

      // Contar todos los vehículos sin ID
      vehiculos.forEach(veh => {
        const idPersonal = veh.fields[idPersonalField];
        const activo = veh.fields[activoField];
        if (!idPersonal && activo) vehiculosSinID++;
        if (idPersonal) idsUnicos.add(idPersonal);
      });

      log(`\n  📊 Resumen:`, 'cyan');
      log(`     • Vehículos activos: ${vehiculosActivos}/${vehiculos.length}`, 'green');
      log(`     • Vehículos sin ID_PERSONAL_CORE: ${vehiculosSinID}`, vehiculosSinID > 0 ? 'red' : 'green');
      log(`     • IDs de personal únicos: ${idsUnicos.size}`, 'green');

      if (vehiculosSinID > 0) {
        log(`\n  ⚠️  PROBLEMA DETECTADO:`, 'yellow');
        log(`     ${vehiculosSinID} vehículos activos no tienen ID_PERSONAL_CORE asignado`, 'yellow');
        log(`     Esto impide resolver los nombres de colaboradores`, 'yellow');
      }

      // 3. Probar lookup de personal
      if (idsUnicos.size > 0) {
        log(`\n👥 3. Probando lookup de personal...`, 'blue');

        const ids = Array.from(idsUnicos).slice(0, 3);
        log(`\n  Probando con IDs: ${ids.join(', ')}`, 'cyan');

        const personalUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_PERSONAL_TABLE_ID}`;
        const PF_ID = process.env.AIRTABLE_PF_ID_EMPLEADO;
        const PF_NOMBRE = process.env.AIRTABLE_PF_NOMBRE_COMPLETO;

        const orConditions = ids.map(id => `{${PF_ID}} = '${id}'`).join(', ');
        const filterFormula = `OR(${orConditions})`;

        const personalResponse = await fetch(
          `${personalUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!personalResponse.ok) {
          const error = await personalResponse.text();
          log(`\n  ❌ Error en lookup de personal: ${personalResponse.status}`, 'red');
          log(`     ${error}`, 'red');
        } else {
          const personalData = await personalResponse.json();
          const encontrados = personalData.records || [];

          log(`\n  ✓ Registros encontrados: ${encontrados.length}/${ids.length}`, 'green');

          encontrados.forEach(record => {
            const id = record.fields[PF_ID];
            const nombre = record.fields[PF_NOMBRE];
            log(`    • ${id} → ${nombre}`, 'green');
          });

          const noEncontrados = ids.filter(
            id => !encontrados.some(r => r.fields[PF_ID] === id)
          );

          if (noEncontrados.length > 0) {
            log(`\n  ⚠️  IDs no encontrados en tabla Personal:`, 'yellow');
            noEncontrados.forEach(id => log(`    • ${id}`, 'red'));
          }
        }
      }
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    if (error.stack) log(error.stack, 'red');
    process.exit(1);
  }

  log('\n═══════════════════════════════════════════════', 'cyan');
  log('   DIAGNÓSTICO COMPLETADO', 'cyan');
  log('═══════════════════════════════════════════════\n', 'cyan');
}

main().catch(err => {
  log(`\n❌ Error fatal: ${err.message}`, 'red');
  process.exit(1);
});
