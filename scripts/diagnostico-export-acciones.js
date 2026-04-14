/**
 * Diagnóstico: Simula la lógica EXACTA de exportar/route.ts y exportar-pdf/route.ts
 * para verificar si las acciones correctivas se asocian correctamente.
 * 
 * Ejecutar: node scripts/diagnostico-export-acciones.js
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = "https://api.airtable.com/v0";
const BASE_ID = process.env.AIRTABLE_SGSST_BASE_ID;
const TOKEN = process.env.AIRTABLE_SGSST_API_TOKEN;

// Table IDs (exactamente los mismos que usa el export)
const INSPECCIONES_TABLE = process.env.AIRTABLE_INSPA_TABLE_ID;
const DETALLE_TABLE = process.env.AIRTABLE_DETINSPA_TABLE_ID;
const ACCIONES_TABLE = process.env.AIRTABLE_ACCINSPA_TABLE_ID;
const RESP_TABLE = process.env.AIRTABLE_RESPINSPA_TABLE_ID;

// Field IDs — inspecciones cabecera
const INSPA = {
  ID: process.env.AIRTABLE_INSPA_ID,
  FECHA: process.env.AIRTABLE_INSPA_FECHA,
  AREA: process.env.AIRTABLE_INSPA_AREA,
  ESTADO: process.env.AIRTABLE_INSPA_ESTADO,
  INSPECTOR: process.env.AIRTABLE_INSPA_INSPECTOR,
  ACCIONES_LINK: process.env.AIRTABLE_INSPA_ACCIONES_LINK,
};

// Field IDs — detalle inspección
const DET = {
  INSPECCION_LINK: process.env.AIRTABLE_DETINSPA_INSPECCION_LINK,
  CATEGORIA: process.env.AIRTABLE_DETINSPA_CATEGORIA,
  CRITERIO: process.env.AIRTABLE_DETINSPA_CRITERIO,
  CONDICION: process.env.AIRTABLE_DETINSPA_CONDICION,
};

// Field IDs — acciones correctivas
const ACC = {
  ID: process.env.AIRTABLE_ACCINSPA_ID,
  INSPECCION_LINK: process.env.AIRTABLE_ACCINSPA_INSPECCION_LINK,
  DESCRIPCION: process.env.AIRTABLE_ACCINSPA_DESCRIPCION,
  TIPO: process.env.AIRTABLE_ACCINSPA_TIPO,
  RESPONSABLE: process.env.AIRTABLE_ACCINSPA_RESPONSABLE,
  FECHA_PROPUESTA: process.env.AIRTABLE_ACCINSPA_FECHA_PROPUESTA,
  ESTADO: process.env.AIRTABLE_ACCINSPA_ESTADO,
};

// Field IDs — responsables
const RESP = {
  INSPECCION_LINK: process.env.AIRTABLE_RESPINSPA_INSPECCION_LINK,
  TIPO: process.env.AIRTABLE_RESPINSPA_TIPO,
  NOMBRE: process.env.AIRTABLE_RESPINSPA_NOMBRE,
};

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function fetchAllRecords(tableId, extraParams = {}) {
  const all = [];
  let offset = "";
  do {
    const params = new URLSearchParams({
      pageSize: "100",
      returnFieldsByFieldId: "true",
      ...extraParams,
    });
    if (offset) params.set("offset", offset);
    const url = `${BASE_URL}/${BASE_ID}/${tableId}?${params.toString()}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Airtable error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    all.push(...data.records);
    offset = data.offset || "";
  } while (offset);
  return all;
}

function sep(title) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(70)}`);
}

async function main() {
  sep("SIMULACIÓN EXACTA DE exportar/route.ts");

  // ── 1. Obtener inspecciones (cabeceras) ──
  console.log("\n📋 Paso 1: Fetch inspecciones (cabecera)...");
  const cabeceraRecords = await fetchAllRecords(INSPECCIONES_TABLE);
  console.log(`   → ${cabeceraRecords.length} inspecciones encontradas`);
  
  cabeceraRecords.forEach((r) => {
    console.log(`   [${r.id}] ${r.fields[INSPA.ID]} | Área: ${r.fields[INSPA.AREA]} | Fecha: ${r.fields[INSPA.FECHA]}`);
  });

  // ── 2. Obtener TODOS los detalles ──
  console.log("\n📋 Paso 2: Fetch detalles (criterios) — TODOS sin filtro...");
  const detalleRecords = await fetchAllRecords(DETALLE_TABLE);
  console.log(`   → ${detalleRecords.length} registros de detalle`);

  const criteriosMap = {};
  detalleRecords.forEach((r) => {
    const links = r.fields[DET.INSPECCION_LINK] || [];
    links.forEach((inspId) => {
      if (!criteriosMap[inspId]) criteriosMap[inspId] = [];
      criteriosMap[inspId].push(r);
    });
  });

  console.log("   Mapa de criterios:");
  for (const [inspId, criterios] of Object.entries(criteriosMap)) {
    const insp = cabeceraRecords.find((c) => c.id === inspId);
    const label = insp ? insp.fields[INSPA.ID] : "(desconocido)";
    console.log(`     ${inspId} (${label}) → ${criterios.length} criterios`);
  }

  // ── 3. Obtener TODAS las acciones correctivas ──
  console.log("\n📋 Paso 3: Fetch acciones correctivas — TODOS sin filtro...");
  const accionesRecords = await fetchAllRecords(ACCIONES_TABLE);
  console.log(`   → ${accionesRecords.length} acciones correctivas encontradas`);

  if (accionesRecords.length === 0) {
    console.log("\n   ⚠️  ¡TABLA VACÍA! No hay acciones correctivas.");
    console.log("   Esto significa que la sección del reporte mostrará filas vacías.");
  }

  const accionesMap = {};
  accionesRecords.forEach((r) => {
    const links = r.fields[ACC.INSPECCION_LINK] || [];
    console.log(`   Acción [${r.id}]: INSPECCION_LINK = ${JSON.stringify(links)}`);
    console.log(`     Descripción: "${r.fields[ACC.DESCRIPCION] || "(vacío)"}" | Tipo: ${r.fields[ACC.TIPO] || "(vacío)"}`);
    links.forEach((inspId) => {
      if (!accionesMap[inspId]) accionesMap[inspId] = [];
      accionesMap[inspId].push(r);
    });
  });

  console.log("\n   Mapa de acciones (accionesMap):");
  if (Object.keys(accionesMap).length === 0) {
    console.log("     (vacío — ninguna acción vinculada a ninguna inspección)");
  } else {
    for (const [inspId, acciones] of Object.entries(accionesMap)) {
      const insp = cabeceraRecords.find((c) => c.id === inspId);
      const label = insp ? insp.fields[INSPA.ID] : "⚠️ RECORD ID NO CORRESPONDE A NINGUNA INSPECCIÓN";
      console.log(`     ${inspId} (${label}) → ${acciones.length} acciones`);
    }
  }

  // ── 4. Construir inspecciones completas ──
  sep("RESULTADO FINAL (lo que recibe el generador del reporte)");
  
  cabeceraRecords.forEach((r) => {
    const id = r.fields[INSPA.ID];
    const recordId = r.id;
    const criterios = criteriosMap[recordId] || [];
    const acciones = accionesMap[recordId] || [];

    console.log(`\n  📄 ${id} (recordId: ${recordId})`);
    console.log(`     Área: ${r.fields[INSPA.AREA]} | Fecha: ${r.fields[INSPA.FECHA]}`);
    console.log(`     Criterios: ${criterios.length}`);
    console.log(`     Acciones correctivas: ${acciones.length}`);

    if (acciones.length > 0) {
      console.log("     ✅ ACCIONES QUE APARECERÁN EN EL REPORTE:");
      acciones.forEach((a, i) => {
        console.log(`       [${i + 1}] ${a.fields[ACC.DESCRIPCION] || "(sin descripción)"}`);
        console.log(`           Tipo: ${a.fields[ACC.TIPO]} | Responsable: ${a.fields[ACC.RESPONSABLE] || "(vacío)"} | Fecha: ${a.fields[ACC.FECHA_PROPUESTA]}`);
      });
    } else {
      console.log("     ⚠️  SIN ACCIONES — El reporte mostrará 3 filas vacías (mínimo)");
    }

    // Verificar con ACCIONES_LINK de la cabecera (comparación)
    const accionesLinkFromCabecera = r.fields[INSPA.ACCIONES_LINK] || [];
    if (accionesLinkFromCabecera.length !== acciones.length) {
      console.log(`     🔍 COMPARACIÓN: ACCIONES_LINK cabecera = ${accionesLinkFromCabecera.length} vs INSPECCION_LINK = ${acciones.length}`);
      if (accionesLinkFromCabecera.length > acciones.length) {
        console.log(`        ⚠️ Hay ${accionesLinkFromCabecera.length - acciones.length} acciones en ACCIONES_LINK que NO están en la tabla`);
      }
    }
  });

  sep("DIAGNÓSTICO FINAL");
  
  const totalInsp = cabeceraRecords.length;
  const totalAcciones = accionesRecords.length;
  const inspConAcciones = cabeceraRecords.filter((r) => (accionesMap[r.id] || []).length > 0).length;
  
  console.log(`Total inspecciones: ${totalInsp}`);
  console.log(`Total acciones correctivas en tabla: ${totalAcciones}`);
  console.log(`Inspecciones que mostrarán acciones en reporte: ${inspConAcciones}/${totalInsp}`);
  
  if (totalAcciones === 0) {
    console.log("\n🔴 PROBLEMA: La tabla de acciones está vacía.");
    console.log("   El reporte SIEMPRE mostrará 3 filas vacías en la sección de acciones.");
  } else if (inspConAcciones === 0) {
    console.log("\n🔴 PROBLEMA: Las acciones existen pero NO se vinculan a inspecciones.");
    console.log("   Revisar campo INSPECCION_LINK en las acciones.");
  } else if (inspConAcciones < totalInsp) {
    console.log(`\n🟡 ${totalInsp - inspConAcciones} inspecciones no tienen acciones (normal si no hubo hallazgos).`);
  } else {
    console.log("\n🟢 Todas las inspecciones con acciones se exportan correctamente.");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
