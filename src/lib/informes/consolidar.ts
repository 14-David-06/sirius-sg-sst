// ══════════════════════════════════════════════════════════
// Consolidador — Informe mensual de gestión SST
//
// Reúne lo que cada módulo ya calcula. La regla es que aquí no se recalcula
// ningún indicador: si el número sale distinto en el informe y en el módulo,
// uno de los dos miente.
// ══════════════════════════════════════════════════════════
import { calcularIndicadores as calcularIndicadoresAccidentes } from "@/lib/accidentes/repository";
import { calcularIndicadoresMedicinaLaboral } from "@/lib/medicina-laboral/repository";
import { consolidarActividades } from "./actividades";
import { consolidarInspecciones } from "./inspecciones";
import { obtenerDatosOrganizacion } from "./organizacion";
import type {
  FilaIndicador,
  InformeMensual,
  Periodo,
  ResumenActividades,
} from "./types";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Fecha de hoy en zona America/Bogota como YYYY-MM-DD. */
export function hoyColombia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Construye el periodo del mes calendario indicado. */
export function periodoDelMes(anio: number, mes: number): Periodo {
  const mm = String(mes).padStart(2, "0");
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return {
    desde: `${anio}-${mm}-01`,
    hasta: `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`,
    mes,
    anio,
    etiqueta: `${MESES[mes - 1]} ${anio}`,
  };
}

/** El mes en curso, para cuando no se indica periodo. */
export function mesEnCurso(): Periodo {
  const [anio, mes] = hoyColombia().split("-").map(Number);
  return periodoDelMes(anio, mes);
}

/**
 * Aplana los 18 indicadores legales al orden en que se imprimen.
 *
 * El formato es una tabla de dos columnas: el orden es parte del documento,
 * no un detalle de presentación.
 */
function armarEstadisticasLegales(
  accidentes: InformeMensual["accidentes"]["indicadores"],
  medicina: InformeMensual["medicinaLaboral"]["indicadores"],
  actividades: ResumenActividades
): FilaIndicador[] {
  return [
    // ── Accidentalidad (9) ───────────────────────────────
    { indicador: "Accidentes de trabajo reconocidos por la ARL", valor: accidentes.accidentesReconocidosARL, origen: "Accidentes" },
    { indicador: "Accidentes de trabajo objetados por la ARL o en junta", valor: accidentes.accidentesObjetadosARL, origen: "Accidentes" },
    { indicador: "Accidentes graves según la legislación vigente", valor: accidentes.accidentesGraves, origen: "Accidentes" },
    { indicador: "Accidentes de trabajo fatales", valor: accidentes.accidentesFatales, origen: "Accidentes" },
    { indicador: "Días de incapacidad por accidente de trabajo", valor: accidentes.diasIncapacidadAT, origen: "Accidentes" },
    { indicador: "Casi accidentes reportados", valor: accidentes.casiAccidentes, origen: "Accidentes" },
    { indicador: "Actos inseguros reportados", valor: accidentes.actosInseguros, origen: "Accidentes" },
    { indicador: "Condiciones inseguras reportadas", valor: accidentes.condicionesInseguras, origen: "Accidentes" },
    { indicador: "Actividades de promoción y prevención ejecutadas", valor: actividades.total, origen: "Promoción y prevención" },

    // ── Salud ocupacional (6) ────────────────────────────
    { indicador: "Días de incapacidad por enfermedad general", valor: medicina.diasIncapacidadEnfermedadGeneral, origen: "Medicina laboral" },
    { indicador: "Enfermedades laborales en proceso de calificación", valor: medicina.enfermedadesLaboralesEnProceso, origen: "Medicina laboral" },
    { indicador: "Enfermedades laborales reconocidas por la ARL", valor: medicina.enfermedadesLaboralesReconocidas, origen: "Medicina laboral" },
    { indicador: "Trabajadores reubicados temporalmente", valor: medicina.trabajadoresReubicadosTemporales, origen: "Medicina laboral" },
    { indicador: "Trabajadores reubicados definitivamente", valor: medicina.trabajadoresReubicadosDefinitivos, origen: "Medicina laboral" },
    { indicador: "Trabajadores rehabilitados", valor: medicina.trabajadoresRehabilitados, origen: "Medicina laboral" },

    // ── Detalle de las actividades de P&P (3) ────────────
    { indicador: "Capacitaciones dictadas", valor: actividades.capacitaciones, origen: "Promoción y prevención" },
    { indicador: "Inspecciones de seguridad realizadas", valor: actividades.inspecciones, origen: "Promoción y prevención" },
    { indicador: "Asistentes a capacitaciones", valor: actividades.totalParticipantes, origen: "Promoción y prevención" },
  ];
}

/**
 * Genera el informe mensual del periodo.
 *
 * Accidentes y medicina laboral son obligatorios: sin ellos no hay
 * estadísticas legales y el documento no serviría. Inspecciones y actividades
 * degradan a sección incompleta, porque un informe sin el consolidado de
 * inspecciones sigue siendo útil para la ARL.
 */
export async function generarInformeMensual(
  periodo: Periodo
): Promise<InformeMensual> {
  const { desde, hasta } = periodo;

  const [accidentes, medicina, inspecciones] = await Promise.all([
    calcularIndicadoresAccidentes(desde, hasta),
    calcularIndicadoresMedicinaLaboral(desde, hasta, periodo.mes, periodo.anio),
    consolidarInspecciones(desde, hasta),
  ]);

  const actividades = await consolidarActividades(
    desde,
    hasta,
    inspecciones.resumen
  );

  const indicadoresAccidentes = {
    accidentesReconocidosARL: accidentes.indicadores.accidentesReconocidosARL,
    accidentesObjetadosARL: accidentes.indicadores.accidentesObjetadosARL,
    accidentesGraves: accidentes.indicadores.accidentesGraves,
    accidentesFatales: accidentes.indicadores.accidentesFatales,
    diasIncapacidadAT: accidentes.indicadores.diasIncapacidadAT,
    casiAccidentes: accidentes.indicadores.casiAccidentes,
    actosInseguros: accidentes.indicadores.actosInseguros,
    condicionesInseguras: accidentes.indicadores.condicionesInseguras,
  };

  return {
    periodo,
    organizacion: obtenerDatosOrganizacion(),
    estadisticasLegales: armarEstadisticasLegales(
      indicadoresAccidentes,
      medicina.indicadores,
      actividades.resumen
    ),
    accidentes: {
      indicadores: indicadoresAccidentes,
      filasAccidentes: accidentes.filasAccidentes,
      filasInvestigaciones: accidentes.filasInvestigaciones,
    },
    medicinaLaboral: {
      indicadores: medicina.indicadores,
      filasSeguimientos: medicina.filasSeguimientos,
    },
    inspecciones: inspecciones.resumen,
    actividades: actividades.resumen,
    seccionesIncompletas: [...inspecciones.fallos, ...actividades.fallos],
    generadoEn: new Date().toISOString(),
  };
}
