/**
 * Script de verificación de firmas de políticas
 *
 * Uso:
 *   npx tsx src/scripts/verificar-firma-politica.ts <politicaId>
 *
 * Ejemplo:
 *   npx tsx src/scripts/verificar-firma-politica.ts 
 */

import { config } from "dotenv";
import { resolve } from "path";

// Cargar variables de entorno ANTES de cualquier import
config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const politicaId = process.argv[2];

  if (!politicaId) {
    console.error("❌ Error: Debes proporcionar el ID de la política");
    console.log("Uso: npx tsx src/scripts/verificar-firma-politica.ts <politicaId>");
    process.exit(1);
  }

  // Importar DESPUÉS de cargar .env
  const { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } = await import("../infrastructure/config/airtableSGSST");

  console.log("═══════════════════════════════════════════════════════");
  console.log("🔍 VERIFICACIÓN DE FIRMAS DE POLÍTICA");
  console.log("═══════════════════════════════════════════════════════\n");

  const FP = airtableSGSSTConfig.firmasPoliticasFields;

  console.log("📋 Configuración:");
  console.log(`  - Política ID: ${politicaId}`);
  console.log(`  - Table ID: ${airtableSGSSTConfig.firmasPoliticasTableId}`);
  console.log(`  - Field ID POLITICA_LINK: ${FP.POLITICA_LINK}`);
  console.log(`  - Field ID ID_EMPLEADO_CORE: ${FP.ID_EMPLEADO_CORE}`);
  console.log("");

  // 1. Consultar TODAS las firmas en la tabla (sin filtro)
  console.log("📊 PASO 1: Consultar todas las firmas en la tabla");
  console.log("─────────────────────────────────────────────────────\n");

  const urlTodas = `${getSGSSTUrl(airtableSGSSTConfig.firmasPoliticasTableId)}?returnFieldsByFieldId=true`;

  const resTodas = await fetch(urlTodas, {
    method: "GET",
    headers: getSGSSTHeaders(),
  });

  if (!resTodas.ok) {
    console.error("❌ Error al consultar todas las firmas:", await resTodas.text());
    process.exit(1);
  }

  const dataTodas = await resTodas.json();
  console.log(`✅ Total de firmas en la tabla: ${dataTodas.records.length}\n`);

  if (dataTodas.records.length > 0) {
    console.log("📄 Muestra de la primera firma:");
    const primeraFirma = dataTodas.records[0];
    console.log(`  - Record ID: ${primeraFirma.id}`);
    console.log(`  - Campos disponibles:`, Object.keys(primeraFirma.fields));
    console.log(`  - ${FP.POLITICA_LINK} (Política Link):`, primeraFirma.fields[FP.POLITICA_LINK]);
    console.log(`  - ${FP.ID_EMPLEADO_CORE} (ID Empleado):`, primeraFirma.fields[FP.ID_EMPLEADO_CORE]);
    console.log(`  - ${FP.NOMBRE_EMPLEADO} (Nombre):`, primeraFirma.fields[FP.NOMBRE_EMPLEADO]);
    console.log(`  - ${FP.FECHA_FIRMA} (Fecha):`, primeraFirma.fields[FP.FECHA_FIRMA]);
    console.log("");
  }

  // 2. Consultar firmas CON FILTRO (solo esta política)
  console.log("📊 PASO 2: Consultar firmas con filtro para esta política");
  console.log("─────────────────────────────────────────────────────\n");

  const filterFormula = `FIND("${politicaId}", ARRAYJOIN({${FP.POLITICA_LINK}})) > 0`;
  console.log(`  Filter formula: ${filterFormula}\n`);

  const urlFiltrada = `${getSGSSTUrl(airtableSGSSTConfig.firmasPoliticasTableId)}?returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(filterFormula)}`;

  const resFiltrada = await fetch(urlFiltrada, {
    method: "GET",
    headers: getSGSSTHeaders(),
  });

  if (!resFiltrada.ok) {
    console.error("❌ Error al consultar firmas filtradas:", await resFiltrada.text());
    process.exit(1);
  }

  const dataFiltrada = await resFiltrada.json();
  console.log(`✅ Firmas encontradas para esta política: ${dataFiltrada.records.length}\n`);

  if (dataFiltrada.records.length > 0) {
    console.log("📋 Lista de empleados que firmaron:");
    dataFiltrada.records.forEach((firma: any, index: number) => {
      console.log(`\n  ${index + 1}. Record ID: ${firma.id}`);
      console.log(`     - ID Empleado: ${firma.fields[FP.ID_EMPLEADO_CORE]}`);
      console.log(`     - Nombre: ${firma.fields[FP.NOMBRE_EMPLEADO]}`);
      console.log(`     - Fecha: ${firma.fields[FP.FECHA_FIRMA]}`);
      console.log(`     - Política Link: ${firma.fields[FP.POLITICA_LINK]}`);
    });
  } else {
    console.log("⚠️  No se encontraron firmas para esta política");
    console.log("\nPosibles causas:");
    console.log("  1. El campo POLITICA_LINK en las firmas no contiene el ID correcto");
    console.log("  2. El filtro FIND() no está funcionando correctamente");
    console.log("  3. Las firmas fueron guardadas sin el link a la política");
  }

  // 3. Verificar firmas que contienen CUALQUIER dato en POLITICA_LINK
  console.log("\n\n📊 PASO 3: Verificar todas las firmas con política asignada");
  console.log("─────────────────────────────────────────────────────\n");

  const firmasConPolitica = dataTodas.records.filter((firma: any) => {
    const politicaLink = firma.fields[FP.POLITICA_LINK];
    return politicaLink && politicaLink.length > 0;
  });

  console.log(`✅ Firmas con política asignada: ${firmasConPolitica.length}\n`);

  if (firmasConPolitica.length > 0) {
    console.log("📋 Políticas únicas en las firmas:");
    const politicasUnicas = new Set<string>();
    firmasConPolitica.forEach((firma: any) => {
      const politicaLinks = firma.fields[FP.POLITICA_LINK];
      if (Array.isArray(politicaLinks)) {
        politicaLinks.forEach((link: string) => politicasUnicas.add(link));
      }
    });

    politicasUnicas.forEach((id) => {
      const count = firmasConPolitica.filter((f: any) => {
        const links = f.fields[FP.POLITICA_LINK];
        return Array.isArray(links) && links.includes(id);
      }).length;
      const estaEs = id === politicaId ? " ← ESTA POLÍTICA" : "";
      console.log(`  - ${id}: ${count} firma(s)${estaEs}`);
    });
  }

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("✅ Verificación completada");
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch(console.error);
