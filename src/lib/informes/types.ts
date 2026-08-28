// ══════════════════════════════════════════════════════════
// Tipos — Informe mensual de gestión SST
//
// El informe consolida lo que ya registran los módulos del sistema:
// accidentes, medicina laboral, inspecciones y actividades de promoción
// y prevención. No calcula nada que un módulo ya calcule.
// ══════════════════════════════════════════════════════════

import type { DatosOrganizacion } from "./organizacion";

export interface Periodo {
  desde: string;
  hasta: string;
  mes: number;
  anio: number;
  /** "Julio 2026", para el título del documento. */
  etiqueta: string;
}

// ── Estadísticas legales (los 18 indicadores) ─────────────

/** Los 9 que aporta el módulo de accidentes. */
export interface IndicadoresAccidentesInforme {
  accidentesReconocidosARL: number;
  accidentesObjetadosARL: number;
  accidentesGraves: number;
  accidentesFatales: number;
  diasIncapacidadAT: number;
  casiAccidentes: number;
  actosInseguros: number;
  condicionesInseguras: number;
}

/** Los 6 que aporta el módulo de medicina laboral. */
export interface IndicadoresMedicinaInforme {
  diasIncapacidadEnfermedadGeneral: number;
  enfermedadesLaboralesEnProceso: number;
  enfermedadesLaboralesReconocidas: number;
  trabajadoresReubicadosTemporales: number;
  trabajadoresReubicadosDefinitivos: number;
  trabajadoresRehabilitados: number;
}

/**
 * Una fila de la tabla "Estadísticas legales" del formato.
 *
 * Se aplana a filas etiquetadas porque el formato impreso es una tabla de
 * dos columnas, no un objeto: el orden importa y debe ser estable.
 */
export interface FilaIndicador {
  indicador: string;
  valor: number;
  origen: "Accidentes" | "Medicina laboral" | "Promoción y prevención";
}

// ── Secciones tabulares ───────────────────────────────────

export interface FilaAccidente {
  nombreTrabajador: string;
  fechaEvento: string;
  tipoLesion: string;
  causaPrincipal: string;
  diasIncapacidad: number;
  accidenteGrave: boolean;
}

export interface FilaInvestigacion {
  nombreTrabajador: string;
  accionPreventiva: string;
  accionCorrectiva: string;
  fechaEjecucion: string | null;
}

export interface FilaSeguimiento {
  nombreTrabajador: string;
  tipoSeguimiento: string;
  observaciones: string;
}

// ── Consolidado de inspecciones ───────────────────────────

/** Los siete tipos de inspección que registra el sistema. */
export type TipoInspeccionInforme =
  | "epp"
  | "areas"
  | "equipos"
  | "botiquin"
  | "extintor"
  | "camilla"
  | "kit-derrames";

export interface FilaInspeccion {
  tipo: TipoInspeccionInforme;
  tipoEtiqueta: string;
  consecutivo: string;
  fecha: string;
  inspector: string;
  /** Área inspeccionada. Solo lo registran las inspecciones de áreas. */
  area: string | null;
  estado: string;
}

export interface ResumenInspecciones {
  total: number;
  /** Conteo por tipo, en el orden en que se imprime la tabla. */
  porTipo: { tipo: TipoInspeccionInforme; etiqueta: string; cantidad: number }[];
  filas: FilaInspeccion[];
}

// ── Actividades de promoción y prevención ─────────────────

/**
 * Inducción y reinducción van separadas porque el formato impreso las exige
 * como dos secciones distintas: la Resolución 0312/2019 las evalúa por
 * separado (estándares 1.2.2 y 2.8.1).
 */
export type OrigenActividad =
  | "Capacitación"
  | "Inducción"
  | "Reinducción"
  | "Inspección"
  | "Comité";

export interface FilaActividad {
  origen: OrigenActividad;
  descripcion: string;
  fecha: string;
  responsable: string;
  /** Personas cubiertas. `null` cuando la actividad no lleva asistentes. */
  participantes: number | null;
}

export interface ResumenActividades {
  /** Alimenta el indicador legal "Actividades de P&P ejecutadas". */
  total: number;
  capacitaciones: number;
  inducciones: number;
  reinducciones: number;
  inspecciones: number;
  reunionesComite: number;
  /** Suma de asistentes a capacitaciones del periodo. */
  totalParticipantes: number;
  filas: FilaActividad[];
}

// ── Informe completo ──────────────────────────────────────

export interface InformeMensual {
  periodo: Periodo;
  /** Razón social, responsable, cargo y licencia SST del encabezado. */
  organizacion: DatosOrganizacion;
  /** La tabla de 18 filas, en el orden del formato impreso. */
  estadisticasLegales: FilaIndicador[];
  accidentes: {
    indicadores: IndicadoresAccidentesInforme;
    filasAccidentes: FilaAccidente[];
    filasInvestigaciones: FilaInvestigacion[];
  };
  medicinaLaboral: {
    indicadores: IndicadoresMedicinaInforme;
    filasSeguimientos: FilaSeguimiento[];
  };
  inspecciones: ResumenInspecciones;
  actividades: ResumenActividades;
  /**
   * Secciones que no se pudieron leer.
   *
   * El informe se entrega igual, señalando qué falta: un mes sin datos y un
   * mes con la consulta rota se ven idénticos si no se distinguen aquí.
   */
  seccionesIncompletas: string[];
  generadoEn: string;
}
