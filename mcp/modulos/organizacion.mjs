/**
 * Lo organizacional del SG-SST: políticas y su firma, comités (COPASST y
 * COCOLAB) e inducciones. Solo consulta.
 */

import { z } from "zod";

import { LIMITE, SOLO_LECTURA, consulta, limpiar, normalizar, recortar, respuesta } from "../comun.mjs";

const COMITES = ["COPASST", "COCOLAB"];

/**
 * Un acta sin lo que no debe salir a una conversación: las firmas (cifradas)
 * y, en COCOLAB, el detalle de las quejas de acoso, que identifica personas.
 */
function resumirActa(acta, comite) {
  const {
    firmaPresidente: _fp,
    firmaSecretario: _fs,
    asistentes,
    quejasAcosoDetalle: _qd,
    conflictosLaboralesDetalle: _cd,
    urlDocumento: _url,
    createdAt: _c,
    updatedAt: _u,
    ...resto
  } = acta;

  return limpiar({
    ...resto,
    comite,
    firmada: Boolean(acta.firmaPresidente && acta.firmaSecretario),
    asistentes: asistentes?.length
      ? asistentes.map((a) => limpiar({ nombre: a.nombre, cargo: a.cargo, rol: a.rol, asistio: a.asistio }))
      : undefined,
  });
}

export function lectura(servidor, api) {
  servidor.registerTool(
    "sgsst_politicas",
    {
      title: "Políticas y su firma",
      description:
        "Sin politica: las políticas activas (código, título, versión, si requieren firma). Con " +
        "politica: cuántos trabajadores la firmaron y quiénes faltan. Las cifras se calculan " +
        "sobre los primeros 100 registros de personal y de firmas.",
      inputSchema: {
        politica: z.string().optional().describe("Código, título o record id de la política."),
        incluirInactivas: z.boolean().optional(),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ politica, incluirInactivas = false }) => {
      const { data: politicas = [] } = await api.obtener(
        `/api/politicas${consulta({ incluirInactivas: incluirInactivas ? "true" : undefined })}`,
      );

      if (!politica) {
        return respuesta(
          politicas.map((p) =>
            limpiar({
              codigo: p.codigo,
              titulo: p.titulo,
              categoria: p.categoria,
              version: p.version,
              estado: p.estado,
              fechaVigencia: p.fechaVigencia,
              requiereFirma: p.requiereFirma,
            }),
          ),
        );
      }

      const buscado = normalizar(politica);
      const candidatas = politicas.filter(
        (p) =>
          p.id === politica ||
          normalizar(p.codigo) === buscado ||
          normalizar(p.titulo).includes(buscado),
      );
      if (candidatas.length !== 1) {
        throw new Error(
          candidatas.length === 0
            ? `No encuentro la política «${politica}». Llama sin politica para ver la lista.`
            : `«${politica}» coincide con: ${candidatas.map((p) => `${p.codigo} — ${p.titulo}`).join("; ")}. Precisa cuál.`,
        );
      }

      const elegida = candidatas[0];
      const { data } = await api.obtener(
        `/api/politicas/estadisticas${consulta({ politicaId: elegida.id })}`,
      );
      return respuesta({
        politica: `${elegida.codigo} — ${elegida.titulo}`,
        total: data.total,
        firmaron: data.totalFirmaron,
        pendientes: data.totalPendientes,
        porcentajeFirmado: Number(data.porcentajeFirmado) || 0,
        quienesFaltan: (data.pendientes ?? []).map((p) => limpiar({ nombre: p.nombreCompleto, cargo: p.cargo })),
      });
    },
  );

  servidor.registerTool(
    "sgsst_actas_comite",
    {
      title: "Actas de comité",
      description:
        "Actas del COPASST o del COCOLAB (las 50 más recientes), con lo tratado en cada reunión. " +
        "Con acta (número NNN-AAAA) trae el detalle: asistentes, compromisos y, en COPASST, " +
        "condiciones inseguras revisadas. El detalle de quejas de acoso del COCOLAB no se " +
        "expone: solo los conteos.",
      inputSchema: {
        comite: z.enum(COMITES),
        acta: z.string().optional().describe("Número del acta, p. ej. 003-2026."),
        anio: z.number().int().min(2000).max(2100).optional(),
        mes: z.number().int().min(1).max(12).optional(),
        estado: z.enum(["borrador", "firmada"]).optional(),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ comite, acta, anio, mes, estado }) => {
      const base = `/api/${comite.toLowerCase()}/actas`;

      if (acta) {
        const { data } = await api.obtener(`${base}/${encodeURIComponent(acta)}`);
        return respuesta(resumirActa(data, comite));
      }

      const { data = [] } = await api.obtener(`${base}${consulta({ anio, mes, estado })}`);
      return respuesta(data.map((a) => resumirActa(a, comite)));
    },
  );

  servidor.registerTool(
    "sgsst_compromisos_comite",
    {
      title: "Compromisos pendientes de un comité",
      description:
        "Los compromisos sin cumplir del COPASST o del COCOLAB, del más próximo a vencer al más " +
        "lejano, con responsable y fecha límite.",
      inputSchema: { comite: z.enum(COMITES), limite: LIMITE },
      annotations: SOLO_LECTURA,
    },
    async ({ comite, limite = 100 }) => {
      const { data = [] } = await api.obtener(`/api/${comite.toLowerCase()}/compromisos/pendientes`);
      return respuesta(
        recortar(
          data.map((c) => limpiar({ compromiso: c.compromiso, responsable: c.responsable, fechaLimite: c.fechaLimite })),
          limite,
        ),
      );
    },
  );

  servidor.registerTool(
    "sgsst_miembros_comite",
    {
      title: "Miembros de un comité",
      description: "Integrantes activos del COPASST o del COCOLAB con su rol y cargo.",
      inputSchema: {
        comite: z.enum(COMITES),
        incluirInactivos: z.boolean().optional(),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ comite, incluirInactivos = false }) => {
      const { data = [] } = await api.obtener(
        `/api/comites/miembros${consulta({ comite, estado: incluirInactivos ? "todos" : undefined })}`,
      );
      return respuesta(
        data.map((m) => limpiar({ nombre: m.nombre, rol: m.rol, cargo: m.cargo, estado: m.estado })),
      );
    },
  );

  servidor.registerTool(
    "sgsst_estado_inducciones",
    {
      title: "Estado de inducciones y reinducciones",
      description:
        "Semáforo de inducción del personal activo: al día, por vencer (15 días o menos), " +
        "vencida o sin inducción, con los conteos de cada estado. Con más de 100 inducciones " +
        "registradas el conteo puede marcar como «sin inducción» a quien sí la tiene.",
      inputSchema: {
        estado: z
          .enum(["AL_DIA", "POR_VENCER", "VENCIDA", "SIN_INDUCCION"])
          .optional()
          .describe("Solo las personas en este estado."),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ estado, limite = 100 }) => {
      const { data = [], stats } = await api.obtener("/api/inducciones/dashboard");
      const personas = data
        .filter((p) => !estado || p.estadoSemaforo === estado)
        .map((p) =>
          limpiar({
            nombre: p.nombreCompleto,
            idEmpleado: p.idEmpleadoCore,
            cargo: p.cargo,
            estado: p.estadoSemaforo,
            diasParaVencimiento: p.diasParaVencimiento,
            ultima: p.ultimaInduccion
              ? limpiar({
                  idInduccion: p.ultimaInduccion.idInduccion,
                  tipo: p.ultimaInduccion.tipo,
                  fechaRealizacion: p.ultimaInduccion.fechaRealizacion,
                  fechaVencimiento: p.ultimaInduccion.fechaVencimiento,
                  evaluacion: p.ultimaInduccion.estadoEvaluacion,
                })
              : undefined,
          }),
        );
      return respuesta({ conteos: stats, ...recortar(personas, limite) });
    },
  );
}
