import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function buscarEvento(fecha: string) {
  const headers = getSGSSTHeaders();
  const { eventosCapacitacionTableId, eventosCapacitacionFields: evtF } = airtableSGSSTConfig;

  // Buscar el evento por fecha
  const formula = encodeURIComponent(`{${evtF.FECHA}}="${fecha}"`);
  const url = `${getSGSSTUrl(eventosCapacitacionTableId)}?returnFieldsByFieldId=true&filterByFormula=${formula}`;

  console.log(`\n🔍 Buscando eventos del ${fecha}...`);
  const res = await fetch(url, { headers, cache: "no-store" as RequestCache });
  const data = await res.json();

  if (data.records && data.records.length > 0) {
    console.log(`\n✅ Encontrados ${data.records.length} evento(s):\n`);

    for (const r of data.records) {
      const temas = (r.fields[evtF.TEMAS_TRATADOS] as string) || "";
      const codigo = r.fields[evtF.CODIGO];
      const estado = r.fields[evtF.ESTADO];
      const asistentes = (r.fields[evtF.ASISTENCIA_LINK] as string[] || []).length;
      const progLinks = (r.fields[evtF.PROGRAMACION_LINK] as string[] || []);
      const primerTema = temas.split("\n")[0].replace(/^[-•]\s*/, "").trim();

      console.log("════════════════════════════════════════════════");
      console.log(`📋 Record ID: ${r.id}`);
      console.log(`   Código: ${codigo}`);
      console.log(`   Estado: ${estado}`);
      console.log(`   Asistentes: ${asistentes}`);
      console.log(`   Programaciones: ${progLinks.length > 0 ? progLinks.join(", ") : "Sin programaciones"}`);
      console.log(`   Tema: ${primerTema}`);
      console.log(`\n   Para habilitar evaluación:`);
      console.log(`   npx tsx scripts/habilitar-evaluacion.ts ${r.id}\n`);
    }
  } else {
    console.log(`\n❌ No se encontraron eventos para la fecha ${fecha}`);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("\n❌ Uso: npx tsx scripts/buscar-evento-fecha.ts <fecha>");
  console.error("\nEjemplo:");
  console.error('  npx tsx scripts/buscar-evento-fecha.ts 2026-08-26');
  process.exit(1);
}

const [fecha] = args;

buscarEvento(fecha)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
