/**
 * Accidentes e incidentes de trabajo (Res. 1401/2007): eventos, su
 * investigación, las acciones preventivas y correctivas, y los reportes de
 * casi accidentes, actos y condiciones inseguras.
 *
 * Contra `/api/accidentes/*`. Los catálogos y las reglas (un accidente mortal
 * es grave, cerrar exige fecha de cierre…) los valida la ruta.
 */

import { z } from "zod";

import {
  ESTADOS_ACCION,
  ESTADOS_ARL,
  ESTADOS_EVENTO,
  ESTADOS_REPORTE,
  JERARQUIAS_CONTROL,
  MECANISMOS,
  NIVELES_RIESGO,
  PARTES_CUERPO,
  TIPOS_ACCION,
  TIPOS_EVENTO,
  TIPOS_LESION,
  TIPOS_REPORTE,
  TIPOS_RESPONSABLE,
} from "../catalogos.mjs";
import {
  ESCRITURA,
  FECHA,
  LIMITE,
  SOLO_LECTURA,
  consulta,
  hoy,
  limpiar,
  porReferencia,
  recortar,
  resolverTrabajador,
  respuesta,
} from "../comun.mjs";

/* ------------------------------- Resúmenes -------------------------------- */

export function resumirEvento(evento) {
  return limpiar({
    idEvento: evento.idEvento,
    recordId: evento.recordId,
    tipoEvento: evento.tipoEvento,
    fechaEvento: evento.fechaEvento,
    horaEvento: evento.horaEvento,
    trabajador: evento.nombreEmpleado,
    idEmpleado: evento.idEmpleadoCore,
    cargo: evento.cargo,
    lugarArea: evento.lugarArea,
    descripcion: evento.descripcion,
    mecanismo: evento.mecanismo,
    tipoLesion: evento.tipoLesion,
    parteCuerpo: evento.parteCuerpo,
    conLesion: evento.conLesion,
    grave: evento.grave,
    mortal: evento.mortal,
    diasIncapacidad: evento.diasIncapacidad,
    fechaInicioIncapacidad: evento.fechaInicioIncapacidad,
    fechaFinIncapacidad: evento.fechaFinIncapacidad,
    causaPrincipal: evento.causaPrincipal,
    estado: evento.estado,
    estadoARL: evento.estadoARL,
    fechaReporteARL: evento.fechaReporteARL,
    numeroFURAT: evento.numeroFURAT,
    tieneInvestigacion: evento.tieneInvestigacion,
    evidencias: evento.evidencias?.length || undefined,
    observaciones: evento.observaciones,
  });
}

export function resumirAccion(accion) {
  return limpiar({
    idAccion: accion.idAccion,
    recordId: accion.recordId,
    tipo: accion.tipo,
    jerarquiaControl: accion.jerarquiaControl,
    descripcion: accion.descripcion,
    responsable: accion.responsableNombre,
    responsableTipo: accion.responsableTipo,
    estado: accion.estado,
    fechaEjecucion: accion.fechaEjecucion,
    fechaCierre: accion.fechaCierre,
    eventoRecordId: accion.eventoRecordId,
    investigacionRecordId: accion.investigacionRecordId,
    observaciones: accion.observaciones,
  });
}

export function resumirReporte(reporte) {
  return limpiar({
    idReporte: reporte.idReporte,
    recordId: reporte.recordId,
    tipo: reporte.tipo,
    fechaReporte: reporte.fechaReporte,
    reportante: reporte.reportanteNombre,
    areaLugar: reporte.areaLugar,
    descripcion: reporte.descripcion,
    nivelRiesgo: reporte.nivelRiesgo,
    accionInmediata: reporte.accionInmediata,
    responsable: reporte.responsableNombre,
    estado: reporte.estado,
    fechaCierre: reporte.fechaCierre,
    observaciones: reporte.observaciones,
  });
}

function resumirInvestigacion(inv) {
  if (!inv) return null;
  return limpiar({
    idInvestigacion: inv.idInvestigacion,
    recordId: inv.recordId,
    fechaInvestigacion: inv.fechaInvestigacion,
    equipoInvestigador: inv.equipoInvestigador,
    metodologia: inv.metodologia,
    causasInmediatasActos: inv.causasInmediatasActos,
    causasInmediatasCondiciones: inv.causasInmediatasCondiciones,
    causasBasicasPersonales: inv.causasBasicasPersonales,
    causasBasicasLaborales: inv.causasBasicasLaborales,
    conclusiones: inv.conclusiones,
    estado: inv.estado,
    fechaEnvioARL: inv.fechaEnvioARL,
    observaciones: inv.observaciones,
  });
}

/* ------------------------------ Resolvedores ------------------------------ */

const esRecordId = (valor) => /^rec[A-Za-z0-9]{14}$/.test(valor);

/** Un evento por record id o por su consecutivo (`AT-2026-001`). */
async function resolverEvento(api, referencia) {
  if (esRecordId(referencia)) return referencia;
  const { data: eventos = [] } = await api.obtener("/api/accidentes/eventos");
  const evento = porReferencia(eventos, referencia, "idEvento");
  if (!evento) {
    throw new Error(
      `No encuentro el evento «${referencia}». Usa sgsst_listar_accidentes para ver los consecutivos.`,
    );
  }
  return evento.recordId;
}

async function resolverEn(api, ruta, referencia, campo, herramienta) {
  if (esRecordId(referencia)) return referencia;
  const { data: registros = [] } = await api.obtener(ruta);
  const registro = porReferencia(registros, referencia, campo);
  if (!registro) {
    throw new Error(`No encuentro «${referencia}». Usa ${herramienta} para ver los consecutivos.`);
  }
  return registro.recordId;
}

/* -------------------------------- Lectura --------------------------------- */

export function lectura(servidor, api) {
  servidor.registerTool(
    "sgsst_listar_accidentes",
    {
      title: "Listar accidentes e incidentes",
      description:
        "Accidentes e incidentes de trabajo registrados, del más reciente al más antiguo. " +
        "Sin fechas trae todo el histórico. Para el detalle con investigación y acciones usa " +
        "sgsst_detalle_accidente.",
      inputSchema: {
        desde: FECHA.optional().describe("Fecha del evento desde (YYYY-MM-DD)."),
        hasta: FECHA.optional().describe("Fecha del evento hasta (YYYY-MM-DD)."),
        tipoEvento: z.enum(TIPOS_EVENTO).optional(),
        estado: z.enum(ESTADOS_EVENTO).optional(),
        trabajador: z
          .string()
          .optional()
          .describe("Nombre, documento o ID de empleado del trabajador involucrado."),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ desde, hasta, tipoEvento, estado, trabajador, limite = 50 }) => {
      const idEmpleadoCore = trabajador
        ? (await resolverTrabajador(api, trabajador)).idEmpleado
        : undefined;
      const { data = [] } = await api.obtener(
        `/api/accidentes/eventos${consulta({ desde, hasta, tipoEvento, estado, idEmpleadoCore })}`,
      );
      return respuesta(recortar(data.map(resumirEvento), limite));
    },
  );

  servidor.registerTool(
    "sgsst_detalle_accidente",
    {
      title: "Detalle de un accidente",
      description:
        "Un accidente o incidente con su investigación (causas, metodología, conclusiones) y " +
        "sus acciones preventivas y correctivas.",
      inputSchema: {
        evento: z.string().describe("Consecutivo (AT-2026-001) o record id del evento."),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ evento }) => {
      const recordId = await resolverEvento(api, evento);
      const { data } = await api.obtener(`/api/accidentes/eventos/${recordId}`);
      return respuesta({
        evento: resumirEvento(data.evento),
        investigacion: resumirInvestigacion(data.investigacion),
        acciones: (data.acciones ?? []).map(resumirAccion),
      });
    },
  );

  servidor.registerTool(
    "sgsst_listar_reportes",
    {
      title: "Listar reportes de actos y condiciones inseguras",
      description:
        "Reportes preventivos: casi accidentes, actos inseguros y condiciones inseguras. " +
        "Sin fechas trae todo el histórico.",
      inputSchema: {
        desde: FECHA.optional(),
        hasta: FECHA.optional(),
        tipo: z.enum(TIPOS_REPORTE).optional(),
        estado: z.enum(ESTADOS_REPORTE).optional(),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ desde, hasta, tipo, estado, limite = 50 }) => {
      const { data = [] } = await api.obtener(
        `/api/accidentes/reportes${consulta({ desde, hasta, tipo, estado })}`,
      );
      return respuesta(recortar(data.map(resumirReporte), limite));
    },
  );

  servidor.registerTool(
    "sgsst_listar_acciones",
    {
      title: "Listar acciones preventivas y correctivas",
      description:
        "Acciones derivadas de accidentes e investigaciones, ordenadas por fecha de ejecución. " +
        "Útil para ver qué está pendiente o vencido. Ojo: con desde/hasta quedan fuera las " +
        "acciones sin fecha de ejecución.",
      inputSchema: {
        desde: FECHA.optional().describe("Fecha de ejecución desde."),
        hasta: FECHA.optional().describe("Fecha de ejecución hasta."),
        estado: z.enum(ESTADOS_ACCION).optional(),
        evento: z.string().optional().describe("Solo las de este evento (AT-2026-001 o record id)."),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ desde, hasta, estado, evento, limite = 50 }) => {
      const eventoRecordId = evento ? await resolverEvento(api, evento) : undefined;
      const { data = [] } = await api.obtener(
        `/api/accidentes/acciones${consulta({ desde, hasta, estado, eventoRecordId })}`,
      );
      return respuesta(recortar(data.map(resumirAccion), limite));
    },
  );

  servidor.registerTool(
    "sgsst_indicadores_accidentalidad",
    {
      title: "Indicadores de accidentalidad",
      description:
        "Indicadores legales de accidentalidad de un periodo: accidentes reconocidos y objetados " +
        "por la ARL, graves, fatales, días de incapacidad, casi accidentes, actos y condiciones " +
        "inseguras, investigaciones y acciones. Sin fechas usa el mes en curso.",
      inputSchema: { desde: FECHA.optional(), hasta: FECHA.optional() },
      annotations: SOLO_LECTURA,
    },
    async ({ desde, hasta }) => {
      const { data } = await api.obtener(`/api/accidentes/indicadores${consulta({ desde, hasta })}`);
      // `pendientesDeOtrosModulos` quedó desactualizado: medicina laboral ya existe.
      const { pendientesDeOtrosModulos: _viejo, ...resto } = data;
      return respuesta(resto);
    },
  );
}

/* -------------------------------- Escritura ------------------------------- */

export function escritura(servidor, api) {
  servidor.registerTool(
    "sgsst_registrar_accidente",
    {
      title: "Registrar accidente o incidente",
      description:
        "Registra un accidente o incidente de trabajo. Genera el consecutivo AT-AAAA-NNN, queda " +
        "en estado Abierto y con la ARL «Pendiente de reporte». Un evento mortal se marca grave. " +
        "Antes de llamar confirma con la persona el trabajador, la fecha y la descripción: queda " +
        "en el registro legal de accidentalidad.",
      inputSchema: {
        trabajador: z.string().describe("Nombre, documento o ID de empleado del trabajador."),
        tipoEvento: z.enum(TIPOS_EVENTO),
        fechaEvento: FECHA,
        descripcion: z.string().min(5).describe("Qué pasó, en palabras de quien reporta."),
        horaEvento: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM").optional(),
        lugarArea: z.string().optional(),
        mecanismo: z.enum(MECANISMOS).optional(),
        tipoLesion: z.enum(TIPOS_LESION).optional(),
        parteCuerpo: z.array(z.enum(PARTES_CUERPO)).optional(),
        conLesion: z.boolean().optional(),
        grave: z.boolean().optional(),
        mortal: z.boolean().optional(),
        diasIncapacidad: z.number().int().min(0).optional(),
        fechaInicioIncapacidad: FECHA.optional(),
        fechaFinIncapacidad: FECHA.optional(),
        causaPrincipal: z.string().optional(),
        observaciones: z.string().optional(),
      },
      annotations: ESCRITURA,
    },
    async ({ trabajador, mortal, grave, ...datos }) => {
      const persona = await resolverTrabajador(api, trabajador);
      const { data } = await api.crear("/api/accidentes/eventos", {
        ...datos,
        idEmpleadoCore: persona.idEmpleado,
        nombreEmpleado: persona.nombreCompleto,
        numeroDocumento: persona.numeroDocumento,
        cargo: persona.tipoPersonal,
        mortal,
        grave: grave || mortal || undefined,
      });
      return respuesta({ registrado: resumirEvento(data) });
    },
  );

  servidor.registerTool(
    "sgsst_actualizar_accidente",
    {
      title: "Actualizar seguimiento de un accidente",
      description:
        "Actualiza el seguimiento de un evento: estado, estado ante la ARL, fecha de reporte a la " +
        "ARL, número de FURAT, días de incapacidad u observaciones. Solo cambia lo que se envía.",
      inputSchema: {
        evento: z.string().describe("Consecutivo (AT-2026-001) o record id."),
        estado: z.enum(ESTADOS_EVENTO).optional(),
        estadoARL: z.enum(ESTADOS_ARL).optional(),
        fechaReporteARL: FECHA.optional(),
        numeroFURAT: z.string().optional(),
        diasIncapacidad: z.number().int().min(0).optional(),
        fechaInicioIncapacidad: FECHA.optional(),
        fechaFinIncapacidad: FECHA.optional(),
        observaciones: z.string().optional(),
      },
      annotations: ESCRITURA,
    },
    async ({ evento, ...cambios }) => {
      const datos = limpiar(cambios);
      if (Object.keys(datos).length === 0) throw new Error("No hay nada que actualizar.");
      const recordId = await resolverEvento(api, evento);
      const { data } = await api.actualizar(`/api/accidentes/eventos/${recordId}`, datos);
      return respuesta({ actualizado: resumirEvento(data) });
    },
  );

  servidor.registerTool(
    "sgsst_registrar_reporte",
    {
      title: "Registrar casi accidente, acto o condición insegura",
      description:
        "Registra un reporte preventivo (REP-AAAA-NNN), en estado Abierto. Si no se dice quién " +
        "reporta, queda a nombre de la persona de la sesión.",
      inputSchema: {
        tipo: z.enum(TIPOS_REPORTE),
        descripcion: z.string().min(5),
        fechaReporte: FECHA.optional().describe("Por defecto hoy."),
        areaLugar: z.string().optional(),
        nivelRiesgo: z.enum(NIVELES_RIESGO).optional().describe("Por defecto Medio, como en el dashboard."),
        accionInmediata: z.string().optional(),
        responsableNombre: z.string().optional().describe("Quién debe gestionarlo."),
        reportante: z
          .string()
          .optional()
          .describe("Quién reporta (nombre, documento o ID). Por defecto, la persona de la sesión."),
        observaciones: z.string().optional(),
      },
      annotations: ESCRITURA,
    },
    async ({ reportante, fechaReporte, nivelRiesgo = "Medio", ...datos }) => {
      const quien = reportante
        ? await resolverTrabajador(api, reportante)
        : (await api.obtener("/api/auth/sesion")).data;
      const { data } = await api.crear("/api/accidentes/reportes", {
        ...datos,
        fechaReporte: fechaReporte ?? hoy(),
        nivelRiesgo,
        reportanteIdCore: quien.idEmpleado,
        reportanteNombre: quien.nombreCompleto,
      });
      return respuesta({ registrado: resumirReporte(data) });
    },
  );

  servidor.registerTool(
    "sgsst_actualizar_reporte",
    {
      title: "Actualizar o cerrar un reporte",
      description:
        "Cambia el estado de un reporte preventivo o completa su gestión. Al cerrarlo sin " +
        "fecha de cierre se usa hoy.",
      inputSchema: {
        reporte: z.string().describe("Consecutivo (REP-2026-001) o record id."),
        estado: z.enum(ESTADOS_REPORTE).optional(),
        fechaCierre: FECHA.optional(),
        accionInmediata: z.string().optional(),
        responsableNombre: z.string().optional(),
        nivelRiesgo: z.enum(NIVELES_RIESGO).optional(),
        observaciones: z.string().optional(),
      },
      annotations: ESCRITURA,
    },
    async ({ reporte, ...cambios }) => {
      const datos = limpiar(cambios);
      if (datos.estado === "Cerrado" && !datos.fechaCierre) datos.fechaCierre = hoy();
      if (Object.keys(datos).length === 0) throw new Error("No hay nada que actualizar.");
      const recordId = await resolverEn(
        api,
        "/api/accidentes/reportes",
        reporte,
        "idReporte",
        "sgsst_listar_reportes",
      );
      const { data } = await api.actualizar(`/api/accidentes/reportes/${recordId}`, datos);
      return respuesta({ actualizado: resumirReporte(data) });
    },
  );

  servidor.registerTool(
    "sgsst_registrar_accion",
    {
      title: "Registrar acción preventiva o correctiva",
      description:
        "Registra una acción (ACC-AAAA-NNN) asociada a un accidente; si el evento ya tiene " +
        "investigación, queda enlazada también a ella. Queda en estado Pendiente.",
      inputSchema: {
        evento: z.string().describe("Consecutivo (AT-2026-001) o record id del evento."),
        tipo: z.enum(TIPOS_ACCION),
        descripcion: z.string().min(5),
        jerarquiaControl: z.enum(JERARQUIAS_CONTROL).optional(),
        responsableNombre: z.string().optional(),
        responsableTipo: z.enum(TIPOS_RESPONSABLE).optional().describe("Por defecto Empresa."),
        fechaEjecucion: FECHA.optional().describe("Fecha planeada de ejecución."),
        observaciones: z.string().optional(),
      },
      annotations: ESCRITURA,
    },
    async ({ evento, responsableTipo = "Empresa", ...datos }) => {
      const recordId = await resolverEvento(api, evento);
      const { data: detalle } = await api.obtener(`/api/accidentes/eventos/${recordId}`);
      const { data } = await api.crear("/api/accidentes/acciones", {
        ...datos,
        responsableTipo,
        eventoRecordId: recordId,
        investigacionRecordId: detalle.investigacion?.recordId,
      });
      return respuesta({ registrada: resumirAccion(data) });
    },
  );

  servidor.registerTool(
    "sgsst_actualizar_accion",
    {
      title: "Actualizar o cerrar una acción",
      description:
        "Cambia el estado de una acción preventiva o correctiva (por ejemplo, a Cerrada). Al " +
        "cerrarla sin fecha de cierre se usa hoy.",
      inputSchema: {
        accion: z.string().describe("Consecutivo (ACC-2026-001) o record id."),
        estado: z.enum(ESTADOS_ACCION).optional(),
        fechaCierre: FECHA.optional(),
        fechaEjecucion: FECHA.optional(),
        responsableNombre: z.string().optional(),
        observaciones: z.string().optional(),
      },
      annotations: ESCRITURA,
    },
    async ({ accion, ...cambios }) => {
      const datos = limpiar(cambios);
      if (datos.estado === "Cerrada" && !datos.fechaCierre) datos.fechaCierre = hoy();
      if (Object.keys(datos).length === 0) throw new Error("No hay nada que actualizar.");
      const recordId = await resolverEn(
        api,
        "/api/accidentes/acciones",
        accion,
        "idAccion",
        "sgsst_listar_acciones",
      );
      const { data } = await api.actualizar(`/api/accidentes/acciones/${recordId}`, datos);
      return respuesta({ actualizada: resumirAccion(data) });
    },
  );
}
