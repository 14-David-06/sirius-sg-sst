import { NextRequest, NextResponse } from "next/server";
import { AirtableTokenRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableTokenRepository";
import { AirtableCampanaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableCampanaRepository";

const tokensRepo = new AirtableTokenRepository();
const campanasRepo = new AirtableCampanaRepository();

/**
 * GET /api/socio/tokens/validar/:token
 * Valida si un token existe, no ha sido usado y pertenece a una campaña activa
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Buscar token en la base de datos
    const tokenRecord = await tokensRepo.obtenerPorToken(token);

    if (!tokenRecord) {
      return NextResponse.json(
        {
          valido: false,
          error: "Token no encontrado",
          codigo: "TOKEN_NO_ENCONTRADO",
        },
        { status: 404 }
      );
    }

    // Verificar si ya fue usado
    if (tokenRecord.usado) {
      return NextResponse.json(
        {
          valido: false,
          error: "Este formulario ya fue completado",
          codigo: "TOKEN_YA_USADO",
          fechaUso: tokenRecord.fechaUso,
        },
        { status: 400 }
      );
    }

    // Verificar estado de la campaña
    const campana = await campanasRepo.obtenerPorId(tokenRecord.campanaId);

    if (!campana) {
      return NextResponse.json(
        {
          valido: false,
          error: "Campaña no encontrada",
          codigo: "CAMPANA_NO_ENCONTRADA",
        },
        { status: 404 }
      );
    }

    if (campana.estado === "Cerrada") {
      return NextResponse.json(
        {
          valido: false,
          error: "Esta campaña ya está cerrada",
          codigo: "CAMPANA_CERRADA",
          fechaCierre: campana.fechaCierre,
        },
        { status: 400 }
      );
    }

    // Datos del colaborador desde Nómina Core (solo lectura) para prellenar la encuesta.
    // Si la consulta falla, la encuesta sigue funcionando sin prellenado.
    let colaborador: {
      nombreCompleto: string;
      numeroDocumento: string;
      codigoEmpleado: string;
      fechaNacimiento?: string;
      fechaIncorporacion?: string;
      areaTrabajo?: string;
      cargo?: string;
    } | null = null;
    try {
      const conPersonal = await tokensRepo.obtenerConPersonal(token);
      if (conPersonal?.nombreCompleto) {
        colaborador = {
          nombreCompleto: conPersonal.nombreCompleto,
          numeroDocumento: conPersonal.numeroDocumento || "",
          codigoEmpleado: conPersonal.codigoEmpleado,
          fechaNacimiento: conPersonal.fechaNacimiento,
          fechaIncorporacion: conPersonal.fechaIncorporacion,
          areaTrabajo: conPersonal.areaTrabajo,
          cargo: conPersonal.cargo,
        };
      }
    } catch (e) {
      console.warn("[GET /api/socio/tokens/validar] No se pudo prellenar colaborador:", e);
    }

    // Token válido
    return NextResponse.json({
      valido: true,
      campana: {
        id: campana.id,
        nombre: campana.nombre,
        periodo: campana.periodo,
        año: campana.año,
      },
      personalId: tokenRecord.personalId,
      colaborador,
    });
  } catch (error: unknown) {
    console.error("[GET /api/socio/tokens/validar/:token] Error:", error);
    return NextResponse.json(
      {
        valido: false,
        error: "Error al validar token",
        codigo: "ERROR_SERVIDOR",
      },
      { status: 500 }
    );
  }
}
