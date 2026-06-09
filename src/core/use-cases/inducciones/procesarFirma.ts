// ══════════════════════════════════════════════════════════
// Use Case: Procesar Firma Digital
// Valida token, guarda firma en S3, actualiza registro
// ══════════════════════════════════════════════════════════

import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";
import { uploadToS3 } from "@/infrastructure/config/awsS3";
import { induccionesModuleConfig } from "@/infrastructure/config/airtableInducciones";
import type { RegistroInduccion } from "@/shared/types/inducciones";

export async function procesarFirma(
  tokenId: string,
  firmaDataUrl: string
): Promise<RegistroInduccion> {
  // 1. Obtener y validar el token
  const token = await induccionesRepository.obtenerTokenPorId(tokenId);

  if (!token) {
    throw new Error("Token no encontrado");
  }

  if (token.estadoToken === "Usado") {
    throw new Error("Este token ya ha sido utilizado");
  }

  if (token.estadoToken === "Expirado") {
    throw new Error("Este token ha expirado");
  }

  // Verificar si el token expiró por tiempo
  const ahora = new Date();
  const expiracion = new Date(token.fechaExpiracion);

  if (ahora > expiracion) {
    // Marcar como expirado
    await induccionesRepository.actualizarToken(token.id!, "Expirado");
    throw new Error("Este token ha expirado");
  }

  // 2. Obtener el registro de inducción
  const registro = await induccionesRepository.obtenerRegistroPorIdInduccion(token.induccionId);

  if (!registro) {
    throw new Error("Inducción no encontrada");
  }

  // 3. Convertir data URL a buffer
  const base64Data = firmaDataUrl.split(",")[1];
  const buffer = Buffer.from(base64Data, "base64");

  // 4. Subir firma a S3
  const s3Key = `${induccionesModuleConfig.s3PrefixFirmas}/${registro.idInduccion}-${Date.now()}.png`;
  const { url: firmaUrl } = await uploadToS3(s3Key, buffer, "image/png");

  // 5. Actualizar token (marcar como usado y guardar hash)
  await induccionesRepository.actualizarToken(token.id!, "Usado", firmaDataUrl);

  // 6. Actualizar registro de inducción
  const registroActualizado = await induccionesRepository.actualizarRegistro(registro.id!, {
    firmaUrl,
    estado: "Completada", // Pasa a completada tras la firma
  });

  return registroActualizado;
}
