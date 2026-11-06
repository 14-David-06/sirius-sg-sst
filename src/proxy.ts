/**
 * Puerta de entrada: nada de `/api` ni del dashboard sin sesión.
 *
 * Hasta noviembre de 2026 la mayoría de las rutas de `/api` no comprobaban
 * sesión —solo accidentes, medicina laboral, informes, inspecciones de
 * emergencia y unas pocas más llamaban a `requireAuth`—, así que cualquiera con
 * la URL podía leer y escribir. Aquí se cierra todo de una vez: un JWT válido
 * (cookie `auth_token` o `Authorization: Bearer`) o la ruta tiene que estar en
 * `RUTAS_PUBLICAS`.
 *
 * Esto es el piso, no el techo. Lo que dependa del nivel de acceso sigue
 * viviendo en cada ruta con `requireNivel`; aquí solo se decide si hay sesión.
 */
import { NextResponse, type NextRequest } from "next/server";

import { extractTokenFromRequest, verifyJWT } from "@/lib/jwt";
import { esRutaPublica } from "@/lib/rutasPublicas";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esApi = pathname.startsWith("/api/");

  if (esApi && esRutaPublica(pathname, request.method)) {
    return NextResponse.next();
  }

  const token = extractTokenFromRequest(request.headers);
  if (token && verifyJWT(token)) {
    return NextResponse.next();
  }

  if (esApi) {
    return NextResponse.json(
      {
        success: false,
        message: "Sesión expirada o inexistente. Inicia sesión de nuevo.",
        error: "Sesión expirada o inexistente. Inicia sesión de nuevo.",
        code: token ? "AUTH_TOKEN_INVALID" : "AUTH_TOKEN_MISSING",
      },
      { status: 401 },
    );
  }

  // Dashboard: la sesión de la UI vive en localStorage y no vence, pero la
  // cookie dura 7 días. Sin esta redirección, al vencer la cookie se ve el
  // dashboard con todas las consultas fallando en 401.
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
};
