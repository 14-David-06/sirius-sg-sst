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

// Las rutas que responden sin sesión están en `@/lib/rutasPublicas`, y quien
// las aplica es `src/proxy.ts`. La lista que vivía aquí nunca se conectó y
// había quedado desalineada con las rutas reales.
