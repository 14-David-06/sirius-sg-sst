/**
 * Muestra las programaciones vinculadas a un evento y sus capacitaciones
 */

import "./_load-env";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "../src/infrastructure/config/airtableSGSST";

async function verProgramacionesEvento(eventoRecordId: string) {
  const {
    eventosCapacitacionTableId,
    eventosCapacitacionFields: evtF,
    programacionCapacitacionesTableId,
    programacionCapacitacionesFields: progF,
    capacitacionesTableId,
    capacitacionesFields: capF,
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
  const progIds = (eventoData.fields[evtF.PROGRAMACION_LINK] as string[]) || [];
  const eventoCodigo = eventoData.fields[evtF.CODIGO] as string;
  const fecha = eventoData.fields[evtF.FECHA] as string;

  console.log(`✅ Evento: ${eventoCodigo}`);
  console.log(`   Fecha: ${fecha}`);
  console.log(`   Programaciones vinculadas: ${progIds.length}\n`);

  if (progIds.length === 0) {
    console.log("❌ Este evento no tiene programaciones vinculadas");
    return;
  }

  // 2. Para cada programación, obtener su información y capacitación
  for (const progId of progIds) {
    console.log('═'.repeat(60));

    const progUrl = `${getSGSSTUrl(programacionCapacitacionesTableId)}/${progId}?returnFieldsByFieldId=true`;
    const progRes = await fetch(progUrl, { headers, cache: "no-store" });

    if (!progRes.ok) {
      console.log(`❌ No se pudo obtener la programación ${progId}`);
      continue;
    }

    const progData = await progRes.json();
    const progFields = progData.fields;

    console.log(`📋 Programación: ${progFields[progF.IDENTIFICADOR] || 'Sin código'}`);
    console.log(`   Record ID: ${progId}`);
    console.log(`   Mes: ${progFields[progF.MES] || 'Sin mes'}`);
    console.log(`   Fecha Ejecución: ${progFields[progF.FECHA_EJECUCION] || 'Sin fecha'}`);

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
          console.log(`      Tipo: ${capFields[capF.TIPO] || 'Sin tipo'}`);
          console.log(`      Población: ${capFields[capF.POBLACION] || 'Sin población'}`);
        }
      }
    }
    console.log();
  }
}

// Main
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("\n❌ Uso: npx tsx scripts/ver-programaciones-evento.ts <eventoRecordId>");
  console.error("\nEjemplo:");
  console.error("  npx tsx scripts/ver-programaciones-evento.ts recHK6Nn69AQEvdeb");
  process.exit(1);
}

const [eventoRecordId] = args;

verProgramacionesEvento(eventoRecordId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
