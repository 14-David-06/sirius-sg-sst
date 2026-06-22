#!/usr/bin/env tsx
/**
 * Script para subir la firma del responsable SST a S3
 * Ejecutar UNA SOLA VEZ para migrar de variables de entorno a S3
 *
 * Uso:
 *   npx tsx scripts/upload-firma-s3.ts
 *
 * Requisitos:
 *   - Variable IND_FIRMA_RESPONSABLE_SST debe existir en .env.local
 *   - Credenciales AWS configuradas en .env.local
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import * as path from "path";

// Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// Configurar cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Key donde se guardará la firma en S3
const FIRMA_RESPONSABLE_SST_S3_KEY = process.env.IND_FIRMA_RESPONSABLE_S3_KEY || "firmas/responsable-sst.json";

async function subirFirmaAWS() {
  console.log("🚀 Iniciando migración de firma a S3...\n");

  // 1. Validar que existe la variable de entorno
  const firmaEncriptada = process.env.IND_FIRMA_RESPONSABLE_SST;
  if (!firmaEncriptada) {
    console.error("❌ Error: Variable IND_FIRMA_RESPONSABLE_SST no encontrada en .env.local");
    console.error("   Asegúrate de que el archivo .env.local esté cargado correctamente.");
    process.exit(1);
  }

  console.log(`✅ Firma encontrada (${firmaEncriptada.length} caracteres)\n`);

  // 2. Validar configuración de AWS
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    console.error("❌ Error: AWS_S3_BUCKET_NAME no configurado");
    process.exit(1);
  }

  console.log(`📦 Bucket destino: ${bucketName}`);
  console.log(`🔑 Key: ${FIRMA_RESPONSABLE_SST_S3_KEY}\n`);

  // 3. Subir a S3
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: FIRMA_RESPONSABLE_SST_S3_KEY,
      Body: firmaEncriptada,
      ContentType: "text/plain",
      ServerSideEncryption: "AES256", // Cifrado adicional en reposo
      Metadata: {
        uploadedBy: "migration-script",
        uploadDate: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    console.log("✅ Firma subida exitosamente a S3\n");
    console.log("📝 Próximos pasos:");
    console.log("   1. Agregar a .env.local:");
    console.log("      USE_S3_FOR_SIGNATURES=true");
    console.log("");
    console.log("   2. (Opcional) Eliminar de .env.local para ahorrar espacio:");
    console.log("      IND_FIRMA_RESPONSABLE_SST=...");
    console.log("");
    console.log("   3. Verificar que funciona correctamente antes de eliminar la variable");
    console.log("");
    console.log("⚠️  IMPORTANTE: NO subir el archivo .env.local al repositorio");
    console.log("");
  } catch (error) {
    console.error("❌ Error subiendo firma a S3:", error);
    process.exit(1);
  }
}

// Ejecutar script
subirFirmaAWS().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
