// ══════════════════════════════════════════════════════════
// Use Case: Generar Token de Firma
// Genera un token temporal para firma digital
// ══════════════════════════════════════════════════════════

import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";
import type { TokenFirma } from "@/shared/types/inducciones";

export async function generarTokenFirma(
  idInduccion: string,
  idEmpleadoCore: string
): Promise<TokenFirma> {
  // Verificar que la inducción existe
  const registro = await induccionesRepository.obtenerRegistroPorIdInduccion(idInduccion);

  if (!registro) {
    throw new Error("Inducción no encontrada");
  }

  // Verificar que la inducción está en estado correcto para firma
  if (registro.estado !== "Pendiente_Firma") {
    throw new Error(`La inducción debe estar en estado Pendiente_Firma. Estado actual: ${registro.estado}`);
  }

  // Generar el token
  const token = await induccionesRepository.crearTokenFirma(idInduccion, idEmpleadoCore);

  return token;
}
