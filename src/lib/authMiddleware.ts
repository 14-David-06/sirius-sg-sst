/**
 * Middleware de autenticación JWT para proteger rutas API.
 *
 * Uso:
 * ```typescript
 * import { requireAuth } from "@/lib/authMiddleware";
 *
 * export async function GET(request: NextRequest) {
 *   const authResult = await requireAuth(request);
 *   if (!authResult.authenticated) return authResult.response;
 *
 *   const user = authResult.user;
 *   // ... lógica del endpoint
 * }
 * ```
 */
import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, verifyJWT, type JwtPayload } from "@/lib/jwt";
import {
  NIVELES_ACCESO,
  ORDEN_SIN_NIVEL,
  tieneNivelMinimo,
} from "@/core/domain/services/accessControl";

export interface AuthResult {
  authenticated: boolean;
  user?: JwtPayload;
  response?: NextResponse; // Response de error si no autenticado
}

/**
 * Middleware que verifica autenticación JWT.
 * Retorna objeto con `authenticated: true` y `user` si OK,
 * o `authenticated: false` y `response` (error 401) si falla.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const token = extractTokenFromRequest(request.headers);

  if (!token) {
    return {
      authenticated: false,
      response: NextResponse.json(
        {
          success: false,
          message: "No autenticado. Token faltante.",
          code: "AUTH_TOKEN_MISSING",
        },
        { status: 401 }
      ),
    };
  }

  const payload = verifyJWT(token);

  if (!payload) {
    return {
      authenticated: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Token inválido o expirado.",
          code: "AUTH_TOKEN_INVALID",
        },
        { status: 401 }
      ),
    };
  }

  return {
    authenticated: true,
    user: payload,
  };
}

/**
 * Middleware que verifica autenticación Y un nivel de acceso mínimo.
 *
 * El nivel viene del campo "Nivel_Sistema_Nuevo" de Personal (Sirius Nomina
 * Core) y viaja en el JWT como `ordenNivel`. Es jerárquico: un orden menor
 * (más privilegios) cumple cualquier requisito mayor.
 *
 * ```typescript
 * const auth = await requireNivel(request, NIVELES_ACCESO.ADMIN);
 * if (!auth.authenticated) return auth.response;
 * ```
 */
export async function requireNivel(
  request: NextRequest,
  ordenRequerido: number
): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authenticated) {
    return authResult;
  }

  const user = authResult.user!;
  // Token emitido antes de este cambio → sin nivel, se falla en cerrado
  const orden = user.ordenNivel ?? ORDEN_SIN_NIVEL;

  if (!tieneNivelMinimo(orden, ordenRequerido)) {
    return {
      authenticated: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Acceso denegado. Nivel de acceso insuficiente.",
          code: "AUTH_INSUFFICIENT_PERMISSIONS",
        },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * Middleware que verifica autenticación Y nivel de administrador o superior.
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  return requireNivel(request, NIVELES_ACCESO.ADMIN);
}

/**
 * Middleware que verifica autenticación Y nivel de super administrador.
 * Reservado para gestión de usuarios y configuración global.
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<AuthResult> {
  return requireNivel(request, NIVELES_ACCESO.SUPER_ADMIN);
}

/**
 * Lista de rutas públicas que NO requieren autenticación.
 * Estas rutas se excluyen del middleware de autenticación.
 */
export const PUBLIC_ROUTES = [
  // Auth
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify",

  // Firmas públicas (tokens autofirmados)
  "/api/registros-asistencia/firmar-publico",
  "/api/entregas-epp/firmar-publico",
  "/api/inspecciones-equipos/firmar-publico",
  "/api/inducciones/firma",

  // Validación de tokens
  "/api/registros-asistencia/token",
  "/api/entregas-epp/token/validar",
  "/api/inspecciones-equipos/token/validar",
  "/api/inducciones/token",

  // Evaluaciones públicas
  "/api/evaluar/capacitacion",

  // Políticas públicas (firma)
  "/api/politicas/firmar-publico",
  "/api/politicas/token/validar",

  // Sociodemográfico público
  "/api/socio/responder-publico",
  "/api/socio/token/validar",
];

/**
 * Verifica si una ruta es pública (no requiere autenticación).
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    // Exact match o prefix match para rutas dinámicas
    if (pathname === route) return true;
    if (pathname.startsWith(route + "/")) return true;
    return false;
  });
}
