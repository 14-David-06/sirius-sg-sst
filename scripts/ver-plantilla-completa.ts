/**
 * Muestra información completa de una plantilla, incluyendo programaciones vinculadas
 */

import "./_load-env";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function verPlantillaCompleta(plantillaRecordId: string) {
  const {
    plantillasEvalTableId,
    plantillasEvalFields: plntF,
    programacionCapacitacionesTableId,
    programacionCapacitacionesFields: progF,
    capacitacionesTableId,
    capacitacionesFields: capF,
  } = airtableSGSSTConfig;

  const headers = getSGSSTHeaders();

  console.log(`\n🔍 Obteniendo información de la plantilla...`);

  // 1. Obtener información de la plantilla
  const plantillaUrl = `${getSGSSTUrl(plantillasEvalTableId)}/${plantillaRecordId}?returnFieldsByFieldId=true`;
  const plantillaRes = await fetch(plantillaUrl, { headers, cache: "no-store" });

  if (!plantillaRes.ok) {
    console.error("❌ Plantilla no encontrada");
    process.exit(1);
  }

  const plantillaData = await plantillaRes.json();
  const fields = plantillaData.fields;
  const progIds = (fields[plntF.PROGRAMACIONES] as string[]) || [];
  const numPreguntas = Array.isArray(fields[plntF.PREGUNTAS_LINK])
    ? fields[plntF.PREGUNTAS_LINK].length
    : 0;

  console.log(`\n╔${'═'.repeat(60)}╗`);
  console.log(`║ ${fields[plntF.CODIGO] || 'Sin código'}`);
  console.log(`╚${'═'.repeat(60)}╝`);
  console.log(`📋 ${fields[plntF.NOMBRE] || 'Sin nombre'}`);
  console.log(`\n📊 Información:`);
  console.log(`   Record ID: ${plantillaRecordId}`);
  console.log(`   Estado: ${fields[plntF.ESTADO]}`);
  console.log(`   Tipo: ${fields[plntF.TIPO]}`);
  console.log(`   Vigencia: ${fields[plntF.VIGENCIA]}`);
  console.log(`   Preguntas: ${numPreguntas}`);
  console.log(`   Puntaje mínimo: ${fields[plntF.PUNTAJE_MINIMO]}%`);
  console.log(`   Tiempo límite: ${fields[plntF.TIEMPO_LIMITE] || 'Sin límite'} min`);
  console.log(`\n📝 Descripción:`);
  console.log(`   ${fields[plntF.DESCRIPCION] || 'Sin descripción'}`);

  if (progIds.length === 0) {
    console.log(`\n⚠️  Esta plantilla no tiene programaciones vinculadas`);
    return;
  }

  console.log(`\n📅 Programaciones vinculadas (${progIds.length}):`);

  // 2. Para cada programación, obtener su información
  for (const progId of progIds) {
    console.log(`\n${'─'.repeat(60)}`);

    const progUrl = `${getSGSSTUrl(programacionCapacitacionesTableId)}/${progId}?returnFieldsByFieldId=true`;
    const progRes = await fetch(progUrl, { headers, cache: "no-store" });

    if (!progRes.ok) {
      console.log(`❌ No se pudo obtener la programación ${progId}`);
      continue;
    }

    const progData = await progRes.json();
    const progFields = progData.fields;

    console.log(`📌 ${progFields[progF.IDENTIFICADOR] || 'Sin código'}`);
    console.log(`   Record ID: ${progId}`);
    console.log(`   Mes: ${progFields[progF.MES] || 'Sin mes'}`);

    // Obtener capacitación vinculada
    const capLinks = progFields[progF.CAPACITACION_LINK] as string[];
    if (capLinks && capLinks.length > 0) {
      for (const capId of capLinks) {
        const capUrl = `${getSGSSTUrl(capacitacionesTableId)}/${capId}?returnFieldsByFieldId=true`;
        const capRes = await fetch(capUrl, { headers, cache: "no-store" });

        if (capRes.ok) {
          const capData = await capRes.json();
          const capFields = capData.fields;

          console.log(`\n   📚 Capacitación:`);
          console.log(`      Código: ${capFields[capF.CODIGO] || 'Sin código'}`);
          console.log(`      Tema: ${capFields[capF.NOMBRE] || 'Sin nombre'}`);
          console.log(`      Población: ${capFields[capF.POBLACION] || 'Sin población'}`);
        }
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

// Main
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("\n❌ Uso: npx tsx scripts/ver-plantilla-completa.ts <plantillaRecordId>");
  console.error("\nEjemplo:");
  console.error("  npx tsx scripts/ver-plantilla-completa.ts recXXXXXXXXXXXXXX");
  process.exit(1);
}

const [plantillaRecordId] = args;

verPlantillaCompleta(plantillaRecordId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
