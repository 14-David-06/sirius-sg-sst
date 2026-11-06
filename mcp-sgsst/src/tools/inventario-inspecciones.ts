/**
 * Herramientas de Inventario EPP e Inspecciones MCP
 */

import { HttpClient } from "../utils/http-client.js";
import { ToolContext } from "../types.js";
import { formatearFechaColombia, formatearEstado, formatearTipoInspeccion } from "../utils/formatters.js";

// ===============================================================================
// INVENTARIO EPP
// ===============================================================================

export const listarInventarioEPPTool = {
  name: "sgsst_listar_inventario_epp",
  description: `Lista el inventario de Elementos de Protección Personal (EPP).

Parámetros opcionales:
- categoria: Filtrar por categoría
- stockBajo: true para mostrar solo items con stock bajo

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      categoria: { type: "string" },
      stockBajo: { type: "boolean" },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString(args as Record<string, unknown>);
      const response = await client.get(`/api/insumos/epp${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const items = response.data as any[];
      if (items.length === 0) {
        return { content: [{ type: "text", text: "ℹ️ No hay items en inventario" }] };
      }

      const lista = items.map((item, i) => {
        const alerta = item.stockActual <= item.stockMinimo ? " ⚠️ STOCK BAJO" : "";
        return `${i + 1}. ${item.nombre}${alerta}\n   📦 Stock: ${item.stockActual} ${item.unidadMedida}\n   📊 Mínimo: ${item.stockMinimo}\n   📂 Categoría: ${item.categoria}`;
      }).join("\n\n");

      return { content: [{ type: "text", text: `✅ Inventario EPP (${items.length}):\n\n${lista}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

export const registrarMovimientoEPPTool = {
  name: "sgsst_registrar_movimiento_epp",
  description: `Registra un movimiento de inventario EPP (INGRESO, SALIDA o AJUSTE).

Parámetros:
- insumoId: (requerido) ID del insumo
- tipo: (requerido) INGRESO, SALIDA o AJUSTE
- cantidad: (requerido) Cantidad del movimiento
- motivo: (opcional) Motivo del movimiento

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      insumoId: { type: "string" },
      tipo: { type: "string", enum: ["INGRESO", "SALIDA", "AJUSTE"] },
      cantidad: { type: "number" },
      motivo: { type: "string" },
    },
    required: ["insumoId", "tipo", "cantidad"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const response = await client.post("/api/insumos/movimientos", args);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      return { content: [{ type: "text", text: "✅ Movimiento registrado exitosamente" }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

export const registrarEntregaEPPTool = {
  name: "sgsst_registrar_entrega_epp",
  description: `Registra una entrega de EPP a un empleado.

Parámetros:
- empleadoId: (requerido) ID o documento del empleado
- tipo: (requerido) EPP o DOTACION
- insumos: (requerido) Array de {insumoId, cantidad}
- fecha: (opcional) Fecha de entrega (YYYY-MM-DD)

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      empleadoId: { type: "string" },
      tipo: { type: "string", enum: ["EPP", "DOTACION"] },
      insumos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            insumoId: { type: "string" },
            cantidad: { type: "number" },
          },
        },
      },
      fecha: { type: "string" },
    },
    required: ["empleadoId", "tipo", "insumos"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const response = await client.post("/api/entregas-epp", args);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      return { content: [{ type: "text", text: "✅ Entrega registrada exitosamente" }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

// ===============================================================================
// INSPECCIONES
// ===============================================================================

export const listarInspeccionesTool = {
  name: "sgsst_listar_inspecciones",
  description: `Lista las inspecciones realizadas.

Parámetros:
- tipo: (requerido) EPP, AREAS, EQUIPOS, BOTIQUIN, EXTINTOR, CAMILLA o KIT_DERRAMES
- desde: (opcional) Fecha desde (YYYY-MM-DD)
- hasta: (opcional) Fecha hasta (YYYY-MM-DD)
- estado: (opcional) Estado de la inspección

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: ["EPP", "AREAS", "EQUIPOS", "BOTIQUIN", "EXTINTOR", "CAMILLA", "KIT_DERRAMES"],
      },
      desde: { type: "string" },
      hasta: { type: "string" },
      estado: { type: "string" },
    },
    required: ["tipo"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const params = args as { tipo: string; desde?: string; hasta?: string; estado?: string };
      const endpoints: Record<string, string> = {
        EPP: "/api/inspecciones-epp",
        AREAS: "/api/inspecciones-areas",
        EQUIPOS: "/api/inspecciones-equipos",
        BOTIQUIN: "/api/inspecciones-botiquin",
        EXTINTOR: "/api/inspecciones-extintor",
        CAMILLA: "/api/inspecciones-camilla",
        KIT_DERRAMES: "/api/inspecciones-kit-derrames",
      };

      const endpoint = endpoints[params.tipo];
      if (!endpoint) {
        return { content: [{ type: "text", text: "❌ Tipo de inspección inválido" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const qs = client.buildQueryString({ desde: params.desde, hasta: params.hasta, estado: params.estado });
      const response = await client.get(`${endpoint}${qs}`);

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      const inspecciones = response.data as any[];
      if (inspecciones.length === 0) {
        return { content: [{ type: "text", text: `ℹ️ No hay inspecciones de tipo ${formatearTipoInspeccion(params.tipo)}` }] };
      }

      const lista = inspecciones.map((insp, i) =>
        `${i + 1}. Inspección ID: ${insp.id}\n   📅 Fecha: ${formatearFechaColombia(insp.fecha)}\n   👤 Responsable: ${insp.responsable || "N/A"}\n   📊 ${formatearEstado(insp.estado)}`
      ).join("\n\n");

      return { content: [{ type: "text", text: `✅ Inspecciones ${formatearTipoInspeccion(params.tipo)} (${inspecciones.length}):\n\n${lista}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

export const registrarInspeccionTool = {
  name: "sgsst_registrar_inspeccion",
  description: `Registra una nueva inspección.

Parámetros:
- tipo: (requerido) Tipo de inspección
- fecha: (requerido) Fecha de la inspección (YYYY-MM-DD)
- datos: (requerido) Datos específicos según el tipo de inspección
  - Para EPP: {empleadoId, criterios: [{nombre, cumple, observacion}]}
  - Para AREAS: {area, categoria, criterios: [{criterio, cumple, accionCorrectiva}]}
  - Para EQUIPOS/EMERGENCIA: {equipoId, elementos: [{elementoId, estado}], verificaciones: [{criterio, cumple}]}
- responsable: (opcional) Responsable de la inspección
- observaciones: (opcional) Observaciones generales

Requiere autenticación.`,
  inputSchema: {
    type: "object",
    properties: {
      tipo: {
        type: "string",
        enum: ["EPP", "AREAS", "EQUIPOS", "BOTIQUIN", "EXTINTOR", "CAMILLA", "KIT_DERRAMES"],
      },
      fecha: { type: "string" },
      datos: { type: "object" },
      responsable: { type: "string" },
      observaciones: { type: "string" },
    },
    required: ["tipo", "fecha", "datos"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return { content: [{ type: "text", text: "❌ Debe autenticarse primero" }], isError: true };
      }

      const params = args as { tipo: string; fecha: string; datos: Record<string, unknown>; responsable?: string; observaciones?: string };
      const endpoints: Record<string, string> = {
        EPP: "/api/inspecciones-epp",
        AREAS: "/api/inspecciones-areas",
        EQUIPOS: "/api/inspecciones-equipos",
        BOTIQUIN: "/api/inspecciones-botiquin",
        EXTINTOR: "/api/inspecciones-extintor",
        CAMILLA: "/api/inspecciones-camilla",
        KIT_DERRAMES: "/api/inspecciones-kit-derrames",
      };

      const endpoint = endpoints[params.tipo];
      if (!endpoint) {
        return { content: [{ type: "text", text: "❌ Tipo de inspección inválido" }], isError: true };
      }

      const client = new HttpClient(context.config, context.session);
      const response = await client.post(endpoint, {
        fecha: params.fecha,
        ...params.datos,
        responsable: params.responsable,
        observaciones: params.observaciones,
      });

      if (!response.success) {
        return { content: [{ type: "text", text: `❌ Error: ${response.error}` }] };
      }

      return { content: [{ type: "text", text: `✅ Inspección ${formatearTipoInspeccion(params.tipo)} registrada exitosamente` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `❌ Error: ${error}` }], isError: true };
    }
  },
};

export const inventarioInspeccionesTools = [
  listarInventarioEPPTool,
  registrarMovimientoEPPTool,
  registrarEntregaEPPTool,
  listarInspeccionesTool,
  registrarInspeccionTool,
];
