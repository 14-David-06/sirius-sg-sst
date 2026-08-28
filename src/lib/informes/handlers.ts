// ══════════════════════════════════════════════════════════
// Handlers compartidos — Informe mensual de gestión SST
// El JSON y el PDF resuelven el periodo igual; solo cambia la salida.
// ══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authMiddleware";
import { mesEnCurso, periodoDelMes } from "./consolidar";
import type { Periodo } from "./types";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, message }, { status });
}

export function jsonOk(data: unknown): NextResponse {
  return NextResponse.json({ success: true, data });
}

export async function verificarSesion(
  request: NextRequest
): Promise<NextResponse | null> {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response ?? jsonError("No autenticado", 401);
  return null;
}

export function errorServidor(contexto: string, e: unknown): NextResponse {
  console.error(`[informe-mensual] ${contexto}:`, e);
  const detalle = e instanceof Error ? e.message : "Error desconocido";
  return NextResponse.json(
    { success: false, message: `Error al ${contexto}`, detalle },
    { status: 500 }
  );
}

export type PeriodoLeido =
  | { ok: true; periodo: Periodo }
  | { ok: false; error: string };

/**
 * Resuelve el periodo desde `?mes=&anio=`.
 *
 * Sin parámetros usa el mes en curso. El informe es siempre de un mes
 * calendario: la Resolución 0312 lo exige mensual, y un rango libre haría que
 * dos informes del mismo mes no fueran comparables.
 */
export function leerPeriodo(request: NextRequest): PeriodoLeido {
  const sp = request.nextUrl.searchParams;
  const mesTexto = sp.get("mes");
  const anioTexto = sp.get("anio");

  if (!mesTexto && !anioTexto) {
    return { ok: true, periodo: mesEnCurso() };
  }
  if (!mesTexto || !anioTexto) {
    return { ok: false, error: "Indique 'mes' y 'anio' juntos, o ninguno" };
  }

  const mes = Number(mesTexto);
  const anio = Number(anioTexto);

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return { ok: false, error: "El mes debe ser un entero entre 1 y 12" };
  }
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return { ok: false, error: "El año debe ser un entero entre 2000 y 2100" };
  }

  return { ok: true, periodo: periodoDelMes(anio, mes) };
}
