// ══════════════════════════════════════════════════════════
// Use Case: Crear Alerta de Vencimiento
// Crea automáticamente una alerta 15 días antes del vencimiento
// ══════════════════════════════════════════════════════════

import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";
import { induccionesModuleConfig } from "@/infrastructure/config/airtableInducciones";
import type { AlertaLog, RegistroInduccion } from "@/shared/types/inducciones";

export async function crearAlerta(registro: RegistroInduccion): Promise<AlertaLog> {
  // Calcular fecha de alerta (15 días antes del vencimiento)
  // Parse manual para evitar offset UTC
  const fechaVencParts = registro.fechaVencimiento.split('-');
  const fechaVencimiento = new Date(
    parseInt(fechaVencParts[0]),
    parseInt(fechaVencParts[1]) - 1,
    parseInt(fechaVencParts[2])
  );

  const fechaAlerta = new Date(fechaVencimiento);
  fechaAlerta.setDate(fechaAlerta.getDate() - induccionesModuleConfig.alertaDiasAnticipacion);

  // Formatear fecha alerta en formato YYYY-MM-DD
  const year = fechaAlerta.getFullYear();
  const month = String(fechaAlerta.getMonth() + 1).padStart(2, '0');
  const day = String(fechaAlerta.getDate()).padStart(2, '0');
  const fechaAlertaStr = `${year}-${month}-${day}`;

  // Crear la alerta
  const alerta = await induccionesRepository.crearAlerta(
    registro.idInduccion,
    registro.idEmpleadoCore,
    registro.nombreEmpleado,
    registro.fechaVencimiento,
    fechaAlertaStr
  );

  return alerta;
}
