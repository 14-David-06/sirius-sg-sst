/**
 * Script para habilitar evaluación en un evento existente
 *
 * Uso:
 *   npx tsx scripts/habilitar-evaluacion.ts <eventoRecordId> [nombrePlantilla]
 *
 * Ejemplo:
 *   npx tsx scripts/habilitar-evaluacion.ts recXXXXXXXXXXXXXX "Evaluación Seguridad"
 */

import "./_load-env";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function habilitarEvaluacion(eventoRecordId: string, nombrePlantilla?: string) {
  const {
    eventosCapacitacionTableId,
    eventosCapacitacionFields: evtF,
    plantillasEvalTableId,
    plantillasEvalFields: plntF,
  } = airtableSGSSTConfig;

  const headers = getSGSSTHeaders();

  console.log(`\n🔍 Buscando evento: ${eventoRecordId}...`);

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
  const temasTratados = (eventoData.fields[evtF.TEMAS_TRATADOS] as string) || "";
  const primerTema = temasTratados.split("\n")[0].replace(/^[-•]\s*/, "").trim();
  const fecha = eventoData.fields[evtF.FECHA] as string;

  console.log(`\n📋 Evento encontrado:`);
  console.log(`   Código: ${eventoCodigo}`);
  console.log(`   Fecha: ${fecha}`);
  console.log(`   Tema: ${primerTema}`);
  console.log(`   Programaciones vinculadas: ${progCapIds.length}`);

  if (progCapIds.length === 0) {
    console.error("\n❌ Este evento no tiene programaciones vinculadas.");
    console.error("   Solo eventos vinculados a programaciones pueden tener evaluaciones.");
    process.exit(1);
  }

  console.log(`   → ${progCapIds.join(", ")}`);

  // 2. Verificar si ya existe una plantilla para estas programaciones
  const year = new Date().getFullYear().toString();
  const progFormulaParts = progCapIds.map(pid => `FIND("${pid}", ARRAYJOIN({${plntF.PROGRAMACIONES}})) > 0`);
  const checkFormula = encodeURIComponent(
    `AND({${plntF.ESTADO}}="Activa", {${plntF.VIGENCIA}}="${year}", OR(${progFormulaParts.join(",")}))`
  );

  const checkUrl = `${getSGSSTUrl(plantillasEvalTableId)}?returnFieldsByFieldId=true&filterByFormula=${checkFormula}`;
  const checkRes = await fetch(checkUrl, { headers, cache: "no-store" });
  const existingData = checkRes.ok ? await checkRes.json() : { records: [] };

  if (existingData.records && existingData.records.length > 0) {
    console.log(`\n⚠️  Ya existe una plantilla activa para este evento:`);
    existingData.records.forEach((r: { fields: Record<string, unknown> }) => {
      console.log(`   - ${r.fields[plntF.CODIGO]} - ${r.fields[plntF.NOMBRE]}`);
    });
    console.log(`\n✅ El evento ya tiene evaluación habilitada.`);
    return;
  }

  // 3. Crear la plantilla
  console.log(`\n📝 Creando plantilla de evaluación...`);

  const ts = Date.now().toString().slice(-6);
  const plantillaCodigo = `EVAL-${eventoCodigo}-${ts}`;

  // Crear plantilla SIN el campo TIPO (evitar error de permisos)
  const plantillaData = {
    fields: {
      [plntF.CODIGO]: plantillaCodigo,
      [plntF.NOMBRE]: nombrePlantilla || `Evaluación: ${primerTema}`,
      [plntF.DESCRIPCION]: `Evaluación generada para el evento ${eventoCodigo}`,
      // TIPO se omite - debe configurarse manualmente en Airtable si es necesario
      [plntF.PUNTAJE_MINIMO]: 60,
      [plntF.INTENTOS]: 3,
      [plntF.ALEATORIZAR]: true,
      [plntF.MOSTRAR_RETRO]: true,
      [plntF.ESTADO]: "Activa",
      [plntF.VIGENCIA]: year,
      [plntF.PROGRAMACIONES]: progCapIds,
    }
  };

  const plantillaRes = await fetch(getSGSSTUrl(plantillasEvalTableId), {
    method: "POST",
    headers,
    body: JSON.stringify({ records: [plantillaData] }),
  });

  if (!plantillaRes.ok) {
    const error = await plantillaRes.text();
    console.error("\n❌ Error creando plantilla:", error);
    process.exit(1);
  }

  const plantillaResult = await plantillaRes.json();
  const plantillaRecordId = plantillaResult.records[0].id;

  console.log(`\n✅ Plantilla creada exitosamente:`);
  console.log(`   Record ID: ${plantillaRecordId}`);
  console.log(`   Código: ${plantillaCodigo}`);
  console.log(`\n⚠️  IMPORTANTE: Debes agregar preguntas a esta plantilla en Airtable.`);
  console.log(`   Tabla: Plantillas Evaluación → Preguntas por Plantilla`);
  console.log(`\n✅ Evaluación habilitada para el evento ${eventoCodigo}`);
}

// Main
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("\n❌ Uso: npx tsx scripts/habilitar-evaluacion.ts <eventoRecordId> [nombrePlantilla]");
  console.error("\nEjemplo:");
  console.error('  npx tsx scripts/habilitar-evaluacion.ts recXXXXXXXXXXXXXX "Evaluación Seguridad"');
  process.exit(1);
}

const [eventoRecordId, nombrePlantilla] = args;

habilitarEvaluacion(eventoRecordId, nombrePlantilla)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
