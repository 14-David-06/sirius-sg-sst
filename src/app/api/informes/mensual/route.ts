// ══════════════════════════════════════════════════════════
// GET /api/informes/mensual?mes=7&anio=2026
//
// Informe mensual de gestión SST en JSON. Sin parámetros usa el mes en curso
// (America/Bogota).
// ══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import { generarInformeMensual } from "@/lib/informes/consolidar";
import {
  errorServidor,
  jsonError,
  jsonOk,
  leerPeriodo,
  verificarSesion,
} from "@/lib/informes/handlers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  const resultado = leerPeriodo(request);
  if (!resultado.ok) return jsonError(resultado.error);
  const { periodo } = resultado;

  try {
    return jsonOk(await generarInformeMensual(periodo));
  } catch (e) {
    return errorServidor("generar el informe mensual", e);
  }
}
