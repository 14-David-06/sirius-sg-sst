// ══════════════════════════════════════════════════════════
// Consolidado de inspecciones — Informe mensual de gestión SST
//
// Los siete tipos viven en tablas distintas pero comparten cabecera
// (consecutivo, fecha, inspector, estado), así que una sola declaración por
// tipo basta para recorrerlos todos.
// ══════════════════════════════════════════════════════════
import { airtableSGSSTConfig } from "@/infrastructure/config/airtableSGSST";
import { getConfigInspeccion } from "@/lib/inspecciones-emergencia/config";
import {
  filtroPeriodo,
  texto,
  textoONulo,
  traerOpcional,
  traerRegistros,
} from "./airtable";
import type {
  FilaInspeccion,
  ResumenInspecciones,
  TipoInspeccionInforme,
} from "./types";

interface FuenteInspeccion {
  tipo: TipoInspeccionInforme;
  etiqueta: string;
  tableId: string;
  campos: {
    ID: string;
    FECHA: string;
    INSPECTOR: string;
    ESTADO: string;
    /** Solo lo tienen las inspecciones de áreas. */
    AREA?: string;
    /** Lo que el inspector anotó. Alimenta la columna "Hallazgos". */
    OBSERVACIONES?: string;
    /**
     * Recomendación derivada de la inspección. Campo agregado en agosto 2026
     * a las siete tablas para cubrir la columna que exige el formato impreso.
     */
    RECOMENDACIONES?: string;
  };
}

/**
 * Declara las siete fuentes.
 *
 * Se resuelve en llamada, no en constante de módulo: los IDs vienen de
 * `process.env` y deben leerse cuando el request ya corre.
 */
function fuentes(): FuenteInspeccion[] {
  const c = airtableSGSSTConfig;

  const emergencia = (
    tipo: Extract<
      TipoInspeccionInforme,
      "botiquin" | "extintor" | "camilla" | "kit-derrames"
    >,
    etiqueta: string
  ): FuenteInspeccion => {
    const cfg = getConfigInspeccion(tipo);
    return {
      tipo,
      etiqueta,
      tableId: cfg.cabeceraTableId,
      campos: {
        ID: cfg.cabeceraFields.ID,
        FECHA: cfg.cabeceraFields.FECHA,
        INSPECTOR: cfg.cabeceraFields.INSPECTOR,
        ESTADO: cfg.cabeceraFields.ESTADO,
        OBSERVACIONES: cfg.cabeceraFields.OBSERVACIONES,
        RECOMENDACIONES: cfg.cabeceraFields.RECOMENDACIONES,
      },
    };
  };

  return [
    {
      tipo: "epp",
      etiqueta: "Elementos de protección personal",
      tableId: c.inspeccionesTableId,
      campos: {
        ID: c.inspeccionesFields.ID,
        FECHA: c.inspeccionesFields.FECHA,
        INSPECTOR: c.inspeccionesFields.INSPECTOR,
        ESTADO: c.inspeccionesFields.ESTADO,
        // La cabecera de EPP no lleva observaciones: van por empleado en el
        // detalle. Por eso su columna "Hallazgos" queda vacía.
        RECOMENDACIONES: c.inspeccionesFields.RECOMENDACIONES,
      },
    },
    {
      tipo: "areas",
      etiqueta: "Áreas de trabajo",
      tableId: c.inspeccionesAreasTableId,
      campos: {
        ID: c.inspeccionesAreasFields.ID,
        FECHA: c.inspeccionesAreasFields.FECHA,
        INSPECTOR: c.inspeccionesAreasFields.INSPECTOR,
        ESTADO: c.inspeccionesAreasFields.ESTADO,
        AREA: c.inspeccionesAreasFields.AREA,
      },
    },
    {
      tipo: "equipos",
      etiqueta: "Equipos de emergencia",
      tableId: c.inspEquiposTableId,
      campos: {
        ID: c.inspEquiposFields.ID,
        FECHA: c.inspEquiposFields.FECHA,
        INSPECTOR: c.inspEquiposFields.INSPECTOR,
        ESTADO: c.inspEquiposFields.ESTADO,
      },
    },
    emergencia("botiquin", "Botiquines"),
    emergencia("extintor", "Extintores"),
    emergencia("camilla", "Camillas"),
    emergencia("kit-derrames", "Kits de control de derrames"),
  ];
}

/**
 * Consolida las inspecciones de los siete tipos ejecutadas en el periodo.
 *
 * Las siete consultas van en paralelo y cada una tolera su propio fallo: si
 * una tabla no responde, el informe reporta esa sección como incompleta en
 * vez de quedarse sin consolidado.
 */
export async function consolidarInspecciones(
  desde: string,
  hasta: string
): Promise<{ resumen: ResumenInspecciones; fallos: string[] }> {
  const resultados = await Promise.all(
    fuentes().map(async (fuente) => {
      const { registros, fallo } = await traerOpcional(
        `Inspecciones de ${fuente.etiqueta.toLowerCase()}`,
        () =>
          traerRegistros(fuente.tableId, {
            filtro: filtroPeriodo(fuente.campos.FECHA, desde, hasta),
            campoOrden: fuente.campos.FECHA,
            direccionOrden: "asc",
          })
      );

      const filas: FilaInspeccion[] = registros.map((r) => ({
        tipo: fuente.tipo,
        tipoEtiqueta: fuente.etiqueta,
        consecutivo: texto(r.fields[fuente.campos.ID]),
        fecha: texto(r.fields[fuente.campos.FECHA]),
        inspector: texto(r.fields[fuente.campos.INSPECTOR]),
        area: fuente.campos.AREA
          ? textoONulo(r.fields[fuente.campos.AREA])
          : null,
        estado: texto(r.fields[fuente.campos.ESTADO]),
      }));

      return { fuente, filas, fallo };
    })
  );

  const filas = resultados
    .flatMap((r) => r.filas)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    resumen: {
      total: filas.length,
      porTipo: resultados.map((r) => ({
        tipo: r.fuente.tipo,
        etiqueta: r.fuente.etiqueta,
        cantidad: r.filas.length,
      })),
      filas,
    },
    fallos: resultados
      .map((r) => r.fallo)
      .filter((f): f is string => f !== null),
  };
}
