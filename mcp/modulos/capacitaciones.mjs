/**
 * Capacitaciones: el plan anual, los eventos realizados con su asistencia
 * firmada y los resultados de las evaluaciones. Solo consulta.
 *
 * Registrar eventos de capacitación no está en el conector: el flujo real
 * carga a todo el personal como asistente y la asistencia se confirma con la
 * firma de cada persona, y un reintento duplica el evento.
 */

import { z } from "zod";

import {
  FECHA,
  LIMITE,
  SOLO_LECTURA,
  contiene,
  limpiar,
  normalizar,
  recortar,
  respuesta,
} from "../comun.mjs";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Un evento por record id o por su código `EVT-…`, entre los 100 más recientes. */
async function resolverEvento(api, referencia) {
  if (/^rec[A-Za-z0-9]{14}$/.test(referencia)) return referencia;
  const { data = [] } = await api.obtener("/api/registros-asistencia");
  const evento = data.find((e) => normalizar(e.idRegistro) === normalizar(referencia));
  if (!evento) {
    throw new Error(
      `No encuentro el evento «${referencia}» entre los 100 más recientes. ` +
        "Usa sgsst_listar_capacitaciones_realizadas.",
    );
  }
  return evento.id;
}

export function lectura(servidor, api) {
  servidor.registerTool(
    "sgsst_plan_capacitaciones",
    {
      title: "Plan anual de capacitaciones",
      description:
        "Las capacitaciones programadas en el plan anual, con mes, trimestre, población " +
        "objetivo, si ya se ejecutaron y cuántos asistieron. La tabla guarda todos los años: " +
        "el año suele venir en el identificador.",
      inputSchema: {
        mes: z.number().int().min(1).max(12).optional(),
        trimestre: z.enum(["T1", "T2", "T3", "T4"]).optional(),
        ejecutada: z.boolean().optional().describe("true = solo ejecutadas; false = solo pendientes."),
        texto: z.string().optional().describe("Parte del nombre, código o identificador."),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ mes, trimestre, ejecutada, texto, limite = 100 }) => {
      const { data = [] } = await api.obtener("/api/programacion-capacitaciones");
      const filtradas = data
        .filter((p) => !mes || p.mes === MESES[mes - 1])
        .filter((p) => !trimestre || p.trimestre === trimestre)
        .filter((p) => ejecutada === undefined || Boolean(p.ejecutado) === ejecutada)
        .filter(
          (p) =>
            !texto ||
            contiene(p.capacitacionNombre, texto) ||
            contiene(p.capacitacionCodigo, texto) ||
            contiene(p.identificador, texto),
        )
        .map((p) =>
          limpiar({
            identificador: p.identificador,
            capacitacion: p.capacitacionNombre,
            codigo: p.capacitacionCodigo,
            categoria: p.capacitacionCategoria,
            mes: p.mes,
            trimestre: p.trimestre,
            poblacionObjetivo: p.poblacionObjetivo,
            ejecutada: Boolean(p.ejecutado),
            fechaEjecucion: p.fechaEjecucion,
            totalAsistentes: p.totalAsistentes,
            observaciones: p.observaciones,
          }),
        );
      return respuesta(recortar(filtradas, limite));
    },
  );

  servidor.registerTool(
    "sgsst_listar_capacitaciones_realizadas",
    {
      title: "Capacitaciones realizadas",
      description:
        "Eventos de capacitación, inducción y charlas registrados (los 100 más recientes), con " +
        "fecha, lugar, conferencista y estado. Para quién firmó la asistencia usa " +
        "sgsst_detalle_capacitacion.",
      inputSchema: {
        desde: FECHA.optional(),
        hasta: FECHA.optional(),
        texto: z.string().optional().describe("Parte del nombre o de los temas tratados."),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ desde, hasta, texto, limite = 50 }) => {
      const { data = [] } = await api.obtener("/api/registros-asistencia");
      const filtrados = data
        .filter((e) => (!desde || e.fecha >= desde) && (!hasta || e.fecha <= hasta))
        .filter((e) => !texto || contiene(e.nombreEvento, texto) || contiene(e.temasTratados, texto))
        .map((e) =>
          limpiar({
            idRegistro: e.idRegistro,
            recordId: e.id,
            nombre: e.nombreEvento,
            tipo: e.tipo,
            fecha: e.fecha,
            horaInicio: e.horaInicio,
            duracion: e.duracion,
            ciudad: e.ciudad,
            lugar: e.lugar,
            conferencista: e.nombreConferencista,
            estado: e.estado,
            personasConvocadas: e.cantidadAsistentes,
          }),
        );
      return respuesta(recortar(filtrados, limite));
    },
  );

  servidor.registerTool(
    "sgsst_detalle_capacitacion",
    {
      title: "Asistencia de una capacitación",
      description:
        "Un evento de capacitación con la lista de convocados y quién confirmó su asistencia " +
        "con firma. En este sistema se convoca a todo el personal y la firma es la que cuenta " +
        "como asistencia.",
      inputSchema: {
        evento: z.string().describe("Código del evento (EVT-…) o record id."),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ evento }) => {
      const recordId = await resolverEvento(api, evento);
      const { data } = await api.obtener(`/api/registros-asistencia/${recordId}`);
      const asistentes = data.asistentes ?? [];
      const firmaron = asistentes.filter((a) => a.firmaConfirmada);

      return respuesta(
        limpiar({
          idRegistro: data.idRegistro,
          nombre: data.nombreEvento,
          tipo: data.tipo,
          fecha: data.fecha,
          lugar: data.lugar,
          ciudad: data.ciudad,
          duracion: data.duracion,
          conferencista: data.nombreConferencista,
          temasTratados: data.temasTratados,
          estado: data.estado,
          convocados: asistentes.length,
          firmaron: firmaron.length,
          asistieron: firmaron.map((a) => limpiar({ nombre: a.nombre, idEmpleado: a.idEmpleado, cargo: a.labor })),
          sinFirma: asistentes
            .filter((a) => !a.firmaConfirmada)
            .map((a) => limpiar({ nombre: a.nombre, idEmpleado: a.idEmpleado })),
        }),
      );
    },
  );

  servidor.registerTool(
    "sgsst_resultados_evaluaciones",
    {
      title: "Resultados de evaluaciones de una capacitación",
      description:
        "El mejor intento de cada asistente en las evaluaciones asociadas a un evento de " +
        "capacitación: plantilla, porcentaje y si aprobó.",
      inputSchema: {
        evento: z.string().describe("Código del evento (EVT-…) o record id."),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ evento }) => {
      const registroRecordId = await resolverEvento(api, evento);
      // Es un POST, pero solo consulta: la ruta recibe el id en el cuerpo.
      const { evaluaciones = [] } = await api.crear("/api/evaluaciones/lista-evento", {
        registroRecordId,
      });
      return respuesta(
        evaluaciones.map((e) =>
          limpiar({
            nombre: e.nombres,
            idEmpleado: e.empleadoCoreId,
            evaluacion: e.plantillaNombre,
            codigo: e.plantillaCodigo,
            fecha: e.fecha,
            estado: e.estado,
            porcentaje: e.porcentaje,
          }),
        ),
      );
    },
  );
}
