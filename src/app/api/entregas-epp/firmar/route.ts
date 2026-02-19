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
  // Derivar clave de 32 bytes desde el secreto
  const key = crypto.createHash("sha256").update(AES_SECRET).digest();
  // IV aleatorio de 16 bytes
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  // Retornar iv:encrypted en base64
  return iv.toString("base64") + ":" + encrypted;
}

interface FirmaRequestBody {
  tokenRecordId: string;   // Record ID del token en Airtable
  entregaId: string;       // Record ID de la entrega
  signatureData: string;   // base64 data URL de la firma del canvas
  idEmpleado: string;      // ID Empleado del firmante
  numeroDocumento: string; // Cédula del firmante (verificación)
}

/**
 * POST /api/entregas-epp/firmar
 *
 * Recibe la firma del beneficiario desde el canvas:
 * 1. Encripta la firma con AES-256-CBC
 * 2. Actualiza el Token con Hash Firma y Estado "Usado"
 * 3. Actualiza la Entrega con Estado "Confirmada" y Fecha Confirmación
 */
export async function POST(request: NextRequest) {
  try {
    const body: FirmaRequestBody = await request.json();

    if (!body.tokenRecordId || !body.entregaId || !body.signatureData || !body.idEmpleado) {
      return NextResponse.json(
        { success: false, message: "Campos requeridos: tokenRecordId, entregaId, signatureData, idEmpleado" },
        { status: 400 }
      );
    }

    if (!AES_SECRET) {
      console.error("AES_SIGNATURE_SECRET no configurado");
      return NextResponse.json(
        { success: false, message: "Error de configuración del servidor" },
        { status: 500 }
      );
    }

    const headers = getSGSSTHeaders();
    const { tokensTableId, tokensFields, entregasTableId, entregasFields } =
      airtableSGSSTConfig;

    // ── 1. Encriptar firma con AES ──────────────────────
    // Construir payload con metadata para integridad
    const firmaPayload = JSON.stringify({
      signature: body.signatureData,
      employee: body.idEmpleado,
      document: body.numeroDocumento,
      timestamp: new Date().toISOString(),
      tokenRecord: body.tokenRecordId,
    });

    const encryptedSignature = encryptAES(firmaPayload);

    // ── 2. Actualizar Token Entrega ─────────────────────
    const tokenPatchUrl = `${getSGSSTUrl(tokensTableId)}?returnFieldsByFieldId=true`;
    const tokenRes = await fetch(tokenPatchUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        records: [
          {
            id: body.tokenRecordId,
            fields: {
              [tokensFields.HASH_FIRMA]: encryptedSignature,
              [tokensFields.ESTADO]: "Usado",
            },
          },
        ],
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Error updating token:", err);
      return NextResponse.json(
        { success: false, message: "Error al actualizar el token de firma" },
        { status: 500 }
      );
    }

    // ── 3. Actualizar Entrega EPP ───────────────────────
    const hoy = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const entregaPatchUrl = `${getSGSSTUrl(entregasTableId)}?returnFieldsByFieldId=true`;
    const entregaRes = await fetch(entregaPatchUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        records: [
          {
            id: body.entregaId,
            fields: {
              [entregasFields.ESTADO]: "Confirmada",
              [entregasFields.FECHA_CONFIRMACION]: hoy,
            },
          },
        ],
      }),
    });

    if (!entregaRes.ok) {
      const err = await entregaRes.text();
      console.error("Error updating entrega:", err);
      return NextResponse.json(
        { success: false, message: "Error al confirmar la entrega" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Firma registrada y entrega confirmada exitosamente",
    });
  } catch (error) {
    console.error("Error processing firma:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
