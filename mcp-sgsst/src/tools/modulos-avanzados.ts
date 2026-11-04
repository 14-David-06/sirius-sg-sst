/**
 * Herramientas de Medicina Laboral, Accidentes, Comités, Políticas e Informes MCP
 */

import { HttpClient } from "../utils/http-client.js";
import { ToolContext } from "../types.js";
import { formatearFechaColombia, formatearGravedad, formatearEstado, formatearPeriodo } from "../utils/formatters.js";

// ===============================================================================
// MEDICINA LABORAL
// ===============================================================================

export const listarExamenesOcupacionalesTool = {
  name: "sgsst_listar_examenes_ocupacionales",
  description: `Lista los exámenes ocupacionales realizados.

Parámetros opcionales:
- tipo: INGRESO, PERIODICO, EGRESO o REINTEGRO
- desde: Fecha desde (YYYY-MM-DD)
- hasta: Fecha hasta (YYYY-MM-DD)
- empleadoId: Filtrar por empleado

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      tipo: { type: "string", enum: ["INGRESO", "PERIODICO", "EGRESO", "REINTEGRO"] },
      desde: { type: "string" },
      hasta: { type: "string" },
      empleadoId: { type: "string" },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString(args as Record<string, unknown>);
      const response = await client.get(`/api/medicina-laboral/examenes${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const examenes = response.data as any[];
      if (examenes.length === 0) {
        return { content: [{ type: "text", text: "ℹ️ No se encontraron exámenes" }] };
      }

      const lista = examenes.map((e, i) =>
        `${i + 1}. Examen ${e.tipo}\n   📅 Fecha: ${formatearFechaColombia(e.fecha)}\n   👤 Empleado: ${e.empleado?.nombre || e.empleadoId}\n   📋 Resultado: ${e.resultado || "Pendiente"}`
      ).join("\n\n");

      return { content: [{ type: "text", text: `✅ Exámenes ocupacionales (${examenes.length}):\n\n${lista}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

export const listarIncapacidadesTool = {
  name: "sgsst_listar_incapacidades",
  description: `Lista las incapacidades registradas.

Parámetros opcionales:
- tipo: ENFERMEDAD_COMUN, ACCIDENTE_TRABAJO o ENFERMEDAD_LABORAL
- desde: Fecha desde (YYYY-MM-DD)
- hasta: Fecha hasta (YYYY-MM-DD)
- empleadoId: Filtrar por empleado

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      tipo: { type: "string", enum: ["ENFERMEDAD_COMUN", "ACCIDENTE_TRABAJO", "ENFERMEDAD_LABORAL"] },
      desde: { type: "string" },
      hasta: { type: "string" },
      empleadoId: { type: "string" },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString(args as Record<string, unknown>);
      const response = await client.get(`/api/medicina-laboral/incapacidades${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const incapacidades = response.data as any[];
      if (incapacidades.length === 0) {
        return { content: [{ type: "text", text: "ℹ️ No se encontraron incapacidades" }] };
      }

      const lista = incapacidades.map((inc, i) =>
        `${i + 1}. ${inc.tipo}\n   👤 Empleado: ${inc.empleado?.nombre || inc.empleadoId}\n   📅 Inicio: ${formatearFechaColombia(inc.fechaInicio)}\n   📅 Fin: ${formatearFechaColombia(inc.fechaFin)}\n   ⏱️ Días: ${inc.dias}`
      ).join("\n\n");

      return { content: [{ type: "text", text: `✅ Incapacidades (${incapacidades.length}):\n\n${lista}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

// ===============================================================================
// ACCIDENTES E INCIDENTES
// ===============================================================================

export const listarAccidentesIncidentesTool = {
  name: "sgsst_listar_accidentes_incidentes",
  description: `Lista los accidentes e incidentes registrados.

Parámetros opcionales:
- tipo: ACCIDENTE o INCIDENTE
- desde: Fecha desde (YYYY-MM-DD)
- hasta: Fecha hasta (YYYY-MM-DD)
- gravedad: LEVE, GRAVE o MORTAL (solo para accidentes)

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      tipo: { type: "string", enum: ["ACCIDENTE", "INCIDENTE"] },
      desde: { type: "string" },
      hasta: { type: "string" },
      gravedad: { type: "string", enum: ["LEVE", "GRAVE", "MORTAL"] },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString(args as Record<string, unknown>);
      const response = await client.get(`/api/accidentes/eventos${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const eventos = response.data as any[];
      if (eventos.length === 0) {
        return { content: [{ type: "text", text: "ℹ️ No se encontraron eventos" }] };
      }

      const lista = eventos.map((ev, i) => {
        const gravedadStr = ev.gravedad ? `\n   ${formatearGravedad(ev.gravedad)}` : "";
        return `${i + 1}. ${ev.tipo} - ${ev.consecutivo || ev.id}\n   👤 Empleado: ${ev.empleado?.nombre || ev.empleadoId}\n   📅 Fecha: ${formatearFechaColombia(ev.fecha)}${gravedadStr}\n   📝 ${ev.descripcion?.substring(0, 50)}...`;
      }).join("\n\n");

      return { content: [{ type: "text", text: `✅ Eventos (${eventos.length}):\n\n${lista}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

export const registrarAccidenteTool = {
  name: "sgsst_registrar_accidente",
  description: `Registra un nuevo accidente o incidente.

Parámetros:
- tipo: (requerido) ACCIDENTE o INCIDENTE
- empleadoId: (requerido) ID o documento del empleado
- fecha: (requerido) Fecha del evento (YYYY-MM-DD)
- descripcion: (requerido) Descripción del evento
- lugar: (opcional) Lugar donde ocurrió
- gravedad: (opcional) LEVE, GRAVE o MORTAL (solo para accidentes)

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      tipo: { type: "string", enum: ["ACCIDENTE", "INCIDENTE"] },
      empleadoId: { type: "string" },
      fecha: { type: "string" },
      descripcion: { type: "string" },
      lugar: { type: "string" },
      gravedad: { type: "string", enum: ["LEVE", "GRAVE", "MORTAL"] },
    },
    required: ["tipo", "empleadoId", "fecha", "descripcion"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const response = await client.post("/api/accidentes/eventos", args);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const evento = response.data as any;
      return {
        content: [{
          type: "text",
          text: `✅ ${evento.tipo} registrado exitosamente\n\n🔢 Consecutivo: ${evento.consecutivo}\n📅 Fecha: ${formatearFechaColombia(evento.fecha)}`,
        }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

// ===============================================================================
// COMITÉS
// ===============================================================================

export const listarActasComiteTool = {
  name: "sgsst_listar_actas_comite",
  description: `Lista las actas de comité (COPASST o COCOLAB).

Parámetros:
- comite: (requerido) COPASST o COCOLAB
- desde: (opcional) Fecha desde (YYYY-MM-DD)
- hasta: (opcional) Fecha hasta (YYYY-MM-DD)

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      comite: { type: "string", enum: ["COPASST", "COCOLAB"] },
      desde: { type: "string" },
      hasta: { type: "string" },
    },
    required: ["comite"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const params = args as { comite: string; desde?: string; hasta?: string };
      const endpoint = params.comite === "COPASST" ? "/api/copasst/actas" : "/api/cocolab/actas";

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString({ desde: params.desde, hasta: params.hasta });
      const response = await client.get(`${endpoint}${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const actas = response.data as any[];
      if (actas.length === 0) {
        return { content: [{ type: "text", text: `ℹ️ No hay actas de ${params.comite}` }] };
      }

      const lista = actas.map((acta, i) =>
        `${i + 1}. Acta ${acta.numero}\n   📅 Fecha: ${formatearFechaColombia(acta.fecha)}\n   📝 Tema: ${acta.tema || "N/A"}\n   ${acta.firmada ? "✍️ Firmada" : "📝 Pendiente firma"}`
      ).join("\n\n");

      return { content: [{ type: "text", text: `✅ Actas ${params.comite} (${actas.length}):\n\n${lista}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

// ===============================================================================
// POLÍTICAS
// ===============================================================================

export const listarPoliticasTool = {
  name: "sgsst_listar_politicas",
  description: `Lista las políticas empresariales disponibles.

Parámetros opcionales:
- vigente: true para mostrar solo políticas vigentes

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      vigente: { type: "boolean" },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString(args as Record<string, unknown>);
      const response = await client.get(`/api/politicas${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const politicas = response.data as any[];
      if (politicas.length === 0) {
        return { content: [{ type: "text", text: "ℹ️ No hay políticas registradas" }] };
      }

      const lista = politicas.map((pol, i) =>
        `${i + 1}. ${pol.nombre}\n   📄 Versión: ${pol.version || "N/A"}\n   📅 Publicación: ${pol.fechaPublicacion ? formatearFechaColombia(pol.fechaPublicacion) : "N/A"}\n   ${pol.vigente ? "🟢 Vigente" : "⚪ No vigente"}`
      ).join("\n\n");

      return { content: [{ type: "text", text: `✅ Políticas (${politicas.length}):\n\n${lista}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

// ===============================================================================
// INFORMES
// ===============================================================================

export const obtenerInformeMensualTool = {
  name: "sgsst_obtener_informe_mensual",
  description: `Obtiene el informe mensual de gestión SST.

Parámetros opcionales:
- mes: Mes (1-12, por defecto mes actual)
- anio: Año (por defecto año actual)

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      mes: { type: "number", minimum: 1, maximum: 12 },
      anio: { type: "number", minimum: 2020 },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString(args as Record<string, unknown>);
      const response = await client.get(`/api/informes/mensual${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const informe = response.data as any;
      const periodo = formatearPeriodo(informe.mes, informe.anio);

      const indicadoresTexto = informe.indicadores.map((ind: any) =>
        `  • ${ind.nombre}: ${ind.valor} ${ind.unidad || ""}`
      ).join("\n");

      return {
        content: [{
          type: "text",
          text: `✅ Informe Mensual de Gestión SST - ${periodo}

📊 INDICADORES PRINCIPALES:
${indicadoresTexto}

🔍 INSPECCIONES:
  • EPP: ${informe.inspecciones.epp}
  • Áreas: ${informe.inspecciones.areas}
  • Equipos: ${informe.inspecciones.equipos}
  • Emergencia: ${informe.inspecciones.emergencia}

📚 ACTIVIDADES:
  • Capacitaciones: ${informe.actividades.capacitaciones}
  • Inducciones: ${informe.actividades.inducciones}
  • Reuniones comité: ${informe.actividades.reunionesComite}

🏥 MEDICINA LABORAL:
  • Exámenes: ${informe.medicina.examenes}
  • Seguimientos: ${informe.medicina.seguimientos}
  • Incapacidades: ${informe.medicina.incapacidades}

⚠️ ACCIDENTALIDAD:
  • Accidentes: ${informe.accidentalidad.accidentes}
  • Incidentes: ${informe.accidentalidad.incidentes}
  • Días perdidos: ${informe.accidentalidad.diasPerdidos}`,
        }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

export const modulosAvanzadosTools = [
  listarExamenesOcupacionalesTool,
  listarIncapacidadesTool,
  listarAccidentesIncidentesTool,
  registrarAccidenteTool,
  listarActasComiteTool,
  listarPoliticasTool,
  obtenerInformeMensualTool,
];
