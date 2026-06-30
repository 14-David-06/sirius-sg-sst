#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════
 * Script de Migración: Personal que se transporta en MOTO
 * ═══════════════════════════════════════════════════════════════════
 *
 * Importa datos desde Excel al módulo de seguimiento vehicular
 *
 * IMPORTANTE:
 * - Requiere que el servidor Next.js esté corriendo en el puerto configurado
 * - Lee el archivo Excel: docs/Personal que se transporta en MOTO.xlsx
 * - Valida y transforma los datos antes de insertar
 * - Genera reporte de éxitos y errores
 *
 * Uso:
 *   node scripts/migrar-vehiculos-excel.js [--dry-run] [--port=3000]
 *
 * Flags:
 *   --dry-run    Modo simulación (no inserta datos, solo valida)
 *   --port=XXXX  Puerto del servidor Next.js (default: 3000)
 *   --url=...    URL completa del servidor (override port)
 * ═══════════════════════════════════════════════════════════════════
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// Configuración
// ═══════════════════════════════════════════════════════════════════

const CONFIG = {
  excelPath: path.join(__dirname, '..', 'docs', 'Personal que se transporta en MOTO.xlsx'),
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  dryRun: process.argv.includes('--dry-run'),
  hojaActivos: 'ACTIVOS',
  filaPrimeraPersona: 6, // Fila donde inician los datos de personas
};

// Parsear argumentos
const portArg = process.argv.find(arg => arg.startsWith('--port='));
if (portArg) {
  const port = portArg.split('=')[1];
  CONFIG.apiBaseUrl = `http://localhost:${port}`;
}

const urlArg = process.argv.find(arg => arg.startsWith('--url='));
if (urlArg) {
  CONFIG.apiBaseUrl = urlArg.split('=')[1];
}

// ═══════════════════════════════════════════════════════════════════
// Utilidades
// ═══════════════════════════════════════════════════════════════════

const colores = {
  reset: '\x1b[0m',
  rojo: '\x1b[31m',
  verde: '\x1b[32m',
  amarillo: '\x1b[33m',
  azul: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(tipo, mensaje) {
  const timestamp = new Date().toISOString().substr(11, 8);
  const prefix = {
    info: `${colores.azul}[INFO]${colores.reset}`,
    exito: `${colores.verde}[✓]${colores.reset}`,
    error: `${colores.rojo}[✗]${colores.reset}`,
    advertencia: `${colores.amarillo}[⚠]${colores.reset}`,
    debug: `${colores.cyan}[DEBUG]${colores.reset}`,
  }[tipo] || '[LOG]';

  console.log(`${timestamp} ${prefix} ${mensaje}`);
}

function normalizeDate(value) {
  if (!value || value === 'x' || value === '') return null;

  // Si es un objeto Date de Excel
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // Si es string, intentar parsearlo
  if (typeof value === 'string') {
    // Limpiar formatos raros como "16/04/2026-05/08/2026"
    const dateMatch = value.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      const [day, month, year] = dateMatch[1].split('/');
      return `${year}-${month}-${day}`;
    }

    // Si ya está en formato ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.split('T')[0];
    }
  }

  return null;
}

/**
 * Busca colaborador en la base de Nómina Core por cédula
 */
async function buscarColaboradorPorCedula(cedula) {
  try {
    // Usar endpoint /api/personal que no requiere validación de acceso
    const response = await fetch(`${CONFIG.apiBaseUrl}/api/personal`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Estructura esperada: { success: true, data: [...], total: N }
    if (data.success && Array.isArray(data.data)) {
      const colaborador = data.data.find(
        (p) => p.numeroDocumento === cedula.toString()
      );

      if (colaborador) {
        return {
          idEmpleado: colaborador.idEmpleado,
          nombreCompleto: colaborador.nombreCompleto || 'Sin nombre',
          area: colaborador.areas?.[0] || 'Sin área', // Primera área si existe
        };
      }
    }

    return null;
  } catch (error) {
    log('error', `Error buscando colaborador ${cedula}: ${error.message}`);
    return null;
  }
}

/**
 * Determina el tipo de vehículo
 * Por defecto todos son motos según el archivo
 */
function determinarTipoVehiculo(datoExcel) {
  // El archivo se llama "Personal que se transporta en MOTO"
  // Asumimos todos son Motocicleta a menos que se especifique otra cosa
  return 'Motocicleta';
}

/**
 * Determina el tipo de propietario comparando nombres
 */
function determinarTipoPropietario(nombreColaborador, apellidoColaborador, propietarioNombre) {
  if (!propietarioNombre || propietarioNombre === 'x' || propietarioNombre === '') {
    return 'Colaborador'; // Asumir colaborador si no hay dato
  }

  const nombreCompleto = `${nombreColaborador} ${apellidoColaborador}`.toUpperCase();
  const propietario = propietarioNombre.toUpperCase();

  // Si el propietario contiene el nombre del colaborador
  if (propietario.includes(nombreColaborador.toUpperCase()) &&
      propietario.includes(apellidoColaborador.toUpperCase())) {
    return 'Colaborador';
  }

  // Si contiene palabras clave de familia
  if (propietario.includes('PADRE') || propietario.includes('MADRE') ||
      propietario.includes('HERMANO') || propietario.includes('ESPOSO') ||
      propietario.includes('ESPOSA')) {
    return 'Tercero';
  }

  // Por defecto, si el nombre no coincide, es de tercero
  return 'Tercero';
}

/**
 * Genera una placa ficticia para vehículos sin placa
 * Formato: SIN001, SIN002, etc.
 */
let contadorPlacasFicticias = 1;
function generarPlacaFicticia() {
  const num = String(contadorPlacasFicticias).padStart(2, '0');
  contadorPlacasFicticias++;
  return `SIN${num}D`; // Formato de moto: ABC12D
}

// ═══════════════════════════════════════════════════════════════════
// API Calls
// ═══════════════════════════════════════════════════════════════════

async function registrarVehiculo(datos) {
  const url = `${CONFIG.apiBaseUrl}/api/sgsst/vehicular/vehiculos`;

  const payload = {
    idPersonalCore: datos.idPersonalCore,
    placa: datos.placa,
    tipoVehiculo: datos.tipoVehiculo,
    propietarioNombre: datos.propietarioNombre,
    propietarioTipo: datos.propietarioTipo,
    propietarioDocumento: datos.propietarioDocumento || '',
    observaciones: datos.observaciones || '',
  };

  if (CONFIG.dryRun) {
    log('debug', `[DRY-RUN] POST ${url}`);
    log('debug', `  Payload: ${JSON.stringify(payload, null, 2)}`);
    return { success: true, id: 'dry-run-id', dryRun: true };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Error desconocido' };
    }

    return { success: true, id: result.vehiculo.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function registrarDocumento(vehiculoId, tipo, fechaVencimiento, observaciones = '') {
  const url = `${CONFIG.apiBaseUrl}/api/sgsst/vehicular/documentos`;

  const payload = {
    vehiculoId,
    tipoDocumento: tipo, // "SOAT" o "Tecnomecánica"
    numeroDocumento: '',
    entidadEmisora: '',
    fechaExpedicion: '',
    fechaVencimiento,
    urlDocumento: '',
  };

  if (CONFIG.dryRun) {
    log('debug', `[DRY-RUN] POST ${url}`);
    log('debug', `  Payload: ${JSON.stringify(payload, null, 2)}`);
    return { success: true, dryRun: true };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Error desconocido' };
    }

    return { success: true, id: result.documento.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Procesamiento Principal
// ═══════════════════════════════════════════════════════════════════

async function procesarExcel() {
  log('info', '═══════════════════════════════════════════════════════════════');
  log('info', ' MIGRACIÓN: Personal que se transporta en MOTO → Sistema Vehicular');
  log('info', '═══════════════════════════════════════════════════════════════');
  log('info', '');
  log('info', `Archivo Excel: ${CONFIG.excelPath}`);
  log('info', `API URL: ${CONFIG.apiBaseUrl}`);
  log('info', `Modo: ${CONFIG.dryRun ? 'DRY-RUN (simulación)' : 'EJECUCIÓN REAL'}`);
  log('info', '');

  // Verificar que existe el archivo
  if (!fs.existsSync(CONFIG.excelPath)) {
    log('error', `No se encontró el archivo: ${CONFIG.excelPath}`);
    process.exit(1);
  }

  // Cargar Excel
  log('info', 'Cargando archivo Excel...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(CONFIG.excelPath);

  const worksheet = workbook.getWorksheet(CONFIG.hojaActivos);
  if (!worksheet) {
    log('error', `No se encontró la hoja "${CONFIG.hojaActivos}" en el archivo`);
    process.exit(1);
  }

  log('exito', `Hoja "${CONFIG.hojaActivos}" cargada: ${worksheet.rowCount} filas`);
  log('info', '');

  // Leer datos
  const registros = [];
  let filaActual = CONFIG.filaPrimeraPersona;

  log('info', 'Leyendo registros del Excel...');

  while (filaActual <= worksheet.rowCount) {
    const row = worksheet.getRow(filaActual);

    // Columnas: # | CÉDULA | NOMBRES | APELLIDOS | TECNO-MECÁNICA | VENC. SOAT | PROPIETARIO
    const numero = row.getCell(1).value;
    const cedula = row.getCell(2).value;
    const nombres = row.getCell(3).value;
    const apellidos = row.getCell(4).value;
    const tecnomecanica = row.getCell(5).value;
    const soat = row.getCell(6).value;
    const propietario = row.getCell(7).value;

    if (!cedula) {
      filaActual++;
      continue; // Saltar filas vacías
    }

    registros.push({
      fila: filaActual,
      numero,
      cedula: cedula.toString(),
      nombres: nombres || '',
      apellidos: apellidos || '',
      tecnomecanica: normalizeDate(tecnomecanica),
      soat: normalizeDate(soat),
      propietario: propietario || '',
    });

    filaActual++;
  }

  log('exito', `Se encontraron ${registros.length} colaboradores con vehículos`);
  log('info', '');
  log('info', '─────────────────────────────────────────────────────────────────');
  log('info', ' FASE 1: Validación y Búsqueda de Colaboradores');
  log('info', '─────────────────────────────────────────────────────────────────');
  log('info', '');

  // Validar y enriquecer datos
  const registrosValidados = [];
  const errores = [];

  for (const registro of registros) {
    log('info', `[${registro.numero}] Procesando: ${registro.nombres} ${registro.apellidos} (${registro.cedula})`);

    // Buscar colaborador en Nómina Core
    const colaborador = await buscarColaboradorPorCedula(registro.cedula);

    if (!colaborador) {
      const error = `Colaborador con cédula ${registro.cedula} NO encontrado en Nómina Core`;
      log('error', `  ${error}`);
      errores.push({ fila: registro.fila, cedula: registro.cedula, error });
      continue;
    }

    log('exito', `  Encontrado: ${colaborador.idEmpleado} - ${colaborador.nombreCompleto}`);

    // Determinar placa (ficticia si no hay dato)
    const placa = generarPlacaFicticia(); // Siempre generamos ficticia porque el Excel no tiene placas
    log('advertencia', `  Sin placa registrada, asignando placa temporal: ${placa}`);

    // Determinar tipo de vehículo
    const tipoVehiculo = determinarTipoVehiculo(registro);

    // Determinar tipo de propietario
    const tipoPropietario = determinarTipoPropietario(
      registro.nombres,
      registro.apellidos,
      registro.propietario
    );

    log('info', `  Tipo vehículo: ${tipoVehiculo}`);
    log('info', `  Propietario: ${registro.propietario || 'Sin dato'} (${tipoPropietario})`);
    log('info', `  SOAT: ${registro.soat || 'Sin dato'}`);
    log('info', `  Tecnomecánica: ${registro.tecnomecanica || 'Sin dato'}`);

    registrosValidados.push({
      ...registro,
      idPersonalCore: colaborador.idEmpleado,
      nombreCompleto: colaborador.nombreCompleto,
      area: colaborador.area,
      placa,
      tipoVehiculo,
      tipoPropietario,
    });

    log('info', '');
  }

  log('info', '─────────────────────────────────────────────────────────────────');
  log('info', ` RESULTADOS VALIDACIÓN: ${registrosValidados.length}/${registros.length} OK`);
  log('info', '─────────────────────────────────────────────────────────────────');
  log('info', '');

  if (errores.length > 0) {
    log('advertencia', `Se encontraron ${errores.length} errores:`);
    errores.forEach((e, i) => {
      log('advertencia', `  ${i + 1}. Fila ${e.fila} - ${e.error}`);
    });
    log('info', '');
  }

  if (registrosValidados.length === 0) {
    log('error', 'No hay registros válidos para migrar');
    process.exit(1);
  }

  // Confirmar antes de insertar
  if (!CONFIG.dryRun) {
    log('advertencia', '¿CONFIRMAS LA MIGRACIÓN REAL A AIRTABLE?');
    log('advertencia', `Se insertarán ${registrosValidados.length} vehículos con sus documentos`);
    log('info', '');
    log('info', 'Presiona Ctrl+C para cancelar o espera 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    log('info', '');
  }

  log('info', '─────────────────────────────────────────────────────────────────');
  log('info', ' FASE 2: Inserción en el Sistema');
  log('info', '─────────────────────────────────────────────────────────────────');
  log('info', '');

  const exitosos = [];
  const fallidos = [];

  for (const registro of registrosValidados) {
    log('info', `[${registro.numero}] Registrando vehículo: ${registro.placa}`);

    // 1. Registrar vehículo
    const resultVehiculo = await registrarVehiculo({
      idPersonalCore: registro.idPersonalCore,
      placa: registro.placa,
      tipoVehiculo: registro.tipoVehiculo,
      propietarioNombre: registro.propietario || registro.nombreCompleto,
      propietarioTipo: registro.tipoPropietario,
      propietarioDocumento: '',
      observaciones: `Migrado desde Excel el ${new Date().toISOString().split('T')[0]}. Placa temporal asignada (Excel no contenía placas).`,
    });

    if (!resultVehiculo.success) {
      log('error', `  Error: ${resultVehiculo.error}`);
      fallidos.push({ ...registro, error: resultVehiculo.error });
      continue;
    }

    const vehiculoId = resultVehiculo.id;
    log('exito', `  Vehículo creado: ${vehiculoId}`);

    // 2. Registrar SOAT (si existe)
    if (registro.soat) {
      const resultSoat = await registrarDocumento(vehiculoId, 'SOAT', registro.soat);
      if (resultSoat.success) {
        log('exito', `  SOAT registrado: vence ${registro.soat}`);
      } else {
        log('advertencia', `  No se pudo registrar SOAT: ${resultSoat.error}`);
      }
    } else {
      log('advertencia', `  SOAT: sin dato en Excel`);
    }

    // 3. Registrar Tecnomecánica (si existe)
    if (registro.tecnomecanica) {
      const resultTecno = await registrarDocumento(vehiculoId, 'Tecnomecánica', registro.tecnomecanica);
      if (resultTecno.success) {
        log('exito', `  Tecnomecánica registrada: vence ${registro.tecnomecanica}`);
      } else {
        log('advertencia', `  No se pudo registrar tecnomecánica: ${resultTecno.error}`);
      }
    } else {
      log('advertencia', `  Tecnomecánica: sin dato en Excel`);
    }

    exitosos.push(registro);
    log('info', '');
  }

  // Reporte final
  log('info', '═══════════════════════════════════════════════════════════════');
  log('info', ' REPORTE FINAL');
  log('info', '═══════════════════════════════════════════════════════════════');
  log('info', '');
  log('info', `Total registros en Excel:     ${registros.length}`);
  log('info', `Validados correctamente:      ${registrosValidados.length}`);
  log('exito', `Insertados con éxito:         ${exitosos.length}`);
  log('error', `Fallidos:                     ${fallidos.length + errores.length}`);
  log('info', '');

  if (fallidos.length > 0) {
    log('error', 'Registros fallidos en inserción:');
    fallidos.forEach((f, i) => {
      log('error', `  ${i + 1}. ${f.cedula} - ${f.error}`);
    });
    log('info', '');
  }

  if (errores.length > 0) {
    log('error', 'Colaboradores no encontrados en Nómina Core:');
    errores.forEach((e, i) => {
      log('error', `  ${i + 1}. Cédula ${e.cedula} (Fila ${e.fila})`);
    });
    log('info', '');
  }

  if (CONFIG.dryRun) {
    log('info', '');
    log('advertencia', '═══════════════════════════════════════════════════════════════');
    log('advertencia', ' MODO DRY-RUN: NINGÚN DATO FUE INSERTADO');
    log('advertencia', ' Para ejecutar la migración real, ejecuta sin --dry-run');
    log('advertencia', '═══════════════════════════════════════════════════════════════');
  } else {
    log('info', '');
    log('exito', '═══════════════════════════════════════════════════════════════');
    log('exito', ' MIGRACIÓN COMPLETADA');
    log('exito', '═══════════════════════════════════════════════════════════════');
  }

  log('info', '');
}

// ═══════════════════════════════════════════════════════════════════
// Ejecutar
// ═══════════════════════════════════════════════════════════════════

procesarExcel()
  .then(() => {
    log('info', 'Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    log('error', `Error fatal: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
