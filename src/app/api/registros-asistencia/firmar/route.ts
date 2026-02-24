import { NextRequest, NextResponse } from "next/server";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

/**
 * POST /api/registros-asistencia/firmar
 *
 * Body para asistente:
 *   { tipo: "asistente", detalleRecordId }
 *   → marca Firma Confirmada = true en Asistencia Capacitaciones
 *
 * Body para conferencista:
 *   { tipo: "conferencista", registroRecordId }
 *   → actualiza Estado Evento = "Finalizado" en Eventos Capacitación
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo } = body;

    if (!tipo) {
      return NextResponse.json(
        { success: false, message: "El campo 'tipo' es requerido" },
        { status: 400 }
      );
    }

    const headers = getSGSSTHeaders();

    if (tipo === "asistente") {
      const { detalleRecordId } = body;
      if (!detalleRecordId) {
        return NextResponse.json(
          { success: false, message: "detalleRecordId es requerido para tipo asistente" },
          { status: 400 }
        );
      }

      const { asistenciaCapacitacionesTableId, asistenciaCapacitacionesFields: f } =
        airtableSGSSTConfig;
      const url = getSGSSTUrl(asistenciaCapacitacionesTableId);

      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          records: [
            {
              id: detalleRecordId,
              fields: {
                [f.FIRMA_CONFIRMADA]: true,
              },
            },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Error confirmando firma de asistente:", err);
        return NextResponse.json(
          { success: false, message: "Error al confirmar la firma" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Asistencia confirmada correctamente",
      });
    }

    if (tipo === "conferencista") {
      const { registroRecordId } = body;
      if (!registroRecordId) {
        return NextResponse.json(
          { success: false, message: "registroRecordId es requerido para tipo conferencista" },
          { status: 400 }
        );
      }

      const { eventosCapacitacionTableId, eventosCapacitacionFields: f } =
        airtableSGSSTConfig;
      const url = getSGSSTUrl(eventosCapacitacionTableId);

      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          records: [
            {
              id: registroRecordId,
              fields: {
                [f.ESTADO]: "Finalizado",
              },
            },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Error finalizando evento:", err);
        return NextResponse.json(
          { success: false, message: "Error al finalizar el evento" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Evento marcado como Finalizado",
      });
    }

    return NextResponse.json(
      { success: false, message: "Tipo inválido. Use 'asistente' o 'conferencista'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error en POST /api/registros-asistencia/firmar:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
