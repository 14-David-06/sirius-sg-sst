import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

// ── AES-256-CBC Encryption ──────────────────────────────
const AES_SECRET = process.env.AES_SIGNATURE_SECRET || "";

function encryptAES(plaintext: string): string {
  const key = crypto.createHash("sha256").update(AES_SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

/**
 * POST /api/registros-asistencia/firmar
 *
 * Body para asistente:
 *   { tipo: "asistente", detalleRecordId, firmaDataUrl, nombre?, idEmpleado?, cedula? }
 *   → Cifra la firma con AES-256-CBC y guarda en campo Firma de Asistencia Capacitaciones
 *   → Marca FIRMA_CONFIRMADA = true
 *
 * Body para conferencista:
 *   { tipo: "conferencista", registroRecordId, firmaDataUrl, nombre? }
 *   → Cifra la firma y guarda en campo Firma Conferencista del Evento
 *   → Actualiza Estado Evento = "Finalizado"
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
      const { detalleRecordId, firmaDataUrl, nombre, idEmpleado, cedula } = body;
      if (!detalleRecordId) {
        return NextResponse.json(
          { success: false, message: "detalleRecordId es requerido para tipo asistente" },
          { status: 400 }
        );
      }

      const { asistenciaCapacitacionesTableId, asistenciaCapacitacionesFields: f } =
        airtableSGSSTConfig;
      const url = `${getSGSSTUrl(asistenciaCapacitacionesTableId)}?returnFieldsByFieldId=true`;

      // Cifrar firma si se provee
      const patchFields: Record<string, unknown> = { [f.FIRMA_CONFIRMADA]: true };
      if (firmaDataUrl && AES_SECRET) {
        const payload = JSON.stringify({
          signature: firmaDataUrl,
          employee: idEmpleado || "",
          document: cedula || "",
          nombre: nombre || "",
          timestamp: new Date().toISOString(),
        });
        patchFields[f.FIRMA] = encryptAES(payload);
      }

      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          records: [{ id: detalleRecordId, fields: patchFields }],
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
        message: "Asistencia firmada y confirmada correctamente",
      });
    }

    if (tipo === "conferencista") {
      const { registroRecordId, firmaDataUrl, nombre } = body;
      if (!registroRecordId) {
        return NextResponse.json(
          { success: false, message: "registroRecordId es requerido para tipo conferencista" },
          { status: 400 }
        );
      }

      const { eventosCapacitacionTableId, eventosCapacitacionFields: f } =
        airtableSGSSTConfig;
      const url = `${getSGSSTUrl(eventosCapacitacionTableId)}?returnFieldsByFieldId=true`;

      // Construir campos a parchear
      const eventoPatchFields: Record<string, unknown> = { [f.ESTADO]: "Finalizado" };
      if (firmaDataUrl && AES_SECRET) {
        const payload = JSON.stringify({
          signature: firmaDataUrl,
          nombre: nombre || "",
          timestamp: new Date().toISOString(),
        });
        eventoPatchFields[f.FIRMA_CONFERENCISTA] = encryptAES(payload);
      }

      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          records: [{ id: registroRecordId, fields: eventoPatchFields }],
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
