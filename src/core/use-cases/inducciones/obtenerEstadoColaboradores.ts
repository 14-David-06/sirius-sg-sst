// ══════════════════════════════════════════════════════════
// Use Case: Obtener Estado de Colaboradores
// Calcula el semáforo de estado de inducción para todos
// ══════════════════════════════════════════════════════════

import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";
import { induccionesModuleConfig } from "@/infrastructure/config/airtableInducciones";
import type { EstadoColaborador, RegistroInduccion } from "@/shared/types/inducciones";

export interface Colaborador {
  idEmpleadoCore: string;
  nombreCompleto: string;
  numeroDocumento: string;
  cargo: string;
}

export async function obtenerEstadoColaboradores(
  colaboradores: Colaborador[]
): Promise<EstadoColaborador[]> {
  const estados: EstadoColaborador[] = [];

  // Obtener todas las inducciones de una vez
  const todasInducciones = await induccionesRepository.listarRegistros();

  // Agrupar inducciones por empleado (la más reciente de cada uno)
  const induccionesPorEmpleado = new Map<string, RegistroInduccion>();

  for (const induccion of todasInducciones) {
    const existente = induccionesPorEmpleado.get(induccion.idEmpleadoCore);

    if (!existente || new Date(induccion.fechaRealizacion) > new Date(existente.fechaRealizacion)) {
      induccionesPorEmpleado.set(induccion.idEmpleadoCore, induccion);
    }
  }

  // Calcular estado para cada colaborador
  // Usar fecha sin hora para evitar problemas de timezone
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diasAlerta = induccionesModuleConfig.alertaDiasAnticipacion;

  for (const colaborador of colaboradores) {
    const ultimaInduccion = induccionesPorEmpleado.get(colaborador.idEmpleadoCore);

    if (!ultimaInduccion) {
      // Sin inducción
      estados.push({
        idEmpleadoCore: colaborador.idEmpleadoCore,
        nombreCompleto: colaborador.nombreCompleto,
        numeroDocumento: colaborador.numeroDocumento,
        cargo: colaborador.cargo,
        tieneInduccion: false,
        ultimaInduccion: null,
        estadoSemaforo: "SIN_INDUCCION",
        diasParaVencimiento: null,
        alertaActiva: false,
      });
      continue;
    }

    // Calcular días para vencimiento usando fechas sin timezone
    // Parse manual para evitar offset UTC
    const fechaVencParts = ultimaInduccion.fechaVencimiento.split('-');
    const fechaVencimiento = new Date(
      parseInt(fechaVencParts[0]),
      parseInt(fechaVencParts[1]) - 1,
      parseInt(fechaVencParts[2])
    );
    const diffTime = fechaVencimiento.getTime() - hoy.getTime();
    const diasParaVencimiento = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Determinar semáforo
    let estadoSemaforo: "AL_DIA" | "POR_VENCER" | "VENCIDA" | "SIN_INDUCCION";
    let alertaActiva = false;

    if (diasParaVencimiento < 0) {
      estadoSemaforo = "VENCIDA";
      alertaActiva = true;
    } else if (diasParaVencimiento <= diasAlerta) {
      estadoSemaforo = "POR_VENCER";
      alertaActiva = true;
    } else {
      estadoSemaforo = "AL_DIA";
    }

    estados.push({
      idEmpleadoCore: colaborador.idEmpleadoCore,
      nombreCompleto: colaborador.nombreCompleto,
      numeroDocumento: colaborador.numeroDocumento,
      cargo: colaborador.cargo,
      tieneInduccion: true,
      ultimaInduccion,
      estadoSemaforo,
      diasParaVencimiento,
      alertaActiva,
    });
  }

  return estados;
}
