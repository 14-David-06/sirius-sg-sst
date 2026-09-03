/**
 * Busca programaciones de capacitación para COPASST en un mes específico
 */

import "./_load-env";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function buscarProgramacionesCOPASST(mes: number, anio: number) {
  const {
    programacionCapacitacionesTableId,
    programacionCapacitacionesFields: progF,
    capacitacionesTableId,
    capacitacionesFields: capF,
  } = airtableSGSSTConfig;

  const headers = getSGSSTHeaders();

  console.log(`\n🔍 Paso 1: Buscando capacitaciones para COPASST...`);

  // Primero buscar capacitaciones que sean para COPASST
  const capFormula = encodeURIComponent(
    `OR(
      FIND("COPASST", {${capF.AREA}}),
      FIND("COPASST", {${capF.POBLACION_OBJETIVO}})
    )`
  );

  const capUrl = `${getSGSSTUrl(capacitacionesTableId)}?returnFieldsByFieldId=true&filterByFormula=${capFormula}`;
  const capResponse = await fetch(capUrl, { headers, cache: "no-store" });

  if (!capResponse.ok) {
    console.error("❌ Error al consultar capacitaciones:", capResponse.statusText);
    process.exit(1);
  }

  const capData = await capResponse.json();
  const capacitaciones = capData.records || [];

  if (capacitaciones.length === 0) {
    console.log(`\n❌ No se encontraron capacitaciones para COPASST`);
    return;
  }

  console.log(`✅ Encontradas ${capacitaciones.length} capacitaciones COPASST`);

  // IDs de las capacitaciones COPASST
  const capIds = capacitaciones.map((r: any) => r.id);

  console.log(`\n🔍 Paso 2: Buscando programaciones de agosto 2026...`);

  // Ahora buscar programaciones del mes que tengan esas capacitaciones vinculadas
  const mesNombre = new Date(anio, mes - 1).toLocaleString('es-CO', { month: 'long' }).charAt(0).toUpperCase() +
                    new Date(anio, mes - 1).toLocaleString('es-CO', { month: 'long' }).slice(1);

  const progFormula = encodeURIComponent(
    `{${progF.MES}} = "${mesNombre}"`
  );

  const progUrl = `${getSGSSTUrl(programacionCapacitacionesTableId)}?returnFieldsByFieldId=true&filterByFormula=${progFormula}`;
  const progResponse = await fetch(progUrl, { headers, cache: "no-store" });

  if (!progResponse.ok) {
    console.error("❌ Error al consultar programaciones:", progResponse.statusText);
    process.exit(1);
  }

  const progData = await progResponse.json();
  const allProgs = progData.records || [];

  // Filtrar solo las que tienen capacitaciones COPASST vinculadas
  const copasstProgs = allProgs.filter((prog: any) => {
    const capLinks = prog.fields[progF.CAPACITACION_LINK];
    if (!Array.isArray(capLinks)) return false;
    return capLinks.some(capLink => capIds.includes(capLink));
  });

  if (copasstProgs.length === 0) {
    console.log(`\n❌ No se encontraron programaciones COPASST para ${mesNombre} ${anio}`);
    console.log(`\nCapacitaciones COPASST disponibles:`);
    capacitaciones.forEach((cap: any) => {
      console.log(`   - ${cap.fields[capF.CODIGO] || 'Sin código'}: ${cap.fields[capF.NOMBRE] || 'Sin nombre'}`);
    });
    return;
  }

  console.log(`\n✅ Encontradas ${copasstProgs.length} programaciones COPASST para ${mesNombre} ${anio}:\n`);

  // Para cada programación, obtener el detalle de la capacitación
  for (const prog of copasstProgs) {
    const fields = prog.fields;
    const capLinks = fields[progF.CAPACITACION_LINK] as string[];

    console.log('═'.repeat(60));
    console.log(`📋 ${fields[progF.IDENTIFICADOR] || 'Sin código'}`);
    console.log(`   Record ID: ${prog.id}`);
    console.log(`   Mes: ${fields[progF.MES]}`);
    console.log(`   Fecha Ejecución: ${fields[progF.FECHA_EJECUCION] || 'Sin fecha'}`);
    console.log(`   Programado: ${fields[progF.PROGRAMADO] ? 'Sí' : 'No'}`);
    console.log(`   Ejecutado: ${fields[progF.EJECUTADO] ? 'Sí' : 'No'}`);

    // Buscar detalles de la capacitación
    if (capLinks && capLinks.length > 0) {
      for (const capId of capLinks) {
        const cap = capacitaciones.find((c: any) => c.id === capId);
        if (cap) {
          console.log(`\n   📚 Capacitación vinculada:`);
          console.log(`      Código: ${cap.fields[capF.CODIGO]}`);
          console.log(`      Tema: ${cap.fields[capF.NOMBRE]}`);
          console.log(`      Área: ${cap.fields[capF.AREA]}`);
          console.log(`      Población: ${cap.fields[capF.POBLACION_OBJETIVO]}`);
        }
      }
    }
    console.log();
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Total capacitaciones COPASST: ${capacitaciones.length}`);
  console.log(`   Programaciones en ${mesNombre}: ${copasstProgs.length}`);
  console.log(`\n   IDs de las programaciones:`);
  copasstProgs.forEach((prog: any) => {
    console.log(`   - ${prog.id}`);
  });
}

// Main
const args = process.argv.slice(2);
const mes = args[0] ? parseInt(args[0]) : 8; // Default: agosto
const anio = args[1] ? parseInt(args[1]) : 2026; // Default: 2026

buscarProgramacionesCOPASST(mes, anio)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
