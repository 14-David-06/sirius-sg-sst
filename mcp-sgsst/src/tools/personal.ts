/**
 * Herramientas de Personal MCP
 */

import { z } from "zod";
import { HttpClient } from "../utils/http-client.js";
import { ToolContext, Empleado } from "../types.js";
import {
  validarNumeroDocumento,
  validarParametrosRequeridos,
  validarEmpleadoNominaCore,
} from "../utils/validation.js";
import { formatearNumeroDocumento } from "../utils/formatters.js";

// ============================================================================
// Schemas de Validación
// ============================================================================

const ListarPersonalSchema = z.object({
  cargo: z.string().optional(),
  area: z.string().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
  limit: z.number().min(1).max(100).optional(),
});

const BuscarPersonalSchema = z.object({
  numeroDocumento: z.string().min(1, "El número de documento es requerido"),
});

const ValidarPersonalNominaSchema = z.object({
  numeroDocumento: z.string().min(1, "El número de documento es requerido"),
});

// ============================================================================
// Herramientas
// ============================================================================

/**
 * sgsst_listar_personal
 * Lista el personal registrado en el sistema
 */
export const listarPersonalTool = {
  name: "sgsst_listar_personal",
  description: `Lista el personal registrado en el sistema SGSST.

Permite filtrar por cargo, área y estado.

Parámetros opcionales:
- cargo: Filtrar por cargo específico
- area: Filtrar por área
- estado: Filtrar por estado (ACTIVO o INACTIVO)
- limit: Número máximo de resultados (1-100, por defecto 50)

Ejemplo de uso:
{
  "cargo": "Operario",
  "estado": "ACTIVO",
  "limit": 20
}

Requiere autenticación previa.`,
  inputSchema: {
    type: "object",
    properties: {
      cargo: {
        type: "string",
        description: "Filtrar por cargo",
      },
      area: {
        type: "string",
        description: "Filtrar por área",
      },
      estado: {
        type: "string",
        enum: ["ACTIVO", "INACTIVO"],
        description: "Filtrar por estado",
      },
      limit: {
        type: "number",
        description: "Número máximo de resultados (1-100)",
        minimum: 1,
        maximum: 100,
      },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return {
          content: [{
            type: "text",
            text: "❌ Debe autenticarse primero. Use sgsst_iniciar_sesion.",
          }],
          isError: true,
        };
      }

      const params = ListarPersonalSchema.parse(args);

      const client = new HttpClient(context.config, context.session);
      const queryString = client.buildQueryString(params);
      const response = await client.get<Empleado[]>(`/api/personal${queryString}`);

      if (!response.success || !response.data) {
        return {
          content: [{
            type: "text",
            text: `❌ Error: ${response.error || "No se pudo obtener el personal"}`,
          }],
        };
      }

      const personal = response.data;

      if (personal.length === 0) {
        return {
          content: [{
            type: "text",
            text: "ℹ️ No se encontró personal con los filtros especificados",
          }],
        };
      }

      const lista = personal.map((p, index) =>
        `${index + 1}. ${p.nombre}
   📄 Documento: ${formatearNumeroDocumento(p.numeroDocumento)}
   💼 Cargo: ${p.cargo}
   📧 Email: ${p.email || "N/A"}
   🏢 Área: ${p.area || "N/A"}
   🔐 Nivel: ${p.nivel || "N/A"}`
      ).join("\n\n");

      return {
        content: [{
          type: "text",
          text: `✅ Personal encontrado (${personal.length} registros):\n\n${lista}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error al listar personal: ${error instanceof Error ? error.message : "Error desconocido"}`,
        }],
        isError: true,
      };
    }
  },
};

/**
 * sgsst_buscar_personal
 * Busca un empleado por número de documento
 */
export const buscarPersonalTool = {
  name: "sgsst_buscar_personal",
  description: `Busca un empleado específico por su número de documento.

Parámetros:
- numeroDocumento: (requerido) Número de documento del empleado

Ejemplo de uso:
{
  "numeroDocumento": "1234567890"
}

Requiere autenticación previa.`,
  inputSchema: {
    type: "object",
    properties: {
      numeroDocumento: {
        type: "string",
        description: "Número de documento del empleado",
      },
    },
    required: ["numeroDocumento"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      if (!context.session?.isAuthenticated) {
        return {
          content: [{
            type: "text",
            text: "❌ Debe autenticarse primero. Use sgsst_iniciar_sesion.",
          }],
          isError: true,
        };
      }

      const params = BuscarPersonalSchema.parse(args);

      if (!validarNumeroDocumento(params.numeroDocumento)) {
        throw new Error("Formato de número de documento inválido");
      }

      const client = new HttpClient(context.config, context.session);
      const response = await client.get<Empleado>(
        `/api/personal/validar?numeroDocumento=${params.numeroDocumento}`
      );

      if (!response.success || !response.data) {
        return {
          content: [{
            type: "text",
            text: `❌ Empleado no encontrado con documento ${formatearNumeroDocumento(params.numeroDocumento)}`,
          }],
        };
      }

      const empleado = response.data;

      return {
        content: [{
          type: "text",
          text: `✅ Empleado encontrado:

👤 Nombre: ${empleado.nombre}
📄 Documento: ${formatearNumeroDocumento(empleado.numeroDocumento)}
💼 Cargo: ${empleado.cargo}
📧 Email: ${empleado.email || "N/A"}
📞 Teléfono: ${empleado.telefono || "N/A"}
🏢 Área: ${empleado.area || "N/A"}
🔐 Nivel: ${empleado.nivel || "N/A"}
📊 Estado: ${empleado.estado || "N/A"}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error al buscar empleado: ${error instanceof Error ? error.message : "Error desconocido"}`,
        }],
        isError: true,
      };
    }
  },
};

/**
 * sgsst_validar_personal_nomina
 * Valida un empleado contra Nómina Core
 */
export const validarPersonalNominaTool = {
  name: "sgsst_validar_personal_nomina",
  description: `Valida si un empleado existe en Nómina Core (sistema externo).

Esta validación conecta con el sistema de Nómina Core para verificar que el empleado esté registrado en nómina.

Parámetros:
- numeroDocumento: (requerido) Número de documento del empleado

Ejemplo de uso:
{
  "numeroDocumento": "1234567890"
}

Requiere que esté configurado NOMINA_CORE_API_URL y NOMINA_CORE_API_KEY.`,
  inputSchema: {
    type: "object",
    properties: {
      numeroDocumento: {
        type: "string",
        description: "Número de documento del empleado a validar",
      },
    },
    required: ["numeroDocumento"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      const params = ValidarPersonalNominaSchema.parse(args);

      if (!validarNumeroDocumento(params.numeroDocumento)) {
        throw new Error("Formato de número de documento inválido");
      }

      if (!context.config.nominaCoreUrl || !context.config.nominaCoreApiKey) {
        return {
          content: [{
            type: "text",
            text: "⚠️ Validación con Nómina Core no configurada. Configure NOMINA_CORE_API_URL y NOMINA_CORE_API_KEY.",
          }],
        };
      }

      const validacion = await validarEmpleadoNominaCore(
        params.numeroDocumento,
        context.config.nominaCoreUrl,
        context.config.nominaCoreApiKey
      );

      if (!validacion.esValido) {
        return {
          content: [{
            type: "text",
            text: `❌ Validación fallida: ${validacion.mensaje || "Empleado no encontrado en Nómina Core"}`,
          }],
        };
      }

      const empleado = validacion.empleado!;

      return {
        content: [{
          type: "text",
          text: `✅ Empleado válido en Nómina Core:

👤 Nombre: ${empleado.nombre}
📄 Documento: ${formatearNumeroDocumento(empleado.numeroDocumento)}
💼 Cargo: ${empleado.cargo}
📧 Email: ${empleado.email || "N/A"}
🏢 Área: ${empleado.area || "N/A"}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error al validar con Nómina Core: ${error instanceof Error ? error.message : "Error desconocido"}`,
        }],
        isError: true,
      };
    }
  },
};

// ============================================================================
// Exportar todas las herramientas de personal
// ============================================================================

export const personalTools = [
  listarPersonalTool,
  buscarPersonalTool,
  validarPersonalNominaTool,
];
