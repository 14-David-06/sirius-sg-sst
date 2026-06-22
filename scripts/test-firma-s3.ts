#!/usr/bin/env tsx
/**
 * Script de prueba para verificar que la firma se puede cargar desde S3
 */

import { obtenerFirmaResponsableSst } from "../src/lib/firmaStorage";

async function testFirmaS3() {
  console.log("🧪 Probando carga de firma desde S3...\n");

  try {
    const firma = await obtenerFirmaResponsableSst();

    if (!firma) {
      console.error("❌ Error: No se pudo obtener la firma");
      console.log("\n💡 Verifica que:");
      console.log("   1. USE_S3_FOR_SIGNATURES=true esté en .env.local");
      console.log("   2. La firma se haya subido correctamente a S3");
      console.log("   3. Las credenciales AWS sean correctas");
      process.exit(1);
    }

    console.log("✅ Firma cargada exitosamente desde S3");
    console.log(`📏 Tamaño de la firma: ${firma.length} caracteres`);
    console.log(`🔍 Primeros 50 caracteres: ${firma.substring(0, 50)}...`);
    console.log("\n✨ Todo funciona correctamente!");
  } catch (error) {
    console.error("❌ Error al cargar la firma:", error);
    process.exit(1);
  }
}

testFirmaS3();
