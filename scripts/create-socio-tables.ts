/**
 * Script para crear las tablas del módulo Sociodemográfico en Airtable
 * Base: Sirius SG-SST (appBU8J9xGIFJSOVc)
 *
 * Ejecutar con: npx tsx scripts/create-socio-tables.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar .env.local desde la raíz del proyecto
config({ path: resolve(process.cwd(), '.env.local') });

const AIRTABLE_TOKEN = process.env.AIRTABLE_SGSST_API_TOKEN;
const BASE_ID = process.env.AIRTABLE_SGSST_BASE_ID;
const PERSONAL_TABLE_ID = 'tblJNdYasZrhBniJj'; // Tabla Personal de Nómina Core

if (!AIRTABLE_TOKEN || !BASE_ID) {
  console.error('❌ Faltan variables de entorno AIRTABLE_SGSST_API_TOKEN o AIRTABLE_SGSST_BASE_ID');
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

async function createTable(name: string, fields: any[], description?: string) {
  console.log(`\n📋 Creando tabla: ${name}...`);

  // Separar campos formula de los demás
  const regularFields = fields.filter((f) => f.type !== 'formula');
  const formulaFields = fields.filter((f) => f.type === 'formula');

  const response = await fetch(`${AIRTABLE_API}/${BASE_ID}/tables`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      fields: regularFields,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const errorObj = JSON.parse(errorText);

    // Si ya existe, intentar obtenerla de la lista
    if (errorObj.error?.type === 'DUPLICATE_TABLE_NAME') {
      console.log(`⚠️  Tabla ${name} ya existe, buscando...`);
      const tables = await listTables();
      const existing = tables.find((t: any) => t.name === name);
      if (existing) {
        console.log(`✅ Tabla ${name} encontrada con ID: ${existing.id}`);
        return existing;
      }
    }

    throw new Error(`Error creando tabla ${name}: ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ Tabla ${name} creada con ID: ${data.id}`);

  // Agregar campos formula si existen
  for (const formulaField of formulaFields) {
    console.log(`   ➕ Agregando campo formula: ${formulaField.name}...`);
    const addFieldResponse = await fetch(`${AIRTABLE_API}/${BASE_ID}/tables/${data.id}/fields`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formulaField),
    });

    if (!addFieldResponse.ok) {
      const error = await addFieldResponse.text();
      console.warn(`⚠️  No se pudo agregar campo formula ${formulaField.name}: ${error}`);
    } else {
      const fieldData = await addFieldResponse.json();
      // Agregar el campo formula a la lista de fields del data
      data.fields.push(fieldData);
      console.log(`   ✅ Campo formula ${formulaField.name} agregado`);
    }
  }

  return data;
}

async function main() {
  console.log('🚀 Iniciando creación de tablas del módulo Sociodemográfico...');
  console.log(`📍 Base: ${BASE_ID}`);

  const envVars: string[] = [];

  // Variables para almacenar las tablas creadas
  let campanasTable;
  let tokensTable;
  let respuestasTable;
  let informesTable;

  // ═══════════════════════════════════════════════════════════
  // 1. Tabla: socio_campanas
  // ═══════════════════════════════════════════════════════════
  campanasTable = await createTable(
    'socio_campanas',
    [
      { name: 'Nombre', type: 'singleLineText', description: 'Nombre de la campaña' },
      {
        name: 'Periodo',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Semestre_1' },
            { name: 'Semestre_2' },
          ],
        },
      },
      { name: 'Año', type: 'number', options: { precision: 0 }, description: 'Año de la campaña' },
      {
        name: 'Estado',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Activa' },
            { name: 'Cerrada' },
          ],
        },
      },
      { name: 'Fecha_Inicio', type: 'date', options: { dateFormat: { name: 'iso' } } },
      { name: 'Fecha_Cierre', type: 'date', options: { dateFormat: { name: 'iso' } } },
      { name: 'Creado_Por', type: 'singleLineText', description: 'Usuario SST que creó la campaña' },
      {
        name: 'ID_Campana',
        type: 'formula',
        options: { formula: 'CONCATENATE("SOCIO-", RECORD_ID())' },
      },
    ],
    'Campañas de recolección de perfil sociodemográfico'
  );

  envVars.push(`AIRTABLE_SOCIO_CAMPANAS_TABLE_ID=${campanasTable.id}`);
  campanasTable.fields.forEach((f: any) => {
    const varName = `AIRTABLE_SOCIO_CAMPANAS_${f.name.toUpperCase().replace(/_/g, '_')}`;
    envVars.push(`${varName}=${f.id}`);
  });

  // ═══════════════════════════════════════════════════════════
  // 2. Tabla: socio_tokens
  // ═══════════════════════════════════════════════════════════
  tokensTable = await createTable(
    'socio_tokens',
    [
      { name: 'Token', type: 'singleLineText', description: 'UUID único del link de encuesta' },
      {
        name: 'Campana',
        type: 'multipleRecordLinks',
        options: {
          linkedTableId: campanasTable.id,
          isReversed: false,
          prefersSingleRecordLink: false,
        },
      },
      {
        name: 'Personal',
        type: 'multipleRecordLinks',
        options: {
          linkedTableId: PERSONAL_TABLE_ID,
          isReversed: false,
          prefersSingleRecordLink: false,
        },
      },
      { name: 'Usado', type: 'checkbox', options: { icon: 'check', color: 'greenBright' }, description: 'Si el colaborador ya respondió' },
      {
        name: 'Fecha_Uso',
        type: 'dateTime',
        options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'America/Bogota' },
      },
    ],
    'Tokens únicos para acceder a la encuesta'
  );

  envVars.push(`AIRTABLE_SOCIO_TOKENS_TABLE_ID=${tokensTable.id}`);
  tokensTable.fields.forEach((f: any) => {
    const varName = `AIRTABLE_SOCIO_TOKENS_${f.name.toUpperCase().replace(/_/g, '_')}`;
    envVars.push(`${varName}=${f.id}`);
  });

  // ═══════════════════════════════════════════════════════════
  // 3. Tabla: socio_respuestas (48 campos)
  // ═══════════════════════════════════════════════════════════
  respuestasTable = await createTable(
    'socio_respuestas',
    [
      // Referencias
      {
        name: 'Token',
        type: 'multipleRecordLinks',
        options: { linkedTableId: tokensTable.id, isReversed: false, prefersSingleRecordLink: false },
      },
      {
        name: 'Campana',
        type: 'multipleRecordLinks',
        options: { linkedTableId: campanasTable.id, isReversed: false, prefersSingleRecordLink: false },
      },
      {
        name: 'Personal',
        type: 'multipleRecordLinks',
        options: { linkedTableId: PERSONAL_TABLE_ID, isReversed: false, prefersSingleRecordLink: false },
      },
      // Sección 1: Datos personales
      { name: 'nombre_completo', type: 'singleLineText' },
      { name: 'numero_documento', type: 'singleLineText' },
      { name: 'fecha_nacimiento', type: 'date', options: { dateFormat: { name: 'iso' } } },
      {
        name: 'genero',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Masculino' },
            { name: 'Femenino' },
            { name: 'No_binario' },
            { name: 'Prefiero_no_decir' },
          ],
        },
      },
      {
        name: 'estado_civil',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Soltero' },
            { name: 'Casado' },
            { name: 'Union_libre' },
            { name: 'Divorciado' },
            { name: 'Viudo' },
          ],
        },
      },
      // Sección 2: Vivienda
      { name: 'municipio_residencia', type: 'singleLineText' },
      {
        name: 'estrato',
        type: 'singleSelect',
        options: { choices: [{ name: '1' }, { name: '2' }, { name: '3' }, { name: '4' }, { name: '5' }, { name: '6' }] },
      },
      {
        name: 'tipo_vivienda',
        type: 'singleSelect',
        options: { choices: [{ name: 'Propia' }, { name: 'Arrendada' }, { name: 'Familiar' }] },
      },
      {
        name: 'personas_a_cargo',
        type: 'singleSelect',
        options: {
          choices: [{ name: 'Ninguna' }, { name: '1' }, { name: '2' }, { name: '3' }, { name: '4_o_mas' }],
        },
      },
      // Sección 3: Educación
      {
        name: 'escolaridad',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Primaria' },
            { name: 'Bachillerato' },
            { name: 'Tecnico_Tecnologo' },
            { name: 'Profesional' },
            { name: 'Posgrado' },
          ],
        },
      },
      { name: 'estudiando_actualmente', type: 'checkbox', options: { icon: 'check', color: 'blueBright' } },
      { name: 'carrera_actual', type: 'singleLineText' },
      // Sección 4: Trabajo
      {
        name: 'area_trabajo',
        type: 'singleSelect',
        options: {
          choices: [{ name: 'Pirolisis' }, { name: 'Laboratorio' }, { name: 'Bodega' }, { name: 'Administrativo' }],
        },
      },
      { name: 'cargo', type: 'singleLineText' },
      {
        name: 'tipo_contrato',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Termino_fijo' },
            { name: 'Termino_indefinido' },
            { name: 'Prestacion_servicios' },
            { name: 'Aprendiz' },
          ],
        },
      },
      { name: 'fecha_ingreso_sirius', type: 'date', options: { dateFormat: { name: 'iso' } } },
      {
        name: 'turno_trabajo',
        type: 'singleSelect',
        options: {
          choices: [{ name: 'Mañana' }, { name: 'Tarde' }, { name: 'Noche' }, { name: 'Rotativo' }],
        },
      },
      { name: 'otro_empleo', type: 'checkbox', options: { icon: 'check', color: 'yellowBright' } },
      // Sección 5: Salud
      { name: 'enfermedad_cronica', type: 'checkbox', options: { icon: 'check', color: 'redBright' } },
      { name: 'cual_enfermedad_cronica', type: 'singleLineText' },
      { name: 'discapacidad', type: 'checkbox', options: { icon: 'check', color: 'redBright' } },
      { name: 'cual_discapacidad', type: 'singleLineText' },
      { name: 'tratamiento_medico', type: 'checkbox', options: { icon: 'check', color: 'orangeBright' } },
      { name: 'accidentes_trabajo_previos', type: 'checkbox', options: { icon: 'check', color: 'redBright' } },
      { name: 'enfermedad_laboral_previa', type: 'checkbox', options: { icon: 'check', color: 'redBright' } },
      // Sección 6: Hábitos
      {
        name: 'fuma',
        type: 'singleSelect',
        options: { choices: [{ name: 'Si' }, { name: 'No' }, { name: 'Exfumador' }] },
      },
      {
        name: 'alcohol',
        type: 'singleSelect',
        options: { choices: [{ name: 'Nunca' }, { name: 'Ocasionalmente' }, { name: 'Frecuentemente' }] },
      },
      { name: 'practica_deporte', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
      { name: 'cual_deporte', type: 'singleLineText' },
      {
        name: 'tiempo_libre',
        type: 'multipleSelects',
        options: {
          choices: [
            { name: 'Familia_amigos' },
            { name: 'Deportes' },
            { name: 'Leer' },
            { name: 'Musica' },
            { name: 'Videojuegos' },
            { name: 'Series_peliculas' },
            { name: 'Actividades_religiosas' },
            { name: 'Otro' },
          ],
        },
      },
      // Sección 7: Transporte
      {
        name: 'medio_transporte',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'A_pie' },
            { name: 'Bus_Transmilenio' },
            { name: 'Bicicleta' },
            { name: 'Moto' },
            { name: 'Carro_particular' },
            { name: 'Ruta_empresa' },
          ],
        },
      },
      {
        name: 'tiempo_desplazamiento',
        type: 'singleSelect',
        options: {
          choices: [{ name: 'Menos_30min' }, { name: '30_60min' }, { name: '1_2horas' }, { name: 'Mas_2horas' }],
        },
      },
      // Consentimiento
      { name: 'acepta_politica_datos', type: 'checkbox', options: { icon: 'check', color: 'greenBright' }, description: 'Ley 1581 de 2012' },
      { name: 'firma_veracidad', type: 'checkbox', options: { icon: 'check', color: 'greenBright' }, description: 'Declara que la información es veraz' },
    ],
    'Respuestas inmutables de encuestas sociodemográficas'
  );

  envVars.push(`AIRTABLE_SOCIO_RESPUESTAS_TABLE_ID=${respuestasTable.id}`);
  respuestasTable.fields.forEach((f: any) => {
    const varName = `AIRTABLE_SOCIO_RESP_${f.name.toUpperCase().replace(/_/g, '_')}`;
    envVars.push(`${varName}=${f.id}`);
  });

  // ═══════════════════════════════════════════════════════════
  // 4. Tabla: socio_informes
  // ═══════════════════════════════════════════════════════════
  informesTable = await createTable(
    'socio_informes',
    [
      {
        name: 'Campana',
        type: 'multipleRecordLinks',
        options: { linkedTableId: campanasTable.id, isReversed: false, prefersSingleRecordLink: false },
      },
      { name: 'URL_PDF', type: 'singleLineText', description: 'URL del informe en Cloudflare R2' },
      { name: 'Generado_Por', type: 'singleLineText', description: 'Usuario SST que generó el informe' },
      { name: 'Total_Respuestas', type: 'number', options: { precision: 0 }, description: 'Total de encuestas incluidas' },
    ],
    'Informes PDF generados del perfil sociodemográfico'
  );

  envVars.push(`AIRTABLE_SOCIO_INFORMES_TABLE_ID=${informesTable.id}`);
  informesTable.fields.forEach((f: any) => {
    const varName = `AIRTABLE_SOCIO_INFORMES_${f.name.toUpperCase().replace(/_/g, '_')}`;
    envVars.push(`${varName}=${f.id}`);
  });

  // ═══════════════════════════════════════════════════════════
  // Generar archivo .env con todos los IDs
  // ═══════════════════════════════════════════════════════════
  console.log('\n\n📝 Variables de entorno generadas:\n');
  console.log('# ── MÓDULO SOCIODEMOGRÁFICO ─────────────────────────────────────────────────');
  console.log(`AIRTABLE_SOCIO_BASE_ID=${BASE_ID}`);
  console.log('');
  envVars.forEach((v) => console.log(v));

  console.log('\n\n✅ ¡Todas las tablas creadas exitosamente!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Copiar las variables de entorno al final de .env.local');
  console.log('2. Implementar la capa de Domain');
  console.log('3. Implementar los repositorios');
  console.log('4. Implementar los casos de uso');
  console.log('5. Implementar los endpoints API');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
