/**
 * Vincula las programaciones de un evento a una plantilla de evaluación existente
 *
 * Uso:
 *   npx tsx scripts/vincular-plantilla-evento.ts <eventoRecordId> <plantillaRecordId>
 */

import "./_load-env";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function vincularPlantillaEvento(eventoRecordId: string, plantillaRecordId: string) {
  const {
    eventosCapacitacionTableId,
    eventosCapacitacionFields: evtF,
    plantillasEvalTableId,
    plantillasEvalFields: plntF,
  } = airtableSGSSTConfig;

  const headers = getSGSSTHeaders();

  console.log(`\n🔍 Obteniendo información del evento...`);

  // 1. Obtener información del evento
  const eventoUrl = `${getSGSSTUrl(eventosCapacitacionTableId)}/${eventoRecordId}?returnFieldsByFieldId=true`;
  const eventoRes = await fetch(eventoUrl, { headers, cache: "no-store" });

  if (!eventoRes.ok) {
    console.error("❌ Evento no encontrado");
    process.exit(1);
  }

  const eventoData = await eventoRes.json();
  const progCapIds = (eventoData.fields[evtF.PROGRAMACION_LINK] as string[]) || [];
  const eventoCodigo = eventoData.fields[evtF.CODIGO] as string;

  if (progCapIds.length === 0) {
    console.error("\n❌ Este evento no tiene programaciones vinculadas.");
    process.exit(1);
  }

  console.log(`✅ Evento ${eventoCodigo}`);
  console.log(`   Programaciones: ${progCapIds.length}`);
  console.log(`   IDs: ${progCapIds.join(", ")}`);

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

  // 3. Agregar las nuevas programaciones (evitar duplicados)
  const progNuevas = progCapIds.filter(id => !progActuales.includes(id));

  if (progNuevas.length === 0) {
    console.log(`\n✅ Las programaciones del evento ya están vinculadas a esta plantilla.`);
    return;
  }

  const progFinales = [...progActuales, ...progNuevas];

  console.log(`\n📝 Actualizando plantilla...`);
  console.log(`   Agregando ${progNuevas.length} programaciones nuevas`);
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
  console.log(`   Evento: ${eventoCodigo}`);
  console.log(`   Plantilla: ${plantillaCodigo} - ${plantillaNombre}`);
  console.log(`   Preguntas: ${numPreguntas}`);
  console.log(`\n✅ Los colaboradores del evento ahora podrán responder la evaluación.`);
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("\n❌ Uso: npx tsx scripts/vincular-plantilla-evento.ts <eventoRecordId> <plantillaRecordId>");
  console.error("\nEjemplo:");
  console.error("  npx tsx scripts/vincular-plantilla-evento.ts recXXXXXXXXXXXXXX recYYYYYYYYYYYYY");
  process.exit(1);
}

const [eventoRecordId, plantillaRecordId] = args;

vincularPlantillaEvento(eventoRecordId, plantillaRecordId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
