/**
 * Lo transversal: quién es la sesión, el directorio de personal y el informe
 * mensual de gestión, que resume casi todo lo demás.
 */

import { z } from "zod";

import {
  LIMITE,
  SOLO_LECTURA,
  consulta,
  contiene,
  recortar,
  respuesta,
  resumirPersona,
} from "../comun.mjs";

export function lectura(servidor, api) {
  servidor.registerTool(
    "sgsst_quien_soy",
    {
      title: "Quién soy en SG-SST",
      description:
        "La sesión con la que el conector entra a SG-SST: nombre, cargo y nivel de acceso " +
        "(ordenNivel 1 = Super Admin, 2 = Admin, 3 = Avanzado, 4 = Usuario, 5 = Lectura). " +
        "Conviene llamarla primero si la pregunta depende de qué puede ver o registrar la persona.",
      inputSchema: {},
      annotations: SOLO_LECTURA,
    },
    async () => respuesta((await api.obtener("/api/auth/sesion")).data),
  );

  servidor.registerTool(
    "sgsst_buscar_trabajador",
    {
      title: "Buscar trabajador",
      description:
        "Personal activo de Sirius (sin contratistas), filtrable por nombre, documento o ID de " +
        "empleado (SIRIUS-PER-XXXX). Devuelve el ID de empleado y el cargo, que es lo que " +
        "referencian accidentes, exámenes y entregas de EPP.",
      inputSchema: {
        texto: z
          .string()
          .optional()
          .describe("Nombre (o parte), documento o ID de empleado. Sin él lista a todos."),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ texto, limite = 50 }) => {
      const { data: personal = [] } = await api.obtener("/api/personal");
      const filtrados = texto
        ? personal.filter(
            (p) =>
              contiene(p.nombreCompleto, texto) ||
              contiene(p.idEmpleado, texto) ||
              String(p.numeroDocumento ?? "").includes(texto.trim()),
          )
        : personal;
      return respuesta(recortar(filtrados.map(resumirPersona), limite));
    },
  );

  servidor.registerTool(
    "sgsst_informe_mensual",
    {
      title: "Informe mensual de gestión SST",
      description:
        "El informe mensual de gestión: los 18 indicadores legales (accidentalidad, medicina " +
        "laboral y promoción y prevención), inspecciones por tipo, actividades de P&P y las " +
        "tablas de accidentes e investigaciones del mes. Es el punto de partida para cualquier " +
        "pregunta de «cómo vamos este mes». Sin mes ni año usa el mes en curso (Bogotá). " +
        "Si `seccionesIncompletas` trae algo, esa parte no se pudo consultar: dilo.",
      inputSchema: {
        mes: z.number().int().min(1).max(12).optional().describe("1 a 12. Va junto con anio."),
        anio: z.number().int().min(2000).max(2100).optional(),
        detalle: z
          .boolean()
          .optional()
          .describe("true agrega el listado de cada inspección y cada actividad del mes."),
      },
      annotations: SOLO_LECTURA,
    },
    async ({ mes, anio, detalle = false }) => {
      if ((mes === undefined) !== (anio === undefined)) {
        throw new Error("mes y anio van juntos: indica los dos o ninguno.");
      }
      const { data } = await api.obtener(`/api/informes/mensual${consulta({ mes, anio })}`);

      const { filas: filasInspecciones, ...inspecciones } = data.inspecciones ?? {};
      const { filas: filasActividades, ...actividades } = data.actividades ?? {};

      return respuesta({
        periodo: data.periodo,
        estadisticasLegales: data.estadisticasLegales,
        accidentes: data.accidentes,
        medicinaLaboral: data.medicinaLaboral,
        inspecciones: detalle ? { ...inspecciones, filas: filasInspecciones } : inspecciones,
        actividades: detalle ? { ...actividades, filas: filasActividades } : actividades,
        seccionesIncompletas: data.seccionesIncompletas,
        generadoEn: data.generadoEn,
      });
    },
  );
}
