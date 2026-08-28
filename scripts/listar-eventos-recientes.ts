import "./_load-env";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function listarEventosRecientes() {
  const headers = getSGSSTHeaders();
  const { eventosCapacitacionTableId, eventosCapacitacionFields: evtF } = airtableSGSSTConfig;

  // Obtener los últimos 20 eventos
  const params = new URLSearchParams({
    "sort[0][field]": evtF.FECHA,
    "sort[0][direction]": "desc",
    maxRecords: "20",
    returnFieldsByFieldId: "true",
  });

  const url = `${getSGSSTUrl(eventosCapacitacionTableId)}?${params.toString()}`;

  console.log("\n🔍 Listando eventos recientes...\n");
  const res = await fetch(url, { headers, cache: "no-store" as RequestCache });
  const data = await res.json();

  if (data.records && data.records.length > 0) {
    console.log(`✅ Encontrados ${data.records.length} eventos:\n`);

    for (const r of data.records) {
      const temas = (r.fields[evtF.TEMAS_TRATADOS] as string) || "";
      const codigo = r.fields[evtF.CODIGO];
      const estado = r.fields[evtF.ESTADO];
      const fecha = r.fields[evtF.FECHA];
      const asistentes = (r.fields[evtF.ASISTENCIA_LINK] as string[] || []).length;
      const progLinks = (r.fields[evtF.PROGRAMACION_LINK] as string[] || []);
      const primerTema = temas.split("\n")[0].replace(/^[-•]\s*/, "").trim();

      console.log("════════════════════════════════════════════════");
      console.log(`📅 ${fecha} · ${estado}`);
      console.log(`📋 Record ID: ${r.id}`);
      console.log(`   Código: ${codigo}`);
      console.log(`   Asistentes: ${asistentes}`);
      console.log(`   Programaciones: ${progLinks.length}`);
      console.log(`   Tema: ${primerTema.substring(0, 80)}${primerTema.length > 80 ? "..." : ""}`);

      if (progLinks.length > 0) {
        console.log(`\n   ✅ Para habilitar evaluación:`);
        console.log(`   npx tsx scripts/habilitar-evaluacion.ts ${r.id}`);
      } else {
        console.log(`\n   ⚠️  Sin programaciones - no puede tener evaluación`);
      }
      console.log();
    }
  } else {
    console.log("❌ No se encontraron eventos");
  }
}

listarEventosRecientes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
