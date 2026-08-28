// ══════════════════════════════════════════════════════════
// Actividades de promoción y prevención — Informe mensual
//
// Alimenta el indicador legal "Actividades de P&P ejecutadas" y la tabla de
// detalle del formato. Reúne cuatro orígenes: capacitaciones, inducciones,
// inspecciones y reuniones de comité.
// ══════════════════════════════════════════════════════════
import { airtableSGSSTConfig } from "@/infrastructure/config/airtableSGSST";
import { airtableInduccionesConfig } from "@/infrastructure/config/airtableInducciones";
import {
  enlaces,
  filtroPeriodo,
  texto,
  traerOpcional,
  traerRegistros,
} from "./airtable";
import type {
  FilaActividad,
  ResumenActividades,
  ResumenInspecciones,
} from "./types";

/**
 * Normaliza una descripción para la tabla del informe.
 *
 * `Temas_Tratados` suele traer la convocatoria completa de la capacitación,
 * con saltos de línea y viñetas. En una celda de tabla eso ocupa media página
 * y desplaza el resto del documento.
 */
function resumirDescripcion(valor: string, maximo = 160): string {
  const plano = valor.replace(/\s+/g, " ").trim();
  if (plano.length <= maximo) return plano;
  // Se corta en el último espacio para no partir una palabra.
  const corte = plano.lastIndexOf(" ", maximo);
  return plano.slice(0, corte > maximo * 0.6 ? corte : maximo).trimEnd() + "…";
}

/** Capacitaciones dictadas en el periodo, con sus asistentes. */
async function capacitaciones(
  desde: string,
  hasta: string
): Promise<{ filas: FilaActividad[]; participantes: number; fallo: string | null }> {
  const F = airtableSGSSTConfig.eventosCapacitacionFields;

  const { registros, fallo } = await traerOpcional("Capacitaciones", () =>
    traerRegistros(airtableSGSSTConfig.eventosCapacitacionTableId, {
      filtro: filtroPeriodo(F.FECHA, desde, hasta),
      campoOrden: F.FECHA,
      direccionOrden: "asc",
    })
  );

  let participantes = 0;
  const filas: FilaActividad[] = registros.map((r) => {
    // Los asistentes se cuentan por los enlaces de la cabecera: es el mismo
    // número que muestra el registro de asistencia, sin leer la tabla detalle.
    const asistentes = enlaces(r.fields[F.ASISTENCIA_LINK]).length;
    participantes += asistentes;

    const tema =
      texto(r.fields[F.TEMAS_TRATADOS]) ||
      texto(r.fields[F.TIPO]) ||
      "Capacitación";

    return {
      origen: "Capacitación",
      descripcion: resumirDescripcion(tema),
      fecha: texto(r.fields[F.FECHA]),
      responsable: texto(r.fields[F.NOMBRE_CONFERENCISTA]) || "—",
      participantes: asistentes,
    };
  });

  return { filas, participantes, fallo };
}

/** Inducciones y reinducciones realizadas en el periodo. */
async function inducciones(
  desde: string,
  hasta: string
): Promise<{ filas: FilaActividad[]; fallo: string | null }> {
  const F = airtableInduccionesConfig.registrosFields;

  const { registros, fallo } = await traerOpcional("Inducciones", () =>
    traerRegistros(airtableInduccionesConfig.registrosTableId, {
      filtro: filtroPeriodo(F.FECHA_REALIZACION, desde, hasta),
      campoOrden: F.FECHA_REALIZACION,
      direccionOrden: "asc",
    })
  );

  const filas: FilaActividad[] = registros.map((r) => {
    // El catálogo de Airtable guarda "Reinduccion" sin tilde.
    const esReinduccion = texto(r.fields[F.TIPO]) === "Reinduccion";
    const empleado = texto(r.fields[F.NOMBRE_EMPLEADO]) || "—";
    return {
      origen: esReinduccion ? "Reinducción" : "Inducción",
      descripcion: empleado,
      fecha: texto(r.fields[F.FECHA_REALIZACION]),
      responsable: texto(r.fields[F.RESPONSABLE_SST]) || "—",
      // Cada registro es de un solo trabajador: contarlo como participante
      // duplicaría la cifra frente a la fila misma.
      participantes: null,
    };
  });

  return { filas, fallo };
}

/** Reuniones de COPASST y COCOLAB celebradas en el periodo. */
async function reunionesComite(
  desde: string,
  hasta: string
): Promise<{ filas: FilaActividad[]; fallos: string[] }> {
  const c = airtableSGSSTConfig;

  const comites = [
    {
      nombre: "COPASST",
      tableId: c.copasstActasTableId,
      campos: c.copasstActasFields,
    },
    {
      nombre: "COCOLAB",
      tableId: c.cocolabActasTableId,
      campos: c.cocolabActasFields,
    },
  ];

  const resultados = await Promise.all(
    comites.map(async (comite) => {
      const { registros, fallo } = await traerOpcional(
        `Actas ${comite.nombre}`,
        () =>
          traerRegistros(comite.tableId, {
            filtro: filtroPeriodo(comite.campos.FECHA_REUNION, desde, hasta),
            campoOrden: comite.campos.FECHA_REUNION,
            direccionOrden: "asc",
          })
      );

      const filas: FilaActividad[] = registros.map((r) => ({
        origen: "Comité",
        descripcion:
          `Reunión ${comite.nombre}` +
          (texto(r.fields[comite.campos.NUMERO_ACTA])
            ? ` — acta ${texto(r.fields[comite.campos.NUMERO_ACTA])}`
            : ""),
        fecha: texto(r.fields[comite.campos.FECHA_REUNION]),
        responsable: texto(r.fields[comite.campos.LUGAR]) || "—",
        participantes: enlaces(r.fields[comite.campos.ASISTENTES_LINK]).length || null,
      }));

      return { filas, fallo };
    })
  );

  return {
    filas: resultados.flatMap((r) => r.filas),
    fallos: resultados.map((r) => r.fallo).filter((f): f is string => f !== null),
  };
}

/**
 * Consolida las actividades de promoción y prevención del periodo.
 *
 * Las inspecciones no se vuelven a consultar: entran desde el consolidado que
 * ya calculó `consolidarInspecciones`, para no duplicar veintitantas lecturas
 * a Airtable dentro del mismo informe.
 */
export async function consolidarActividades(
  desde: string,
  hasta: string,
  inspecciones: ResumenInspecciones
): Promise<{ resumen: ResumenActividades; fallos: string[] }> {
  const [caps, inds, comites] = await Promise.all([
    capacitaciones(desde, hasta),
    inducciones(desde, hasta),
    reunionesComite(desde, hasta),
  ]);

  const filasInspecciones: FilaActividad[] = inspecciones.filas.map((i) => ({
    origen: "Inspección",
    descripcion: `Inspección de ${i.tipoEtiqueta.toLowerCase()}${
      i.area ? ` — ${i.area}` : ""
    }`,
    fecha: i.fecha,
    responsable: i.inspector || "—",
    participantes: null,
  }));

  const filas = [
    ...caps.filas,
    ...inds.filas,
    ...filasInspecciones,
    ...comites.filas,
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));

  // `inds.filas` trae inducciones y reinducciones mezcladas; el formato las
  // reporta por separado.
  const reinducciones = inds.filas.filter((f) => f.origen === "Reinducción");

  return {
    resumen: {
      total: filas.length,
      capacitaciones: caps.filas.length,
      inducciones: inds.filas.length - reinducciones.length,
      reinducciones: reinducciones.length,
      inspecciones: filasInspecciones.length,
      reunionesComite: comites.filas.length,
      totalParticipantes: caps.participantes,
      filas,
    },
    fallos: [caps.fallo, inds.fallo, ...comites.fallos].filter(
      (f): f is string => Boolean(f)
    ),
  };
}
