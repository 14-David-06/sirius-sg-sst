// ══════════════════════════════════════════════════════════
// GET /api/accidentes/indicadores?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
//
// Devuelve las estadísticas legales del periodo que este módulo puede
// calcular, más las filas listas para las dos tablas de accidentes del
// informe mensual de gestión SST.
//
// Sin parámetros, usa el mes calendario en curso (America/Bogota).
// ══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import {
  errorServidor,
  jsonError,
  jsonOk,
  leerPeriodo,
  verificarSesion,
} from "@/lib/accidentes/handlers";
import { calcularIndicadores } from "@/lib/accidentes/repository";

export const dynamic = "force-dynamic";

/** Primer y último día del mes en curso en zona America/Bogota. */
function mesEnCurso(): { desde: string; hasta: string } {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [anio, mes] = hoy.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, "0");
  return {
    desde: `${anio}-${mm}-01`,
    hasta: `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

export async function GET(request: NextRequest) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { desde, hasta, error } = leerPeriodo(request);
    if (error) return jsonError(error);

    const porDefecto = mesEnCurso();
    const resultado = await calcularIndicadores(
      desde ?? porDefecto.desde,
      hasta ?? porDefecto.hasta
    );

    return jsonOk({
      ...resultado,
      // Los indicadores restantes del informe dependen del módulo de
      // medicina laboral, que aún no existe.
      pendientesDeOtrosModulos: [
        "Días de incapacidad por enfermedad general",
        "Enfermedades laborales en proceso de calificación",
        "Enfermedades laborales reconocidas por la ARL",
        "Trabajadores reubicados temporal y definitivamente",
        "Trabajadores rehabilitados",
      ],
    });
  } catch (e) {
    return errorServidor("calcular los indicadores", e);
  }
}
