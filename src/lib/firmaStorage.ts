/**
 * Gestión de almacenamiento de firmas
 * Permite cargar firmas desde S3 o variables de entorno
 */

import { getS3Client } from "@/infrastructure/config/awsS3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { decryptAES } from "@/lib/firmaCrypto";

// Configuración de firmas
const USE_S3_FOR_SIGNATURES = process.env.USE_S3_FOR_SIGNATURES === "true";
const FIRMA_RESPONSABLE_SST_S3_KEY = process.env.FIRMA_RESPONSABLE_SST_S3_KEY || "firmas/responsable-sst.json";

/**
 * Obtiene la firma del responsable SST
 * Primero intenta desde S3, luego desde variable de entorno
 */
export async function obtenerFirmaResponsableSst(): Promise<string | null> {
  // Estrategia 1: Cargar desde S3 (recomendado para archivos grandes)
  if (USE_S3_FOR_SIGNATURES) {
    try {
      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      if (!bucketName) {
        console.error("[firmaStorage] Bucket S3 no configurado");
        return null;
      }

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: FIRMA_RESPONSABLE_SST_S3_KEY,
      });

      const s3 = getS3Client();
      const response = await s3.send(command);

      if (!response.Body) {
        console.error("[firmaStorage] Firma no encontrada en S3");
        return null;
      }

      // Convertir stream a string
      const firmaEncriptada = await response.Body.transformToString();

      // Descifrar la firma
      const decrypted = decryptAES(firmaEncriptada);
      const firmaData = JSON.parse(decrypted);

      return firmaData.signature || null;
    } catch (error) {
      console.error("[firmaStorage] Error cargando firma desde S3:", error);
      // Continuar al fallback
    }
  }

  // Estrategia 2: Fallback a variable de entorno (solo para archivos pequeños)
  if (process.env.IND_FIRMA_RESPONSABLE_SST) {
    try {
      const decrypted = decryptAES(process.env.IND_FIRMA_RESPONSABLE_SST);
      const firmaData = JSON.parse(decrypted);
      return firmaData.signature || null;
    } catch (error) {
      console.error("[firmaStorage] Error descifrando firma desde env:", error);
      return null;
    }
  }

  console.warn("[firmaStorage] No se encontró firma del responsable SST (ni en S3 ni en variables de entorno)");
  return null;
}

/**
 * Script de utilidad para subir la firma a S3 (ejecutar una sola vez)
 *
 * Uso:
 * 1. Guardar este código en un archivo temporal: scripts/upload-firma.ts
 * 2. Ejecutar: npx tsx scripts/upload-firma.ts
 *
 * ```typescript
 * import { s3Client } from "@/infrastructure/config/awsS3";
 * import { PutObjectCommand } from "@aws-sdk/client-s3";
 *
 * async function subirFirma() {
 *   const firmaEncriptada = process.env.IND_FIRMA_RESPONSABLE_SST;
 *   if (!firmaEncriptada) {
 *     console.error("Variable IND_FIRMA_RESPONSABLE_SST no encontrada");
 *     process.exit(1);
 *   }
 *
 *   const bucketName = process.env.AWS_S3_BUCKET_NAME;
 *   const command = new PutObjectCommand({
 *     Bucket: bucketName,
 *     Key: "firmas/responsable-sst.json",
 *     Body: firmaEncriptada,
 *     ContentType: "text/plain",
 *     ServerSideEncryption: "AES256", // Cifrado en reposo adicional
 *   });
 *
 *   await s3Client.send(command);
 *   console.log("✅ Firma subida a S3 exitosamente");
 *   console.log("Ahora puedes eliminar IND_FIRMA_RESPONSABLE_SST del .env.local");
 * }
 *
 * subirFirma();
 * ```
 */
