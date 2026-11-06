/**
 * Medicina laboral: exámenes ocupacionales, seguimientos, incapacidades,
 * reubicaciones y enfermedades laborales. Solo consulta.
 *
 * Son datos de salud (datos sensibles, Ley 1581 de 2012): las herramientas
 * los traen porque la sesión ya puede verlos en el dashboard, pero las
 * descripciones le piden a Claude no repetirlos más allá de lo que se pregunte.
 */

import { z } from "zod";

import {
  ESTADOS_ENFERMEDAD_LABORAL,
  ESTADOS_EXAMEN,
  ESTADOS_REUBICACION,
  TIPOS_EXAMEN,
  TIPOS_INCAPACIDAD,
  TIPOS_REUBICACION,
  TIPOS_SEGUIMIENTO,
} from "../catalogos.mjs";
import {
  FECHA,
  LIMITE,
  SOLO_LECTURA,
  consulta,
  limpiar,
  recortar,
  resolverTrabajador,
  respuesta,
} from "../comun.mjs";

/**
 * Por registro: la ruta, el nombre del filtro de tipo que espera esa ruta y
 * los valores válidos de tipo y estado. Cada ruta llama distinto a su filtro.
 */
const REGISTROS = {
  examenes: { filtroTipo: "tipoExamen", tipos: TIPOS_EXAMEN, estados: ESTADOS_EXAMEN },
  seguimientos: { filtroTipo: "tipoSeguimiento", tipos: TIPOS_SEGUIMIENTO, estados: null },
  incapacidades: { filtroTipo: "tipo", tipos: TIPOS_INCAPACIDAD, estados: null },
  reubicaciones: { filtroTipo: "tipo", tipos: TIPOS_REUBICACION, estados: ESTADOS_REUBICACION },
  "enfermedades-laborales": { filtroTipo: null, tipos: null, estados: ESTADOS_ENFERMEDAD_LABORAL },
};

/** El tope de una página de Airtable: la ruta no pagina más allá. */
const TOPE_RUTA = 100;

function resumir(registro) {
  // Lo que no aporta en una conversación: ids internos, auditoría, documento.
  const {
    recordId: _r,
    activo: _a,
    createdAt: _c,
    updatedAt: _u,
    numeroDocumento: _d,
    documentoUrl: _url,
    ...resto
  } = registro;
  return limpiar(resto);
}

export function lectura(servidor, api) {
  servidor.registerTool(
    "sgsst_listar_medicina_laboral",
    {
      title: "Consultar medicina laboral",
      description:
        "Registros de medicina laboral de un periodo: exámenes ocupacionales, seguimientos, " +
        "incapacidades, reubicaciones o enfermedades laborales. Sin periodo usa el mes en " +
        "curso; para el histórico pasa un rango amplio (desde 2000-01-01). Las incapacidades " +
        "solo aparecen si caben enteras en el periodo. Son datos de salud: responde solo lo " +
        "que se pregunta y no los copies a otros sistemas.",
      inputSchema: {
        registro: z.enum(Object.keys(REGISTROS)),
        desde: FECHA.optional().describe("Va junto con hasta."),
        hasta: FECHA.optional(),
        mes: z.number().int().min(1).max(12).optional().describe("Alternativa a desde/hasta; va con anio."),
        anio: z.number().int().min(2000).max(2100).optional(),
        trabajador: z.string().optional().describe("Nombre, documento o ID de empleado."),
        tipo: z
          .string()
          .optional()
          .describe(
            "examenes: Ingreso|Periódico|Egreso|Reintegro. seguimientos: Restricción médica|" +
              "Control periódico|Valoración especializada|Otro. incapacidades: Enfermedad general|" +
              "Enfermedad laboral|Accidente de trabajo|Licencia maternidad|Licencia paternidad. " +
              "reubicaciones: Temporal|Definitiva.",
          ),
        estado: z
          .string()
          .optional()
          .describe(
            "examenes: Programado|Realizado|Cancelado. reubicaciones: Activa|Rehabilitado|Cerrada. " +
              "enfermedades-laborales: En proceso de calificación|Reconocida por ARL|Objetada|" +
              "En junta de calificación|Cerrada.",
          ),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ registro, desde, hasta, mes, anio, trabajador, tipo, estado, limite = 50 }) => {
      const config = REGISTROS[registro];

      if (tipo && !config.tipos?.includes(tipo)) {
        throw new Error(
          config.tipos
            ? `Para ${registro} el tipo es uno de: ${config.tipos.join(", ")}.`
            : `${registro} no se filtra por tipo.`,
        );
      }
      if (estado && !config.estados?.includes(estado)) {
        throw new Error(
          config.estados
            ? `Para ${registro} el estado es uno de: ${config.estados.join(", ")}.`
            : `${registro} no se filtra por estado.`,
        );
      }
      // La ruta descarta en silencio un desde sin hasta; mejor decirlo.
      if ((desde === undefined) !== (hasta === undefined)) {
        throw new Error("desde y hasta van juntos.");
      }
      if ((mes === undefined) !== (anio === undefined)) {
        throw new Error("mes y anio van juntos.");
      }

      const idEmpleadoCore = trabajador
        ? (await resolverTrabajador(api, trabajador)).idEmpleado
        : undefined;

      const params = { desde, hasta, mes, anio, idEmpleadoCore, estado };
      if (config.filtroTipo && tipo) params[config.filtroTipo] = tipo;

      const { data = [] } = await api.obtener(`/api/medicina-laboral/${registro}${consulta(params)}`);
      const salida = recortar(data.map(resumir), limite);

      if (data.length >= TOPE_RUTA) {
        salida.advertencia =
          `La ruta devuelve como máximo ${TOPE_RUTA} registros por consulta: puede haber más. ` +
          "Acota el periodo.";
      }
      return respuesta(salida);
    },
  );

  servidor.registerTool(
    "sgsst_indicadores_medicina_laboral",
    {
      title: "Indicadores de medicina laboral",
      description:
        "Los 6 indicadores de medicina laboral del informe mensual: días de incapacidad por " +
        "enfermedad general, enfermedades laborales en proceso y reconocidas, trabajadores " +
        "reubicados (temporal y definitivo) y rehabilitados. Sin periodo usa el mes en curso.",
      inputSchema: {
        desde: FECHA.optional(),
        hasta: FECHA.optional(),
        mes: z.number().int().min(1).max(12).optional(),
        anio: z.number().int().min(2000).max(2100).optional(),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ desde, hasta, mes, anio }) => {
      const { data } = await api.obtener(
        `/api/medicina-laboral/indicadores${consulta({ desde, hasta, mes, anio })}`,
      );
      return respuesta({
        periodo: data.periodo,
        indicadores: data.indicadores,
        seguimientos: data.filasSeguimientos,
        incapacidades: data.filasIncapacidades,
      });
    },
  );
}
