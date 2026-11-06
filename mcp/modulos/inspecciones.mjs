/**
 * Inspecciones: EPP, áreas, equipos de emergencia (formato general) y los
 * cuatro formatos específicos (botiquín, extintor, camilla, kit de derrames).
 * Solo consulta.
 *
 * Registrar inspecciones no está en el conector todavía: la API de los cuatro
 * formatos específicos escribe valores que no existen en los selects de
 * Airtable (camilla y kit fallan siempre), y las demás piden firmas y fotos.
 */

import { z } from "zod";

import {
  FECHA,
  LIMITE,
  SOLO_LECTURA,
  consulta,
  contiene,
  limpiar,
  normalizar,
  recortar,
  respuesta,
} from "../comun.mjs";

const ESPECIFICAS = ["botiquin", "extintor", "camilla", "kit-derrames"];
const TIPOS = ["epp", "areas", "equipos", ...ESPECIFICAS];

const enRango = (fecha, desde, hasta) =>
  (!desde || (fecha && fecha >= desde)) && (!hasta || (fecha && fecha <= hasta));

/** Lista normalizada de un tipo de inspección, filtrada por periodo y estado. */
async function listar(api, tipo, { desde, hasta, estado, area }) {
  if (ESPECIFICAS.includes(tipo)) {
    const { data = [] } = await api.obtener(
      `/api/inspecciones-${tipo}${consulta({ desde, hasta, estado })}`,
    );
    return data.map((i) =>
      limpiar({
        idInspeccion: i.idInspeccion,
        recordId: i.recordId,
        fecha: i.fecha,
        inspector: i.inspector,
        estado: i.estado,
        elementosRevisados: i.detallesCount,
        observaciones: i.observaciones,
      }),
    );
  }

  const ruta =
    tipo === "areas"
      ? `/api/inspecciones-areas${consulta({ area, estado })}`
      : `/api/inspecciones-${tipo}`;
  const { data = [] } = await api.obtener(ruta);

  return data
    .filter((i) => enRango(i.fecha, desde, hasta))
    .filter((i) => tipo === "areas" || !estado || normalizar(i.estado) === normalizar(estado))
    .map((i) =>
      limpiar({
        idInspeccion: i.idInspeccion,
        recordId: i.id,
        fecha: i.fecha,
        inspector: i.inspector,
        area: i.area,
        estado: i.estado,
        empleadosInspeccionados: i.cantidadEmpleados,
        criterios: i.cantidadCriterios,
        criteriosBuenos: i.criteriosBuenos,
        criteriosMalos: i.criteriosMalos,
        accionesCorrectivas: i.cantidadAcciones,
        observaciones: i.observaciones,
      }),
    );
}

/** Quita lo que no se lee en una conversación: firmas, fotos, cédulas. */
function detalleAreas(d) {
  return limpiar({
    idInspeccion: d.idInspeccion,
    recordId: d.recordId,
    fecha: d.fecha,
    inspector: d.inspector,
    area: d.area,
    estado: d.estado,
    observaciones: d.observaciones,
    fotos: d.fotoUrls?.length || undefined,
    criterios: (d.criterios ?? []).map((c) =>
      limpiar({ categoria: c.categoria, criterio: c.criterio, condicion: c.condicion, observacion: c.observacion }),
    ),
    acciones: (d.acciones ?? []).map((a) =>
      limpiar({
        descripcion: a.descripcion,
        tipo: a.tipo,
        responsable: a.responsable,
        fechaPropuesta: a.fechaPropuesta,
        estado: a.estado,
        fechaCierre: a.fechaCierre,
        criterio: a.criterioRelacionado?.criterio,
      }),
    ),
    responsables: (d.responsables ?? []).map((r) =>
      limpiar({ tipo: r.tipo, nombre: r.nombre, cargo: r.cargo, firmado: Boolean(r.fechaFirma) }),
    ),
  });
}

function detalleEpp(d) {
  return limpiar({
    idInspeccion: d.idInspeccion,
    recordId: d.id,
    fecha: d.fecha,
    inspector: d.inspector,
    estado: d.estado,
    totalEmpleados: d.totalEmpleados,
    empleados: (d.empleados ?? []).map((e) =>
      limpiar({
        idEmpleado: e.idEmpleado,
        nombre: e.nombreEmpleado,
        // B = bueno, R = regular, M = malo, NA = no aplica.
        condiciones: limpiar(e.condiciones ?? {}),
        observaciones: e.observaciones,
      }),
    ),
  });
}

function detalleEquipos(d) {
  // Algunas observaciones traen pegado un JSON interno después de este separador.
  const sinJson = (texto) => (texto ?? "").split("---DATOS_DETALLADOS---")[0].trim();

  return limpiar({
    idInspeccion: d.idInspeccion,
    recordId: d.id,
    fecha: d.fecha,
    inspector: d.inspector,
    estado: d.estado,
    observaciones: sinJson(d.observaciones),
    totalEquipos: d.totalEquipos,
    equipos: (d.detalles ?? []).map((e) => {
      const { id: _i, idDetalle: _d, fotoUrl, observaciones, equipoNombre, equipoCodigo, ...criterios } = e;
      return limpiar({
        equipo: equipoNombre,
        codigo: equipoCodigo,
        ...limpiar(criterios),
        observaciones: sinJson(observaciones),
        foto: fotoUrl ? true : undefined,
      });
    }),
    responsables: (d.responsables ?? []).map((r) => limpiar({ tipo: r.tipo, nombre: r.nombre, cargo: r.cargo })),
  });
}

export function lectura(servidor, api) {
  servidor.registerTool(
    "sgsst_listar_inspecciones",
    {
      title: "Listar inspecciones",
      description:
        "Inspecciones de un tipo: epp (elementos de protección personal), areas (áreas de " +
        "trabajo), equipos (equipos de emergencia, formato general), o los formatos " +
        "específicos botiquin, extintor, camilla y kit-derrames. Cada tipo trae como máximo " +
        "las 100 más recientes. Para el total del mes por tipo, sgsst_informe_mensual es más rápido.",
      inputSchema: {
        tipo: z.enum(TIPOS),
        desde: FECHA.optional(),
        hasta: FECHA.optional(),
        estado: z.string().optional().describe("Por ejemplo Completada, Borrador, Completado (áreas)."),
        area: z
          .string()
          .optional()
          .describe("Solo para areas: Laboratorio, Pirólisis, Bodega, Administrativa o Guaicaramo."),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ tipo, desde, hasta, estado, area, limite = 50 }) =>
      respuesta(recortar(await listar(api, tipo, { desde, hasta, estado, area }), limite)),
  );

  servidor.registerTool(
    "sgsst_detalle_inspeccion",
    {
      title: "Detalle de una inspección",
      description:
        "Una inspección completa: criterios evaluados y su condición, acciones correctivas y " +
        "responsables (areas); condición de cada EPP por trabajador (epp); o el estado de cada " +
        "equipo revisado (equipos). Los formatos específicos aún no tienen detalle en la API.",
      inputSchema: {
        tipo: z.enum(["epp", "areas", "equipos"]),
        inspeccion: z.string().describe("ID de la inspección (p. ej. INSPA-PIR-20260819-A1B2) o record id."),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ tipo, inspeccion }) => {
      // Áreas busca por ID legible; EPP y equipos por record id. Se traduce
      // con la lista para que la persona pueda nombrarla como la ve.
      const lista = await listar(api, tipo, {});
      const buscado = normalizar(inspeccion);
      const encontrada = lista.find(
        (i) => i.recordId === inspeccion || normalizar(i.idInspeccion) === buscado,
      );
      if (!encontrada) {
        throw new Error(
          `No encuentro la inspección «${inspeccion}» entre las 100 más recientes de ${tipo}. ` +
            "Usa sgsst_listar_inspecciones.",
        );
      }

      const clave = tipo === "areas" ? encontrada.idInspeccion : encontrada.recordId;
      const { data } = await api.obtener(`/api/inspecciones-${tipo}/${encodeURIComponent(clave)}`);

      const armar = { areas: detalleAreas, epp: detalleEpp, equipos: detalleEquipos }[tipo];
      return respuesta(armar(data));
    },
  );

  servidor.registerTool(
    "sgsst_equipos_emergencia",
    {
      title: "Catálogo de equipos de emergencia",
      description:
        "Extintores, botiquines, camillas y kits de derrames del catálogo general, con área, " +
        "ubicación, capacidad y fecha de vencimiento. Sirve para «qué extintores vencen este mes».",
      inputSchema: {
        categoria: z.enum(["Extintor", "Botiquín", "Camilla", "Kit Derrames"]).optional(),
        area: z.string().optional().describe("Texto a buscar en el área o la ubicación."),
        venceAntesDe: FECHA.optional().describe("Solo los que vencen en o antes de esta fecha."),
        incluirInactivos: z.boolean().optional(),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ categoria, area, venceAntesDe, incluirInactivos = false, limite = 100 }) => {
      const { data = [] } = await api.obtener(
        `/api/equipos-emergencia${consulta({ includeInactive: incluirInactivos ? "true" : undefined })}`,
      );
      const filtrados = data
        .filter((e) => !categoria || e.categoria === categoria)
        .filter((e) => !area || contiene(e.area, area) || contiene(e.ubicacion, area))
        .filter((e) => !venceAntesDe || (e.fechaVencimiento && e.fechaVencimiento <= venceAntesDe))
        .map((e) =>
          limpiar({
            codigo: e.codigo,
            nombre: e.nombre,
            categoria: e.categoria,
            tipo: e.tipoEspecifico,
            area: e.area,
            ubicacion: e.ubicacion,
            capacidad: e.capacidad,
            fechaVencimiento: e.fechaVencimiento,
            estado: e.estado,
          }),
        );
      return respuesta(recortar(filtrados, limite));
    },
  );
}
