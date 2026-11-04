/**
 * Herramientas de Capacitaciones, Asistencia y Evaluaciones MCP
 */

import { z } from "zod";
import { HttpClient } from "../utils/http-client.js";
import { ToolContext } from "../types.js";
import { validarFecha } from "../utils/validation.js";
import { formatearFechaColombia, formatearDuracion } from "../utils/formatters.js";

// ========================================================================
// CAPACITACIONES
// ========================================================================

export const listarCapacitacionesTool = {
  name: "sgsst_listar_capacitaciones",
  description: `Lista el catálogo de capacitaciones disponibles en el sistema.

Parámetros opcionales:
- categoria: Filtrar por categoría
- estado: Filtrar por estado

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      categoria: { type: "string" },
      estado: { type: "string" },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString(args as Record<string, unknown>);
      const response = await client.get(`/api/capacitaciones${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const caps = response.data as any[];
      const lista = caps.map((c, i) =>
        `${i + 1}. ${c.nombre}\n   📝 ${c.descripcion || "Sin descripción"}\n   ⏱️ Duración: ${formatearDuracion(c.duracion || 0)}\n   📂 Categoría: ${c.categoria || "N/A"}`
      ).join("\n\n");

      return { content: [{ type: "text", text: `✅ Capacitaciones (${caps.length}):\n\n${lista}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

// ========================================================================
// EVENTOS Y ASISTENCIA
// ========================================================================

export const listarEventosCapacitacionTool = {
  name: "sgsst_listar_eventos_capacitacion",
  description: `Lista los eventos de capacitación programados o ejecutados.

Parámetros opcionales:
- desde: Fecha desde (YYYY-MM-DD)
- hasta: Fecha hasta (YYYY-MM-DD)
- capacitacionId: ID de capacitación específica
- estado: Estado del evento

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      desde: { type: "string", description: "Fecha desde (YYYY-MM-DD)" },
      hasta: { type: "string", description: "Fecha hasta (YYYY-MM-DD)" },
      capacitacionId: { type: "string" },
      estado: { type: "string" },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString(args as Record<string, unknown>);
      const response = await client.get(`/api/programacion-capacitaciones${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const eventos = response.data as any[];
      if (eventos.length === 0) {
        return { content: [{ type: "text", text: "ℹ️ No se encontraron eventos" }] };
      }

      const lista = eventos.map((e, i) =>
        `${i + 1}. ${e.capacitacion?.nombre || "Capacitación"}\n   📅 Fecha: ${formatearFechaColombia(e.fecha)}\n   🕐 Hora: ${e.horaInicio || "N/A"}\n   👥 Asistentes: ${e.asistentes || 0}\n   📍 Lugar: ${e.lugar || "N/A"}`
      ).join("\n\n");

      return { content: [{ type: "text", text: `✅ Eventos (${eventos.length}):\n\n${lista}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

export const registrarAsistenciaTool = {
  name: "sgsst_registrar_asistencia",
  description: `Registra la asistencia de empleados a un evento de capacitación.

Parámetros:
- eventoId: (requerido) ID del evento
- asistentes: (requerido) Array de IDs de empleados o documentos
- observaciones: (opcional) Observaciones

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      eventoId: { type: "string", description: "ID del evento" },
      asistentes: {
        type: "array",
        items: { type: "string" },
        description: "Array de IDs de empleados",
      },
      observaciones: { type: "string" },
    },
    required: ["eventoId", "asistentes"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const response = await client.post("/api/registros-asistencia", args);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      return { content: [{ type: "text", text: "✅ Asistencia registrada exitosamente" }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

// ========================================================================
// EVALUACIONES
// ========================================================================

export const listarEvaluacionesTool = {
  name: "sgsst_listar_evaluaciones",
  description: `Lista las evaluaciones aplicadas.

Parámetros opcionales:
- eventoId: Filtrar por evento específico
- empleadoId: Filtrar por empleado
- estado: Estado de la evaluación

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      eventoId: { type: "string" },
      empleadoId: { type: "string" },
      estado: { type: "string" },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString(args as Record<string, unknown>);
      const response = await client.get(`/api/evaluaciones${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const evals = response.data as any[];
      if (evals.length === 0) {
        return { content: [{ type: "text", text: "ℹ️ No se encontraron evaluaciones" }] };
      }

      const lista = evals.map((e, i) =>
        `${i + 1}. Evaluación ID: ${e.id}\n   📅 Fecha: ${formatearFechaColombia(e.fechaAplicacion)}\n   📊 Calificación: ${e.calificacion || "Pendiente"}\n   ${e.aprobada ? "✅ Aprobada" : "❌ No aprobada"}`
      ).join("\n\n");

      return { content: [{ type: "text", text: `✅ Evaluaciones (${evals.length}):\n\n${lista}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

export const responderEvaluacionTool = {
  name: "sgsst_responder_evaluacion",
  description: `Responde una evaluación pendiente.

Parámetros:
- evaluacionId: (requerido) ID de la evaluación
- respuestas: (requerido) Array de respuestas {preguntaId, respuestaSeleccionada}

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      evaluacionId: { type: "string" },
      respuestas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            preguntaId: { type: "string" },
            respuestaSeleccionada: { type: "string" },
          },
        },
      },
    },
    required: ["evaluacionId", "respuestas"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const response = await client.post("/api/evaluaciones/responder", args);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const result = response.data as any;
      return {
        content: [{
          type: "text",
          text: `✅ Evaluación respondida\n\n📊 Calificación: ${result.calificacion}\n${result.aprobada ? "✅ Aprobada" : "❌ No aprobada"}`,
        }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

export const capacitacionesTools = [
  listarCapacitacionesTool,
  listarEventosCapacitacionTool,
  registrarAsistenciaTool,
  listarEvaluacionesTool,
  responderEvaluacionTool,
];
