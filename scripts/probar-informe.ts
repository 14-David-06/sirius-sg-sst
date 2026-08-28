/**
 * Smoke test del informe mensual contra Airtable real.
 * Uso: npx tsx scripts/probar-informe.ts [mes] [anio]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { generarInformeMensual, mesEnCurso, periodoDelMes } = await import(
    "../src/lib/informes/consolidar"
  );
  const { generarPdfInformeMensual } = await import("../src/lib/informes/pdf");

  const mes = process.argv[2] ? Number(process.argv[2]) : null;
  const anio = process.argv[3] ? Number(process.argv[3]) : null;
  const periodo = mes && anio ? periodoDelMes(anio, mes) : mesEnCurso();

  console.log(`Periodo: ${periodo.etiqueta} (${periodo.desde} → ${periodo.hasta})\n`);

  const t0 = Date.now();
  const informe = await generarInformeMensual(periodo);
  console.log(`Consolidado en ${Date.now() - t0} ms\n`);

  const org = informe.organizacion;
  console.log("── Encabezado ──");
  console.log(`  Empresa:      ${org.razonSocial}`);
  console.log(`  Responsable:  ${org.responsableNombre}`);
  console.log(`  Cargo:        ${org.responsableCargo}`);
  console.log(`  Licencia SST: No. ${org.licenciaSST}`);
  if (org.usandoValoresPorDefecto) {
    console.log(
      `  ⚠ Valores de reserva en: ${org.camposPorDefecto.join(", ")}`
    );
  }

  console.log("\n── Estadísticas legales ──");
  for (const f of informe.estadisticasLegales) {
    console.log(`  ${String(f.valor).padStart(5)}  ${f.indicador}`);
  }

  console.log("\n── Inspecciones ──");
  for (const t of informe.inspecciones.porTipo) {
    console.log(`  ${String(t.cantidad).padStart(5)}  ${t.etiqueta}`);
  }
  console.log(`  ${String(informe.inspecciones.total).padStart(5)}  TOTAL`);

  console.log("\n── Actividades P&P ──");
  const a = informe.actividades;
  console.log(
    `  total=${a.total} capacitaciones=${a.capacitaciones} ` +
      `inducciones=${a.inducciones} reinducciones=${a.reinducciones} ` +
      `inspecciones=${a.inspecciones} comites=${a.reunionesComite} ` +
      `asistentes=${a.totalParticipantes}`
  );

  console.log("\n── Filas ──");
  console.log(`  accidentes=${informe.accidentes.filasAccidentes.length} investigaciones=${informe.accidentes.filasInvestigaciones.length} seguimientos=${informe.medicinaLaboral.filasSeguimientos.length}`);

  if (informe.seccionesIncompletas.length > 0) {
    console.log("\n⚠ Secciones incompletas:");
    for (const f of informe.seccionesIncompletas) console.log(`  - ${f}`);
  } else {
    console.log("\n✓ Todas las secciones se leyeron correctamente.");
  }

  const pdf = generarPdfInformeMensual(informe);
  const fs = await import("fs");
  const salida = process.env.SALIDA_PDF || "informe-prueba.pdf";
  fs.writeFileSync(salida, pdf);
  console.log(`\nPDF generado: ${salida} (${(pdf.length / 1024).toFixed(1)} KB)`);
}

main().catch((e) => {
  console.error("\nFALLO:", e);
  process.exit(1);
});
