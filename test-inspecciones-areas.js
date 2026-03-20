#!/usr/bin/env node

/**
 * Script de Pruebas - Inspecciones de Áreas
 * ==========================================
 * Script para validar rápidamente la funcionalidad del módulo de inspecciones de áreas.
 *
 * Uso:
 *   node test-inspecciones-areas.js
 *
 * O desde package.json:
 *   npm run test:inspecciones-areas
 */

// Cargar variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}▶${colors.reset} ${colors.cyan}${msg}${colors.reset}`),
  detail: (msg) => console.log(`  ${colors.gray}${msg}${colors.reset}`),
};

// Helper para hacer peticiones
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}

// Generar datos de prueba realistas
function generateTestData() {
  const areas = ['Laboratorio', 'Pirólisis', 'Bodega', 'Administrativa', 'Guaicaramo'];
  const area = areas[Math.floor(Math.random() * areas.length)];

  return {
    fechaInspeccion: new Date().toISOString().split('T')[0],
    inspector: 'Test Inspector',
    area,
    observacionesGenerales: `Inspección de prueba automática del área ${area} - ${new Date().toISOString()}`,
    criterios: [
      {
        categoria: 'Condiciones locativas',
        criterio: 'Pisos en buen estado',
        condicion: 'Bueno',
        observacion: 'Sin observaciones',
      },
      {
        categoria: 'Seguridad y emergencias',
        criterio: 'Extintores disponibles',
        condicion: 'Bueno',
        observacion: 'Extintores vigentes',
      },
      {
        categoria: 'Riesgos químicos',
        criterio: 'Hojas de seguridad disponibles',
        condicion: 'Malo',
        observacion: 'Faltan algunas hojas de seguridad',
      },
    ],
    accionesCorrectivas: [
      {
        descripcion: 'Actualizar hojas de seguridad faltantes',
        tipo: 'Correctiva',
        responsable: 'Responsable SST',
        fechaPropuestaCierre: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ],
    responsables: [
      {
        tipo: 'Responsable',
        nombre: 'Test Responsable',
        cedula: '1234567890',
        cargo: 'Responsable SST',
        firma: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
      {
        tipo: 'COPASST',
        nombre: 'Test COPASST',
        cedula: '0987654321',
        cargo: 'Miembro COPASST',
        firma: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
      {
        tipo: 'Responsable Área',
        nombre: 'Test Responsable Área',
        cedula: '5555555555',
        cargo: 'Jefe de Área',
        firma: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    ],
  };
}

// Tests
const tests = {
  // Test 1: Verificar que el endpoint de responsables SST funciona
  async testResponsablesSST() {
    log.section('Test 1: Cargar Responsables SST');

    const { ok, status, data } = await request('/api/inspecciones-areas?responsables=true');

    if (!ok) {
      log.error(`HTTP ${status} - Error al cargar responsables SST`);
      if (data?.message) log.detail(data.message);
      return false;
    }

    if (!data.success || !Array.isArray(data.responsables)) {
      log.error('Respuesta inválida del servidor');
      log.detail(JSON.stringify(data, null, 2));
      return false;
    }

    log.success(`Se cargaron ${data.responsables.length} responsables SST`);

    if (data.responsables.length === 0) {
      log.warning('No hay responsables SST configurados en la base de datos');
      return false;
    }

    log.detail(`Primer responsable: ${data.responsables[0].nombre}`);
    return true;
  },

  // Test 2: Verificar que el endpoint de personal funciona
  async testPersonal() {
    log.section('Test 2: Cargar Personal Completo');

    const { ok, status, data } = await request('/api/personal');

    if (!ok) {
      log.error(`HTTP ${status} - Error al cargar personal`);
      if (data?.message) log.detail(data.message);
      return false;
    }

    if (!data.success || !Array.isArray(data.data)) {
      log.error('Respuesta inválida del servidor');
      log.detail(JSON.stringify(data, null, 2));
      return false;
    }

    log.success(`Se cargaron ${data.data.length} empleados`);

    if (data.data.length === 0) {
      log.warning('No hay empleados en la base de datos');
      return false;
    }

    // Verificar que los campos necesarios están presentes
    const primerEmpleado = data.data[0];
    const camposRequeridos = ['nombreCompleto', 'numeroDocumento', 'tipoPersonal'];
    const camposFaltantes = camposRequeridos.filter(campo => !primerEmpleado[campo]);

    if (camposFaltantes.length > 0) {
      log.warning(`Campos faltantes en empleado: ${camposFaltantes.join(', ')}`);
    }

    log.detail(`Primer empleado: ${primerEmpleado.nombreCompleto} - ${primerEmpleado.tipoPersonal}`);
    return true;
  },

  // Test 3: Crear una inspección de prueba
  async testCrearInspeccion() {
    log.section('Test 3: Crear Inspección de Prueba');

    const testData = generateTestData();
    log.info(`Área seleccionada: ${testData.area}`);
    log.detail(`Inspector: ${testData.inspector}`);
    log.detail(`Criterios evaluados: ${testData.criterios.length}`);
    log.detail(`Acciones correctivas: ${testData.accionesCorrectivas.length}`);
    log.detail(`Firmas: ${testData.responsables.length}`);

    const { ok, status, data } = await request('/api/inspecciones-areas', {
      method: 'POST',
      body: JSON.stringify(testData),
    });

    if (!ok) {
      log.error(`HTTP ${status} - Error al crear inspección`);
      if (data?.message) log.detail(data.message);
      return false;
    }

    if (!data.success) {
      log.error('No se pudo crear la inspección');
      log.detail(JSON.stringify(data, null, 2));
      return false;
    }

    log.success(`Inspección creada: ${data.data.id}`);
    log.detail(`Fecha: ${data.data.fecha}`);
    log.detail(`Área: ${data.data.area}`);
    log.detail(`Criterios guardados: ${data.data.criteriosEvaluados}`);

    return { id: data.data.id, ...data.data };
  },

  // Test 4: Listar inspecciones
  async testListarInspecciones() {
    log.section('Test 4: Listar Inspecciones');

    const { ok, status, data } = await request('/api/inspecciones-areas');

    if (!ok) {
      log.error(`HTTP ${status} - Error al listar inspecciones`);
      if (data?.message) log.detail(data.message);
      return false;
    }

    if (!data.success || !Array.isArray(data.data)) {
      log.error('Respuesta inválida del servidor');
      log.detail(JSON.stringify(data, null, 2));
      return false;
    }

    log.success(`Se encontraron ${data.total} inspecciones`);

    if (data.data.length > 0) {
      const ultima = data.data[0];
      log.detail(`Última inspección: ${ultima.idInspeccion} - ${ultima.area} (${ultima.fecha})`);
      log.detail(`Estado: ${ultima.estado}`);
      log.detail(`Criterios: ${ultima.cantidadCriterios}, Acciones: ${ultima.cantidadAcciones}`);
    }

    return true;
  },

  // Test 5: Validar estructura de tablas Airtable
  async testEstructuraTablas() {
    log.section('Test 5: Validar Configuración de Variables de Entorno');

    const variablesRequeridas = [
      'AIRTABLE_INSPA_TABLE_ID',
      'AIRTABLE_DETINSPA_TABLE_ID',
      'AIRTABLE_RESPINSPA_TABLE_ID',
      'AIRTABLE_ACCINSPA_TABLE_ID',
    ];

    let todasPresentes = true;

    for (const variable of variablesRequeridas) {
      if (process.env[variable]) {
        log.success(`${variable} configurada`);
      } else {
        log.error(`${variable} NO configurada`);
        todasPresentes = false;
      }
    }

    if (!todasPresentes) {
      log.warning('Algunas variables de entorno no están configuradas');
      log.detail('Asegúrate de haber agregado todas las variables al archivo .env.local');
      return false;
    }

    log.success('Todas las variables de entorno están configuradas');
    return true;
  },
};

// Ejecutar todos los tests
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   PRUEBAS DE INSPECCIONES DE ÁREAS                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  log.info(`URL Base: ${BASE_URL}`);
  log.info(`Fecha: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Ejecutar tests en secuencia
  for (const [name, testFn] of Object.entries(tests)) {
    results.total++;

    try {
      const result = await testFn();

      if (result !== false) {
        results.passed++;
        results.tests.push({ name, status: 'passed', result });
      } else {
        results.failed++;
        results.tests.push({ name, status: 'failed' });
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'error', error: error.message });
      log.error(`Test ${name} falló con excepción: ${error.message}`);
    }
  }

  // Resumen
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   RESUMEN DE PRUEBAS                                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  log.info(`Total de pruebas: ${results.total}`);
  log.success(`Exitosas: ${results.passed}`);
  if (results.failed > 0) {
    log.error(`Fallidas: ${results.failed}`);
  }

  const percentage = Math.round((results.passed / results.total) * 100);
  console.log(`\nPorcentaje de éxito: ${percentage}%\n`);

  // Salir con código apropiado
  process.exit(results.failed > 0 ? 1 : 0);
}

// Ejecutar
runAllTests().catch((error) => {
  log.error(`Error crítico: ${error.message}`);
  console.error(error);
  process.exit(1);
});
