import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/authMiddleware";

/**
 * GET /api/auth/sesion
 *
 * Quién es la sesión que hace la petición, según su JWT. Lo usa el conector
 * MCP (`sgsst_quien_soy`) para que Claude sepa con qué nivel de acceso opera,
 * y sirve a cualquier cliente que necesite confirmar que su sesión sigue viva.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response!;

  const u = auth.user!;
  return NextResponse.json({
    success: true,
    data: {
      idEmpleado: u.idEmpleado,
      nombreCompleto: u.nombreCompleto,
      correoElectronico: u.correoElectronico,
      numeroDocumento: u.numeroDocumento,
      tipoPersonal: u.tipoPersonal,
      rol: u.rol ?? null,
      nivelAcceso: u.nivelAcceso ?? null,
      ordenNivel: u.ordenNivel ?? null,
    },
  });
}
