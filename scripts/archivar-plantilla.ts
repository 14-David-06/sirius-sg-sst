/**
 * Archiva una plantilla de evaluación
 *
 * Uso:
 *   npx tsx scripts/archivar-plantilla.ts <plantillaRecordId>
 */

import "./_load-env";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function archivarPlantilla(plantillaRecordId: string) {
  const {
    plantillasEvalTableId,
    plantillasEvalFields: plntF,
  } = airtableSGSSTConfig;

  const headers = getSGSSTHeaders();

  console.log(`\n📝 Archivando plantilla ${plantillaRecordId}...`);

  const updateUrl = `${getSGSSTUrl(plantillasEvalTableId)}/${plantillaRecordId}`;
  const updateRes = await fetch(updateUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      fields: {
        [plntF.ESTADO]: "Archivada",
      },
    }),
  });

  if (!updateRes.ok) {
    const error = await updateRes.text();
    console.error("\n❌ Error archivando plantilla:", error);
    process.exit(1);
  }

  console.log(`✅ Plantilla archivada exitosamente.`);
}

// Main
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("\n❌ Uso: npx tsx scripts/archivar-plantilla.ts <plantillaRecordId>");
  process.exit(1);
}

const [plantillaRecordId] = args;

archivarPlantilla(plantillaRecordId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
