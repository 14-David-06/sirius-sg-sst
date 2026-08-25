// ══════════════════════════════════════════════════════════
// GET /api/medicina-laboral/indicadores  — Calcular indicadores del periodo
// Retorna los 9 indicadores legales del informe mensual de gestión SST
// que cubre el módulo de medicina laboral
// ══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import {
  errorServidor,
  jsonError,
  jsonOk,
  leerPeriodo,
  verificarSesion,
} from "@/lib/medicina-laboral/handlers";
import { calcularIndicadoresMedicinaLaboral } from "@/lib/medicina-laboral/repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const sp = request.nextUrl.searchParams;
    const mesParam = sp.get("mes");
    const anioParam = sp.get("anio");

    let mes: number | undefined;
    let anio: number | undefined;

    if (mesParam && anioParam) {
      mes = parseInt(mesParam, 10);
      anio = parseInt(anioParam, 10);

      if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) {
        return jsonError("Parámetros 'mes' (1-12) y 'anio' inválidos");
      }
    }

    const indicadores = await calcularIndicadoresMedicinaLaboral(
      desde,
      hasta,
      mes,
      anio
    );

    return jsonOk(indicadores);
  } catch (e) {
    return errorServidor("calcular los indicadores de medicina laboral", e);
  }
}
