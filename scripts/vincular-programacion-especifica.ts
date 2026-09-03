/**
 * Vincula una programación específica a una plantilla de evaluación
 *
 * Uso:
 *   npx tsx scripts/vincular-programacion-especifica.ts <programacionRecordId> <plantillaRecordId>
 */

import "./_load-env";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function vincularProgramacionEspecifica(programacionRecordId: string, plantillaRecordId: string) {
  const {
    programacionCapacitacionesTableId,
    programacionCapacitacionesFields: progF,
    plantillasEvalTableId,
    plantillasEvalFields: plntF,
    capacitacionesTableId,
    capacitacionesFields: capF,
  } = airtableSGSSTConfig;

  const headers = getSGSSTHeaders();

  console.log(`\n🔍 Obteniendo información de la programación...`);

  // 1. Obtener información de la programación
  const progUrl = `${getSGSSTUrl(programacionCapacitacionesTableId)}/${programacionRecordId}?returnFieldsByFieldId=true`;
  const progRes = await fetch(progUrl, { headers, cache: "no-store" });

  if (!progRes.ok) {
    console.error("❌ Programación no encontrada");
    process.exit(1);
  }

  const progData = await progRes.json();
  const progCodigo = progData.fields[progF.IDENTIFICADOR] as string;
  const progMes = progData.fields[progF.MES] as string;
  const capLinks = progData.fields[progF.CAPACITACION_LINK] as string[];

  console.log(`✅ Programación: ${progCodigo}`);
  console.log(`   Mes: ${progMes}`);

  // Obtener capacitación vinculada
  if (capLinks && capLinks.length > 0) {
    const capUrl = `${getSGSSTUrl(capacitacionesTableId)}/${capLinks[0]}?returnFieldsByFieldId=true`;
    const capRes = await fetch(capUrl, { headers, cache: "no-store" });

    if (capRes.ok) {
      const capData = await capRes.json();
      console.log(`   Capacitación: ${capData.fields[capF.CODIGO]}`);
      console.log(`   Tema: ${capData.fields[capF.NOMBRE]}`);
      console.log(`   Población: ${capData.fields[capF.POBLACION]}`);
    }
  }

  console.log(`\n🔍 Obteniendo información de la plantilla...`);

  // 2. Obtener información de la plantilla
  const plantillaUrl = `${getSGSSTUrl(plantillasEvalTableId)}/${plantillaRecordId}?returnFieldsByFieldId=true`;
  const plantillaRes = await fetch(plantillaUrl, { headers, cache: "no-store" });

  if (!plantillaRes.ok) {
    console.error("❌ Plantilla no encontrada");
    process.exit(1);
  }

  const plantillaData = await plantillaRes.json();
  const plantillaCodigo = plantillaData.fields[plntF.CODIGO] as string;
  const plantillaNombre = plantillaData.fields[plntF.NOMBRE] as string;
  const progActuales = (plantillaData.fields[plntF.PROGRAMACIONES] as string[]) || [];
  const numPreguntas = Array.isArray(plantillaData.fields[plntF.PREGUNTAS_LINK])
    ? plantillaData.fields[plntF.PREGUNTAS_LINK].length
    : 0;

  console.log(`✅ Plantilla: ${plantillaCodigo}`);
  console.log(`   Nombre: ${plantillaNombre}`);
  console.log(`   Estado: ${plantillaData.fields[plntF.ESTADO]}`);
  console.log(`   Preguntas: ${numPreguntas}`);
  console.log(`   Programaciones actuales: ${progActuales.length}`);

  // 3. Verificar si ya está vinculada
  if (progActuales.includes(programacionRecordId)) {
    console.log(`\n✅ La programación ya está vinculada a esta plantilla.`);
    return;
  }

  const progFinales = [...progActuales, programacionRecordId];

  console.log(`\n📝 Actualizando plantilla...`);
  console.log(`   Agregando programación ${progCodigo}`);
  console.log(`   Total programaciones: ${progFinales.length}`);

  // 4. Actualizar la plantilla
  const updateUrl = `${getSGSSTUrl(plantillasEvalTableId)}/${plantillaRecordId}`;
  const updateRes = await fetch(updateUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      fields: {
        [plntF.PROGRAMACIONES]: progFinales,
      },
    }),
  });

  if (!updateRes.ok) {
    const error = await updateRes.text();
    console.error("\n❌ Error actualizando plantilla:", error);
    process.exit(1);
  }

  console.log(`\n✅ Plantilla actualizada exitosamente!`);
  console.log(`\n📋 Resumen:`);
  console.log(`   Programación: ${progCodigo} (${progMes})`);
  console.log(`   Plantilla: ${plantillaCodigo}`);
  console.log(`   Preguntas: ${numPreguntas}`);
  console.log(`\n✅ Los colaboradores de esta programación ahora podrán responder la evaluación.`);
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("\n❌ Uso: npx tsx scripts/vincular-programacion-especifica.ts <programacionRecordId> <plantillaRecordId>");
  console.error("\nEjemplo:");
  console.error("  npx tsx scripts/vincular-programacion-especifica.ts recXXXXXXXXXXXXXX recYYYYYYYYYYYYY");
  process.exit(1);
}

const [programacionRecordId, plantillaRecordId] = args;

vincularProgramacionEspecifica(programacionRecordId, plantillaRecordId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
