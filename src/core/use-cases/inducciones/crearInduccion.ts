// ══════════════════════════════════════════════════════════
// Use Case: Crear Inducción
// Crea un nuevo registro de inducción/reinducción
// ══════════════════════════════════════════════════════════

import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";
import type { CrearInduccionDTO, RegistroInduccion } from "@/shared/types/inducciones";

interface DatosEmpleado {
  nombreCompleto: string;
  numeroDocumento: string;
  cargo: string;
}

export async function crearInduccion(
  dto: CrearInduccionDTO,
  datosEmpleado: DatosEmpleado
): Promise<RegistroInduccion> {
  // Validar que el empleado exista (ya debe venir validado desde el API)
  if (!datosEmpleado.nombreCompleto || !datosEmpleado.numeroDocumento) {
    throw new Error("Datos del empleado incompletos");
  }

  // Crear el registro en Airtable
  const registro = await induccionesRepository.crearRegistro(dto, datosEmpleado);

  return registro;
}
