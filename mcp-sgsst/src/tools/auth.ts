/**
 * Herramientas de Autenticación MCP
 *
 * La API de login identifica al usuario por número de documento, no por email.
 */

import { z } from "zod";
import { HttpClient } from "../utils/http-client.js";
import { ToolContext, AuthResponse } from "../types.js";
import { validarNumeroDocumento } from "../utils/validation.js";

// ============================================================================
// Schemas de Validación
// ============================================================================

const VerificarUsuarioSchema = z.object({
  numeroDocumento: z.string().min(1, "El número de documento es requerido"),
});

const CredencialesSchema = z.object({
  numeroDocumento: z.string().min(1, "El número de documento es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

const CrearPasswordSchema = z.object({
  numeroDocumento: z.string().min(1, "El número de documento es requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

interface VerifyResponse {
  success: boolean;
  message?: string;
  needsPassword?: boolean;
  nombreCompleto?: string;
}

function textoError(prefijo: string, error: unknown) {
  return {
    content: [{
      type: "text",
      text: `❌ ${prefijo}: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }],
    isError: true,
  };
}

// ============================================================================
// Herramientas
// ============================================================================

/**
 * sgsst_verificar_usuario
 * Verifica si un usuario existe en el sistema (paso 1 de autenticación)
 */
export const verificarUsuarioTool = {
  name: "sgsst_verificar_usuario",
  description: `Verifica si un usuario existe y está activo en el sistema SGSST. Es el primer paso del login de 3 pasos.

Indica si el usuario ya tiene contraseña (puede iniciar sesión) o si debe crearla primero.

Parámetros:
- numeroDocumento: (requerido) Número de documento del usuario

Ejemplo:
{
  "numeroDocumento": "1234567890"
}`,
  inputSchema: {
    type: "object",
    properties: {
      numeroDocumento: {
        type: "string",
        description: "Número de documento del usuario a verificar",
      },
    },
    required: ["numeroDocumento"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      const params = VerificarUsuarioSchema.parse(args);

      if (!validarNumeroDocumento(params.numeroDocumento)) {
        throw new Error("Formato de número de documento inválido");
      }

      const client = new HttpClient(context.config, context.session);
      const response = (await client.post("/api/auth/verify", params)) as VerifyResponse & { error?: string };

      if (!response.success) {
        return {
          content: [{
            type: "text",
            text: `❌ ${response.error || response.message || "No se pudo verificar el usuario"}`,
          }],
        };
      }

      const statusMsg = response.needsPassword
        ? "⚠️ Usuario encontrado pero NO tiene contraseña - debe crearla con sgsst_crear_password."
        : "✅ Usuario encontrado. Tiene contraseña configurada - puede iniciar sesión.";

      return {
        content: [{
          type: "text",
          text: `${statusMsg}\n\n👤 Usuario: ${response.nombreCompleto || "N/A"}`,
        }],
      };
    } catch (error) {
      return textoError("Error al verificar usuario", error);
    }
  },
};

/**
 * sgsst_crear_password
 * Crea una contraseña para un usuario que no la tiene (paso 2 alternativo)
 */
export const crearPasswordTool = {
  name: "sgsst_crear_password",
  description: `Crea la contraseña de un usuario que aún no tiene una configurada.

Parámetros:
- numeroDocumento: (requerido) Número de documento del usuario
- password: (requerido) Contraseña a crear (mínimo 8 caracteres)

Ejemplo:
{
  "numeroDocumento": "1234567890",
  "password": "MiPassword123!"
}`,
  inputSchema: {
    type: "object",
    properties: {
      numeroDocumento: {
        type: "string",
        description: "Número de documento del usuario",
      },
      password: {
        type: "string",
        description: "Contraseña a crear (mínimo 8 caracteres)",
      },
    },
    required: ["numeroDocumento", "password"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      const params = CrearPasswordSchema.parse(args);

      const client = new HttpClient(context.config, context.session);
      const response = await client.post("/api/auth/register", params);

      if (!response.success) {
        return {
          content: [{
            type: "text",
            text: `❌ ${response.error || response.message || "No se pudo crear la contraseña"}`,
          }],
        };
      }

      return {
        content: [{
          type: "text",
          text: "✅ Contraseña creada exitosamente. Ahora puede iniciar sesión con sgsst_iniciar_sesion.",
        }],
      };
    } catch (error) {
      return textoError("Error al crear contraseña", error);
    }
  },
};

/**
 * sgsst_iniciar_sesion
 * Inicia sesión en el sistema (paso 3 de autenticación)
 */
export const iniciarSesionTool = {
  name: "sgsst_iniciar_sesion",
  description: `Inicia sesión en el sistema SGSST con número de documento y contraseña.

El token de sesión queda guardado y las demás herramientas del MCP lo usan automáticamente.

Parámetros:
- numeroDocumento: (requerido) Número de documento del usuario
- password: (requerido) Contraseña del usuario

Ejemplo:
{
  "numeroDocumento": "1234567890",
  "password": "MiPassword123!"
}`,
  inputSchema: {
    type: "object",
    properties: {
      numeroDocumento: {
        type: "string",
        description: "Número de documento del usuario",
      },
      password: {
        type: "string",
        description: "Contraseña del usuario",
      },
    },
    required: ["numeroDocumento", "password"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      const params = CredencialesSchema.parse(args);

      const client = new HttpClient(context.config, context.session);
      const response = (await client.post("/api/auth/login", params)) as AuthResponse & { error?: string };

      if (!response.success || !response.token || !response.user) {
        return {
          content: [{
            type: "text",
            text: `❌ ${response.error || response.message || "Credenciales inválidas"}`,
          }],
        };
      }

      const user = response.user;

      if (context.session) {
        context.session.isAuthenticated = true;
        context.session.token = response.token;
        context.session.user = user;
      }

      return {
        content: [{
          type: "text",
          text: `✅ Sesión iniciada exitosamente

👤 Usuario: ${user.nombreCompleto}
💼 Rol: ${user.rol || "N/A"}
📧 Email: ${user.correoElectronico || "N/A"}
🔐 Nivel de acceso: ${user.nivelAcceso || "N/A"}

El token de sesión se usará automáticamente en las demás operaciones.`,
        }],
      };
    } catch (error) {
      return textoError("Error al iniciar sesión", error);
    }
  },
};

/**
 * sgsst_obtener_sesion
 * Obtiene información de la sesión actual
 */
export const obtenerSesionTool = {
  name: "sgsst_obtener_sesion",
  description: `Obtiene información sobre la sesión actual del usuario.

No requiere parámetros.`,
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async (_args: unknown, context: ToolContext) => {
    if (!context.session?.isAuthenticated || !context.session?.user) {
      return {
        content: [{
          type: "text",
          text: "⚠️ No hay sesión activa. Use sgsst_iniciar_sesion para autenticarse.",
        }],
      };
    }

    const user = context.session.user;

    return {
      content: [{
        type: "text",
        text: `✅ Sesión activa

👤 Usuario: ${user.nombreCompleto}
🆔 ID empleado: ${user.idEmpleado}
💼 Rol: ${user.rol || "N/A"}
📧 Email: ${user.correoElectronico || "N/A"}
🔐 Nivel de acceso: ${user.nivelAcceso || "N/A"}`,
      }],
    };
  },
};

/**
 * sgsst_cerrar_sesion
 * Cierra la sesión actual
 */
export const cerrarSesionTool = {
  name: "sgsst_cerrar_sesion",
  description: `Cierra la sesión actual. Las operaciones siguientes exigirán autenticarse de nuevo.

No requiere parámetros.`,
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async (_args: unknown, context: ToolContext) => {
    if (context.session) {
      context.session.isAuthenticated = false;
      context.session.token = undefined;
      context.session.user = undefined;
    }

    return {
      content: [{
        type: "text",
        text: "✅ Sesión cerrada exitosamente. Debe autenticarse nuevamente para continuar.",
      }],
    };
  },
};

// ============================================================================
// Exportar todas las herramientas de autenticación
// ============================================================================

export const authTools = [
  verificarUsuarioTool,
  crearPasswordTool,
  iniciarSesionTool,
  obtenerSesionTool,
  cerrarSesionTool,
];
