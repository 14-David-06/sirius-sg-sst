import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ══════════════════════════════════════════════════════════
// AES-256-CBC Decryption
// ══════════════════════════════════════════════════════════
const AES_SECRET = process.env.AES_SIGNATURE_SECRET || "";

function decryptAES(encryptedStr: string): string {
  // Formato: iv_base64:encrypted_base64
  const [ivB64, encB64] = encryptedStr.split(":");
  if (!ivB64 || !encB64) throw new Error("Formato de cifrado inválido");

  const key = crypto.createHash("sha256").update(AES_SECRET).digest();
  const iv = Buffer.from(ivB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  let decrypted = decipher.update(encB64, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

interface FirmaInspeccion {
  signature: string;
  employee: string;
  name: string;
  timestamp: string;
  inspeccionId: string;
}

/**
 * POST /api/inspecciones-epp/descifrar
 *
 * Recibe el hash cifrado de una firma de inspección y lo descifra
 * usando la clave AES-256-CBC del servidor.
 * Devuelve la firma (data URL de la imagen) y metadatos.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hashFirma } = body as { hashFirma: string };

    if (!hashFirma) {
      return NextResponse.json(
        { success: false, message: "Se requiere hashFirma" },
        { status: 400 }
      );
    }

    if (!AES_SECRET) {
      return NextResponse.json(
        { success: false, message: "Error de configuración del servidor" },
        { status: 500 }
      );
    }

    // ── Descifrar la firma automáticamente ──────────────
    const decryptedJson = decryptAES(hashFirma);
    const firmaData: FirmaInspeccion = JSON.parse(decryptedJson);

    // firmaData tiene: { signature, employee, name, timestamp, inspeccionId }
    return NextResponse.json({
      success: true,
      firma: {
        signatureDataUrl: firmaData.signature,
        employee: firmaData.employee,
        name: firmaData.name,
        timestamp: firmaData.timestamp,
        inspeccionId: firmaData.inspeccionId,
      },
    });
  } catch (error) {
    console.error("Error decrypting inspection signature:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error al descifrar la firma de inspección",
      },
      { status: 500 }
    );
  }
}
