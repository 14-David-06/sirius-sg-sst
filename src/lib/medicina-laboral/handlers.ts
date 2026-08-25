// ══════════════════════════════════════════════════════════
// Handlers HTTP — Medicina Laboral
// Helpers compartidos por los endpoints API
// ══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authMiddleware";

// ── Respuestas ─────────────────────────────────────────────

export function jsonOk(data: unknown): NextResponse {
  return NextResponse.json({ success: true, data });
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, message }, { status });
}

export function errorServidor(accion: string, error: unknown): NextResponse {
  console.error(`[medicina-laboral] Error al ${accion}:`, error);
  const message =
    error instanceof Error ? error.message : `Error al ${accion}`;
  return NextResponse.json({ success: false, message }, { status: 500 });
}

// ── Autenticación ──────────────────────────────────────────

/**
 * Verifica la sesión. Devuelve la respuesta de error si no hay sesión válida,
 * o `null` si el usuario está autenticado.
 */
export async function verificarSesion(
  req: NextRequest
): Promise<NextResponse | null> {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return auth.response ?? jsonError("No autenticado", 401);
  }
  return null;
}

// ── Validación de fechas ───────────────────────────────────

export function esFechaValida(fecha: unknown): fecha is string {
  if (typeof fecha !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(fecha);
  return !isNaN(d.getTime());
}

// ── Leer periodo desde query params ───────────────────────

export function leerPeriodo(req: NextRequest): {
  desde: string;
  hasta: string;
  error?: string;
} {
  const sp = req.nextUrl.searchParams;
  const mesParam = sp.get("mes");
  const anioParam = sp.get("anio");
  let desde = sp.get("desde");
  let hasta = sp.get("hasta");

  // Si vienen mes+anio, calcular desde/hasta
  if (mesParam && anioParam) {
    const mes = parseInt(mesParam, 10);
    const anio = parseInt(anioParam, 10);
    if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) {
      return {
        desde: "",
        hasta: "",
        error: "Parámetros 'mes' (1-12) y 'anio' inválidos",
      };
    }
    desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    hasta = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  }

  // Si no vienen desde/hasta, usar mes en curso
  if (!desde || !hasta) {
    const now = new Date();
    const anio = now.getFullYear();
    const mes = now.getMonth() + 1;
    desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    hasta = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  }

  if (!esFechaValida(desde)) {
    return { desde: "", hasta: "", error: "Fecha 'desde' inválida (YYYY-MM-DD)" };
  }
  if (!esFechaValida(hasta)) {
    return { desde: "", hasta: "", error: "Fecha 'hasta' inválida (YYYY-MM-DD)" };
  }

  return { desde, hasta };
}

// ── Validación de catálogos ───────────────────────────────

export function validarCatalogo(
  nombreParam: string,
  valor: string | null | undefined,
  catalogoValido: readonly string[],
  requerido = false
): string | null {
  if (!valor) {
    return requerido ? `El parámetro '${nombreParam}' es obligatorio` : null;
  }
  if (!catalogoValido.includes(valor)) {
    return `Valor inválido para '${nombreParam}'. Valores permitidos: ${catalogoValido.join(", ")}`;
  }
  return null;
}
