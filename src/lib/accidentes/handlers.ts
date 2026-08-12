// ══════════════════════════════════════════════════════════
// Helpers compartidos por los route handlers de /api/accidentes
// ══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authMiddleware";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, message }, { status });
}

export function jsonOk(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Verifica la sesión. Devuelve la respuesta de error si no hay sesión válida,
 * o `null` si el usuario está autenticado.
 */
export async function verificarSesion(
  request: NextRequest
): Promise<NextResponse | null> {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response ?? jsonError("No autenticado", 401);
  return null;
}

/** Registra el error en consola y devuelve una respuesta 500 uniforme. */
export function errorServidor(contexto: string, e: unknown): NextResponse {
  console.error(`[accidentes] ${contexto}:`, e);
  const detalle = e instanceof Error ? e.message : "Error desconocido";
  return NextResponse.json(
    { success: false, message: `Error al ${contexto}`, detalle },
    { status: 500 }
  );
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Valida el formato YYYY-MM-DD. */
export function esFechaValida(valor: unknown): valor is string {
  return typeof valor === "string" && RE_FECHA.test(valor);
}

/**
 * Valida que un valor pertenezca a un catálogo cerrado (los singleSelect de
 * Airtable). Devuelve un mensaje de error o `null` si es válido.
 */
export function validarCatalogo<T extends string>(
  etiqueta: string,
  valor: unknown,
  permitidos: readonly T[],
  requerido = false
): string | null {
  if (valor === undefined || valor === null || valor === "") {
    return requerido ? `El campo ${etiqueta} es obligatorio` : null;
  }
  if (!permitidos.includes(valor as T)) {
    return `${etiqueta} inválido. Valores permitidos: ${permitidos.join(", ")}`;
  }
  return null;
}

/** Lee `desde` y `hasta` de la query string validando el formato. */
export function leerPeriodo(request: NextRequest): {
  desde?: string;
  hasta?: string;
  error?: string;
} {
  const sp = request.nextUrl.searchParams;
  const desde = sp.get("desde") ?? undefined;
  const hasta = sp.get("hasta") ?? undefined;
  if (desde && !esFechaValida(desde)) {
    return { error: "El parámetro 'desde' debe tener formato YYYY-MM-DD" };
  }
  if (hasta && !esFechaValida(hasta)) {
    return { error: "El parámetro 'hasta' debe tener formato YYYY-MM-DD" };
  }
  if (desde && hasta && desde > hasta) {
    return { error: "El parámetro 'desde' no puede ser posterior a 'hasta'" };
  }
  return { desde, hasta };
}
