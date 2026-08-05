/**
 * Script final de optimización de variables de entorno
 * - Elimina duplicados (conserva la primera ocurrencia)
 * - Elimina variables no utilizadas
 * - Genera reporte detallado
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Variables a eliminar (no utilizadas)
const unusedVars = new Set([
  'API_KEY_SIRIUS_SG_SST',
  'AES_DECRYPT_PASSWORD',
  'AIRTABLE_EXTINTORES_NUMERO',
  'AIRTABLE_EXTINTORES_TIPO_LINK',
  'AIRTABLE_EXTINTORES_CAPACIDAD',
  'AIRTABLE_EXTINTORES_CLASE_AGENTE',
  'AIRTABLE_EXTINTORES_UBICACION_LINK',
  'AIRTABLE_EXTINTORES_FECHA_RECARGA',
  'AIRTABLE_EXTINTORES_FECHA_INSTALACION',
  'AIRTABLE_CAMILLAS_UBICACION_LINK',
  'AIRTABLE_CAMILLAS_FECHA_INSTALACION',
  'AIRTABLE_ELEMCAM_CANTIDAD_ESTANDAR',
  'AIRTABLE_ELEMCAM_DESCRIPCION',
  'AIRTABLE_VERKIT_KIT_LINK',
  'AIRTABLE_VERKIT_ALMACENAMIENTO',
  'AIRTABLE_VERKIT_ROTULADO',
  'AIRTABLE_KITS_CODIGO',
  'AIRTABLE_KITS_NOMBRE',
  'AIRTABLE_KITS_UBICACION_LINK',
  'AIRTABLE_KITS_FECHA_INSTALACION',
  'AIRTABLE_KITS_ESTADO',
  'AIRTABLE_ELEMKIT_CANTIDAD_ESTANDAR',
  'AIRTABLE_ELEMKIT_REQUIERE_VENCIMIENTO',
  'AIRTABLE_ELEMKIT_DESCRIPCION',
  'AIRTABLE_EXTINTORES_ID_AREA_CORE',
  'AIRTABLE_CAMILLAS_ID_AREA_CORE',
  'AIRTABLE_KITS_ID_AREA_CORE',
  'AIRTABLE_DETINSPA_FOTO_URL',
  'AIRTABLE_NOMINA_CORE_BASE_ID'
]);

const envLines = envContent.split('\n');
const seenVars = new Set();
const cleanedLines = [];
const duplicatesRemoved = [];
const unusedRemoved = [];

envLines.forEach((line, index) => {
  const trimmed = line.trim();

  // Conservar comentarios y líneas vacías
  if (!trimmed || trimmed.startsWith('#')) {
    cleanedLines.push(line);
    return;
  }

  const match = trimmed.match(/^([A-Z_0-9]+)=/);
  if (!match) {
    cleanedLines.push(line);
    return;
  }

  const varName = match[1];

  // Eliminar variables no utilizadas
  if (unusedVars.has(varName)) {
    unusedRemoved.push(`${varName} (línea ${index + 1})`);
    return;
  }

  // Eliminar duplicados (conservar solo la primera)
  if (seenVars.has(varName)) {
    duplicatesRemoved.push(`${varName} (línea ${index + 1})`);
    return;
  }

  seenVars.add(varName);
  cleanedLines.push(line);
});

// Generar archivo limpio
const cleanedContent = cleanedLines.join('\n');
const outputPath = path.join(__dirname, '.env.local.optimized');
fs.writeFileSync(outputPath, cleanedContent);

// Reporte
console.log('🚀 OPTIMIZACIÓN COMPLETA\n');
console.log('📊 ESTADÍSTICAS:');
console.log(`  Variables originales: ${envLines.length} líneas`);
console.log(`  Variables únicas en código: ${seenVars.size}`);
console.log(`  Variables duplicadas eliminadas: ${duplicatesRemoved.length}`);
console.log(`  Variables no utilizadas eliminadas: ${unusedRemoved.length}`);
console.log(`  Total de líneas eliminadas: ${duplicatesRemoved.length + unusedRemoved.length}`);
console.log(`  Archivo optimizado: ${cleanedLines.length} líneas\n`);

const originalSize = Buffer.byteLength(envContent, 'utf8');
const optimizedSize = Buffer.byteLength(cleanedContent, 'utf8');
const savedBytes = originalSize - optimizedSize;
const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

console.log('💾 AHORRO DE ESPACIO:');
console.log(`  Tamaño original: ${(originalSize / 1024).toFixed(2)} KB`);
console.log(`  Tamaño optimizado: ${(optimizedSize / 1024).toFixed(2)} KB`);
console.log(`  Ahorro: ${(savedBytes / 1024).toFixed(2)} KB (${savedPercent}%)\n`);

console.log('🗑️  DUPLICADOS ELIMINADOS:');
duplicatesRemoved.slice(0, 10).forEach(item => console.log(`  - ${item}`));
if (duplicatesRemoved.length > 10) {
  console.log(`  ... y ${duplicatesRemoved.length - 10} más`);
}

console.log('\n❌ VARIABLES NO UTILIZADAS ELIMINADAS:');
unusedRemoved.forEach(item => console.log(`  - ${item}`));

console.log('\n✅ Archivo optimizado generado: .env.local.optimized');
console.log('\n⚠️  PASOS SIGUIENTES:');
console.log('  1. Revisa el archivo .env.local.optimized');
console.log('  2. Haz un backup de tu .env.local actual');
console.log('  3. Renombra .env.local.optimized a .env.local');
console.log('  4. Prueba la aplicación localmente');
console.log('  5. Si todo funciona, deploya a producción\n');
