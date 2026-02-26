import { NextRequest, NextResponse } from "next/server";
import { generateSigningToken } from "@/lib/signingToken";

/**
 * POST /api/registros-asistencia/token
 *
 * Genera tokens de firma remota para cada asistente de un evento.
 * Los tokens son HMAC-SHA256 firmados, válidos 72 horas.
 *
 * Body:
 *   {
 *     baseUrl: string;               // ej: "https://app.sirius.com"
 *     asistentes: Array<{
 *       detalleRecordId: string;     // Record ID en Asistencia Capacitaciones
 *       eventoRecordId: string;      // Record ID en Eventos Capacitación
 *       nombre: string;
 *       cedula: string;
 *     }>;
 *   }
 *
 * Response:
 *   {
 *     success: true;
 *     tokens: Array<{ detalleRecordId, nombre, token, url }>;
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const { baseUrl, asistentes } = await request.json();

    if (!Array.isArray(asistentes) || asistentes.length === 0) {
      return NextResponse.json(
        { success: false, message: "Se requiere un array 'asistentes' con al menos un elemento" },
        { status: 400 }
      );
    }

    if (!process.env.AES_SIGNATURE_SECRET) {
      return NextResponse.json(
        { success: false, message: "AES_SIGNATURE_SECRET no configurado" },
        { status: 500 }
      );
    }

    const origin = baseUrl || "";

    const tokens = asistentes.map((a: {
      detalleRecordId: string;
      eventoRecordId: string;
      nombre: string;
      cedula: string;
    }) => {
      const token = generateSigningToken({
        r: a.detalleRecordId,
        e: a.eventoRecordId,
        n: a.nombre,
        c: a.cedula,
      });
      return {
        detalleRecordId: a.detalleRecordId,
        nombre: a.nombre,
        token,
        url: `${origin}/evaluar/capacitacion?t=${token}`,
      };
    });

    return NextResponse.json({ success: true, tokens });
  } catch (error) {
    console.error("Error generando tokens de firma:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
