/**
 * Actualiza las programaciones vinculadas a una plantilla
 *
 * Uso:
 *   npx tsx scripts/actualizar-programaciones-plantilla.ts <plantillaRecordId> <prog1Id> [prog2Id] [prog3Id...]
 */

import "./_load-env";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function actualizarProgramacionesPlantilla(plantillaRecordId: string, programacionIds: string[]) {
  const {
    plantillasEvalTableId,
    plantillasEvalFields: plntF,
  } = airtableSGSSTConfig;

  const headers = getSGSSTHeaders();

  console.log(`\n📝 Actualizando programaciones de la plantilla...`);
  console.log(`   Plantilla: ${plantillaRecordId}`);
  console.log(`   Nuevas programaciones: ${programacionIds.length}`);
  programacionIds.forEach(id => console.log(`      - ${id}`));

  const updateUrl = `${getSGSSTUrl(plantillasEvalTableId)}/${plantillaRecordId}`;
  const updateRes = await fetch(updateUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      fields: {
        [plntF.PROGRAMACIONES]: programacionIds,
      },
    }),
  });

  if (!updateRes.ok) {
    const error = await updateRes.text();
    console.error("\n❌ Error actualizando plantilla:", error);
    process.exit(1);
  }

  console.log(`\n✅ Plantilla actualizada exitosamente!`);
  console.log(`   Total programaciones: ${programacionIds.length}`);
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("\n❌ Uso: npx tsx scripts/actualizar-programaciones-plantilla.ts <plantillaRecordId> <prog1Id> [prog2Id] [prog3Id...]");
  console.error("\nEjemplo:");
  console.error("  npx tsx scripts/actualizar-programaciones-plantilla.ts recXXXXXXXXXXXXXX recYYYYYYYYYYYYY recZZZZZZZZZZZZZ");
  process.exit(1);
}

const [plantillaRecordId, ...programacionIds] = args;

actualizarProgramacionesPlantilla(plantillaRecordId, programacionIds)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
