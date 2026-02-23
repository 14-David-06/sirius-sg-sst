import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

// ══════════════════════════════════════════════════════════
// AES-256-CBC Encryption
// ══════════════════════════════════════════════════════════
const AES_SECRET = process.env.AES_SIGNATURE_SECRET || "";

function encryptAES(plaintext: string): string {
  const key = crypto.createHash("sha256").update(AES_SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

// ══════════════════════════════════════════════════════════
// POST /api/registros-asistencia/firmar
// Guarda la firma de un asistente o del conferencista
//
// Body para asistente:
//   { tipo: "asistente", registroRecordId, detalleRecordId, firmaDataUrl, nombre, idEmpleado }
//
// Body para conferencista:
//   { tipo: "conferencista", registroRecordId, firmaDataUrl, nombre }
// ══════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, registroRecordId, firmaDataUrl, nombre, idEmpleado } = body;

    if (!tipo || !registroRecordId || !firmaDataUrl) {
      return NextResponse.json(
        { success: false, message: "Faltan campos requeridos: tipo, registroRecordId, firmaDataUrl" },
        { status: 400 }
      );
    }

    if (!AES_SECRET) {
      return NextResponse.json(
        { success: false, message: "La clave de cifrado no está configurada" },
        { status: 500 }
      );
    }

    // Cifrar la firma
    const firmaPayload = JSON.stringify({
      signature: firmaDataUrl,
      employee: idEmpleado || "",
      name: nombre || "",
      timestamp: new Date().toISOString(),
      tipo,
    });
    const firmaEncriptada = encryptAES(firmaPayload);

    if (tipo === "asistente") {
      const { detalleRecordId } = body;
      if (!detalleRecordId) {
        return NextResponse.json(
          { success: false, message: "detalleRecordId es requerido para tipo asistente" },
          { status: 400 }
        );
      }

      const detalleUrl = getSGSSTUrl(airtableSGSSTConfig.detalleRegistroTableId);
      const response = await fetch(detalleUrl, {
        method: "PATCH",
        headers: getSGSSTHeaders(),
        body: JSON.stringify({
          records: [
            {
              id: detalleRecordId,
              fields: {
                [airtableSGSSTConfig.detalleRegistroFields.FIRMA]: firmaEncriptada,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error guardando firma de asistente:", errorText);
        return NextResponse.json(
          { success: false, message: "Error al guardar la firma" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Firma de asistente guardada correctamente",
      });
    }

    if (tipo === "conferencista") {
      const { registroAsistenciaFields } = airtableSGSSTConfig;
      const cabeceraUrl = getSGSSTUrl(airtableSGSSTConfig.registroAsistenciaTableId);

      const response = await fetch(cabeceraUrl, {
        method: "PATCH",
        headers: getSGSSTHeaders(),
        body: JSON.stringify({
          records: [
            {
              id: registroRecordId,
              fields: {
                [registroAsistenciaFields.FIRMA_CONFERENCISTA]: firmaEncriptada,
                [registroAsistenciaFields.ESTADO]: "Completado",
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error guardando firma de conferencista:", errorText);
        return NextResponse.json(
          { success: false, message: "Error al guardar la firma del conferencista" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Firma de conferencista guardada. Registro completado.",
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
