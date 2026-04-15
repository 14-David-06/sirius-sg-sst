import { NextRequest, NextResponse } from "next/server";
import {
  generateS3Key,
  getPresignedUploadUrl,
  S3_FOLDERS,
} from "@/infrastructure/config/awsS3";

// ══════════════════════════════════════════════════════════
// POST /api/entregas-epp/foto-evidencia/presign
// Genera URLs prefirmadas para subir fotos directo a S3
// desde el navegador (evita límite de payload de Vercel)
// ══════════════════════════════════════════════════════════

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FOTOS = 3;

interface PresignRequest {
  entregaRecordId: string;
  fotos: { type: string; extension: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body: PresignRequest = await req.json();
    const { entregaRecordId, fotos } = body;

    // ── Validaciones ──────────────────────────────────────
    if (!entregaRecordId || !/^rec[a-zA-Z0-9]{14}$/.test(entregaRecordId)) {
      return NextResponse.json(
        { success: false, message: "ID de entrega inválido" },
        { status: 400 }
      );
    }

    if (!fotos || fotos.length === 0 || fotos.length > MAX_FOTOS) {
      return NextResponse.json(
        { success: false, message: `Se requieren entre 1 y ${MAX_FOTOS} fotos` },
        { status: 400 }
      );
    }

    for (const foto of fotos) {
      if (!ALLOWED_TYPES.includes(foto.type)) {
        return NextResponse.json(
          { success: false, message: `Formato no permitido: ${foto.type}. Use JPG, PNG o WebP` },
          { status: 400 }
        );
      }
    }

    // ── Generar URLs prefirmadas ──────────────────────────
    const timestamp = Date.now();
    const uploads = await Promise.all(
      fotos.map(async (foto, i) => {
        const ext = foto.extension || (foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg");
        const filename = `foto-entrega-${entregaRecordId}-${i + 1}-${timestamp}.${ext}`;
        const key = generateS3Key(S3_FOLDERS.ENTREGA_EPP, filename);
        const uploadUrl = await getPresignedUploadUrl(key, foto.type, 600);

        return { key, uploadUrl, contentType: foto.type };
      })
    );

    return NextResponse.json({
      success: true,
      uploads,
    });
  } catch (error) {
    console.error("Error en POST /api/entregas-epp/foto-evidencia/presign:", error);
    return NextResponse.json(
      { success: false, message: "Error al generar URLs de carga" },
      { status: 500 }
    );
  }
}
