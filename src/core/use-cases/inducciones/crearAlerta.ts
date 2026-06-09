// ══════════════════════════════════════════════════════════
// Use Case: Crear Alerta de Vencimiento
// Crea automáticamente una alerta 15 días antes del vencimiento
// ══════════════════════════════════════════════════════════

import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";
import { induccionesModuleConfig } from "@/infrastructure/config/airtableInducciones";
import type { AlertaLog, RegistroInduccion } from "@/shared/types/inducciones";

export async function crearAlerta(registro: RegistroInduccion): Promise<AlertaLog> {
  // Calcular fecha de alerta (15 días antes del vencimiento)
  const fechaVencimiento = new Date(registro.fechaVencimiento);
  const fechaAlerta = new Date(fechaVencimiento);
  fechaAlerta.setDate(fechaAlerta.getDate() - induccionesModuleConfig.alertaDiasAnticipacion);

  // Crear la alerta
  const alerta = await induccionesRepository.crearAlerta(
    registro.idInduccion,
    registro.idEmpleadoCore,
    registro.nombreEmpleado,
    registro.fechaVencimiento,
    fechaAlerta.toISOString().split("T")[0] // Formato ISO date
  );

  return alerta;
}
