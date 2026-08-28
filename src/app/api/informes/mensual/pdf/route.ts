// ══════════════════════════════════════════════════════════
// GET /api/informes/mensual/pdf?mes=7&anio=2026
//
// El mismo informe, en PDF con el formato corporativo.
// ══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { generarInformeMensual } from "@/lib/informes/consolidar";
import {
  errorServidor,
  jsonError,
  leerPeriodo,
  verificarSesion,
} from "@/lib/informes/handlers";
import { generarPdfInformeMensual } from "@/lib/informes/pdf";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  const resultado = leerPeriodo(request);
  if (!resultado.ok) return jsonError(resultado.error);
  const { periodo } = resultado;

  try {
    const informe = await generarInformeMensual(periodo);
    const pdf = generarPdfInformeMensual(informe);

    const nombre = `Informe_Gestion_SST_${periodo.anio}-${String(periodo.mes).padStart(2, "0")}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombre}"`,
      },
    });
  } catch (e) {
    return errorServidor("generar el PDF del informe mensual", e);
  }
}
