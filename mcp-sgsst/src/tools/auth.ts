/**
 * Herramientas de Autenticación MCP
 */

import { z } from "zod";
import { HttpClient } from "../utils/http-client.js";
import { ToolContext, AuthResponse, SessionInfo } from "../types.js";
import { validarEmail, validarNumeroDocumento } from "../utils/validation.js";

// ============================================================================
// Schemas de Validación
// ============================================================================

const VerificarUsuarioSchema = z.object({
  email: z.string().optional(),
  numeroDocumento: z.string().optional(),
}).refine(
  (data) => data.email || data.numeroDocumento,
  { message: "Debe proporcionar email o numeroDocumento" }
);

const IniciarSesionSchema = z.object({
  email: z.string().optional(),
  numeroDocumento: z.string().optional(),
  password: z.string().min(1, "La contraseña es requerida"),
}).refine(
  (data) => data.email || data.numeroDocumento,
  { message: "Debe proporcionar email o numeroDocumento" }
);

const CrearPasswordSchema = z.object({
  email: z.string().optional(),
  numeroDocumento: z.string().optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
}).refine(
  (data) => data.email || data.numeroDocumento,
  { message: "Debe proporcionar email o numeroDocumento" }
);

const ObtenerSesionSchema = z.object({});

// ============================================================================
// Herramientas
// ============================================================================

/**
 * sgsst_verificar_usuario
 * Verifica si un usuario existe en el sistema (paso 1 de autenticación)
 */
export const verificarUsuarioTool = {
  name: "sgsst_verificar_usuario",
  description: `Verifica si un usuario existe en el sistema SGSST. Este es el primer paso del proceso de autenticación de 3 pasos.

Devuelve información sobre si el usuario existe y si tiene contraseña configurada.

Parámetros:
- email: (opcional) Email del usuario
- numeroDocumento: (opcional) Número de documento del usuario

Debe proporcionar email O numeroDocumento (al menos uno).

Ejemplo de uso:
{
  "email": "empleado@empresa.com"
}

O:
{
  "numeroDocumento": "1234567890"
}`,
  inputSchema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "Email del usuario a verificar",
      },
      numeroDocumento: {
        type: "string",
        description: "Número de documento del usuario a verificar",
      },
    },
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      const params = VerificarUsuarioSchema.parse(args);

      // Validar formato si se proporciona
      if (params.email && !validarEmail(params.email)) {
        throw new Error("Formato de email inválido");
      }

      if (params.numeroDocumento && !validarNumeroDocumento(params.numeroDocumento)) {
        throw new Error("Formato de número de documento inválido");
      }

      const client = new HttpClient(context.config, context.session);
      const response = await client.post("/api/auth/verify", params);

      if (!response.success) {
        return {
          content: [{
            type: "text",
            text: `❌ Error: ${response.error || "No se pudo verificar el usuario"}`,
          }],
        };
      }

      const data = response.data as { exists: boolean; hasPassword: boolean; user?: { nombre: string; cargo: string } };

      if (!data.exists) {
        return {
          content: [{
            type: "text",
            text: "❌ Usuario no encontrado en el sistema",
          }],
        };
      }

      const statusMsg = data.hasPassword
        ? "✅ Usuario encontrado. Tiene contraseña configurada - puede iniciar sesión."
        : "⚠️ Usuario encontrado pero NO tiene contraseña - debe crear una primero.";

      return {
        content: [{
          type: "text",
          text: `${statusMsg}\n\n👤 Usuario: ${data.user?.nombre || "N/A"}\n💼 Cargo: ${data.user?.cargo || "N/A"}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error al verificar usuario: ${error instanceof Error ? error.message : "Error desconocido"}`,
        }],
        isError: true,
      };
    }
  },
};

/**
 * sgsst_crear_password
 * Crea una contraseña para un usuario que no la tiene (paso 2 alternativo)
 */
export const crearPasswordTool = {
  name: "sgsst_crear_password",
  description: `Crea una contraseña para un usuario que aún no tiene una configurada.
Este es un paso alternativo en el proceso de autenticación cuando el usuario no tiene contraseña.

Parámetros:
- email: (opcional) Email del usuario
- numeroDocumento: (opcional) Número de documento del usuario
- password: (requerido) Contraseña a crear (mínimo 8 caracteres)

Debe proporcionar email O numeroDocumento.

Ejemplo de uso:
{
  "numeroDocumento": "1234567890",
  "password": "MiPassword123!"
}`,
  inputSchema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "Email del usuario",
      },
      numeroDocumento: {
        type: "string",
        description: "Número de documento del usuario",
      },
      password: {
        type: "string",
        description: "Contraseña a crear (mínimo 8 caracteres)",
      },
    },
    required: ["password"],
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
            text: `❌ Error: ${response.error || "No se pudo crear la contraseña"}`,
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
      return {
        content: [{
          type: "text",
          text: `❌ Error al crear contraseña: ${error instanceof Error ? error.message : "Error desconocido"}`,
        }],
        isError: true,
      };
    }
  },
};

/**
 * sgsst_iniciar_sesion
 * Inicia sesión en el sistema (paso 3 de autenticación)
 */
export const iniciarSesionTool = {
  name: "sgsst_iniciar_sesion",
  description: `Inicia sesión en el sistema SGSST con email/documento y contraseña.
Este es el paso final del proceso de autenticación.

Una vez autenticado exitosamente, el token de sesión se guarda automáticamente y todas las demás herramientas del MCP lo utilizarán.

Parámetros:
- email: (opcional) Email del usuario
- numeroDocumento: (opcional) Número de documento del usuario
- password: (requerido) Contraseña del usuario

Debe proporcionar email O numeroDocumento.

Ejemplo de uso:
{
  "email": "empleado@empresa.com",
  "password": "MiPassword123!"
}`,
  inputSchema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "Email del usuario",
      },
      numeroDocumento: {
        type: "string",
        description: "Número de documento del usuario",
      },
      password: {
        type: "string",
        description: "Contraseña del usuario",
      },
    },
    required: ["password"],
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
      const params = IniciarSesionSchema.parse(args);

      const client = new HttpClient(context.config, context.session);
      const response = await client.post<AuthResponse>("/api/auth/login", params);

      if (!response.success || !response.data) {
        return {
          content: [{
            type: "text",
            text: `❌ Error: ${response.error || "Credenciales inválidas"}`,
          }],
        };
      }

      const authData = response.data;

      // Actualizar el contexto de sesión
      if (context.session) {
        context.session.isAuthenticated = true;
        context.session.token = authData.token;
        context.session.user = authData.user;
      }

      return {
        content: [{
          type: "text",
          text: `✅ Sesión iniciada exitosamente

👤 Usuario: ${authData.user.nombre}
💼 Cargo: ${authData.user.cargo}
📧 Email: ${authData.user.email}
🔐 Nivel de acceso: ${authData.user.nivel}

El token de sesión ha sido guardado y se usará automáticamente en todas las demás operaciones.`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error al iniciar sesión: ${error instanceof Error ? error.message : "Error desconocido"}`,
        }],
        isError: true,
      };
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

Muestra si hay una sesión activa y los datos del usuario autenticado.

No requiere parámetros.

Ejemplo de uso:
{}`,
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
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

👤 Usuario: ${user.nombre}
🆔 ID: ${user.id}
💼 Cargo: ${user.cargo}
📧 Email: ${user.email}
🔐 Nivel de acceso: ${user.nivel}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error al obtener sesión: ${error instanceof Error ? error.message : "Error desconocido"}`,
        }],
        isError: true,
      };
    }
  },
};

/**
 * sgsst_cerrar_sesion
 * Cierra la sesión actual
 */
export const cerrarSesionTool = {
  name: "sgsst_cerrar_sesion",
  description: `Cierra la sesión actual del usuario.

Elimina el token de sesión y requiere autenticarse nuevamente para futuras operaciones.

No requiere parámetros.

Ejemplo de uso:
{}`,
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async (args: unknown, context: ToolContext) => {
    try {
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
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error al cerrar sesión: ${error instanceof Error ? error.message : "Error desconocido"}`,
        }],
        isError: true,
      };
    }
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
