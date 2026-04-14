import { NextRequest, NextResponse } from "next/server";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";
import {
  uploadToS3,
  generateS3Key,
  S3_FOLDERS,
} from "@/infrastructure/config/awsS3";

// ══════════════════════════════════════════════════════════
// POST /api/entregas-epp/foto-evidencia
// Sube 1-3 fotos de evidencia a S3 y guarda las URLs en Airtable
// ══════════════════════════════════════════════════════════

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB por foto
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MIN_FOTOS = 1;
const MAX_FOTOS = 3;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const entregaRecordId = formData.get("entregaRecordId") as string | null;
    const files = formData.getAll("fotos") as File[];

    // ── Validaciones ──────────────────────────────────────
    if (!entregaRecordId) {
      return NextResponse.json(
        { success: false, message: "Se requiere entregaRecordId" },
        { status: 400 }
      );
    }

    if (files.length < MIN_FOTOS || files.length > MAX_FOTOS) {
      return NextResponse.json(
        { success: false, message: `Se requieren entre ${MIN_FOTOS} y ${MAX_FOTOS} fotos de evidencia` },
        { status: 400 }
      );
    }

    // Validar que entregaRecordId parece un ID de Airtable
    if (!/^rec[a-zA-Z0-9]{14}$/.test(entregaRecordId)) {
      return NextResponse.json(
        { success: false, message: "ID de entrega inválido" },
        { status: 400 }
      );
    }

    // Validar cada archivo
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, message: `Formato no permitido: ${file.name}. Use JPG, PNG o WebP` },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, message: `${file.name} excede el tamaño máximo de 10 MB` },
          { status: 400 }
        );
      }
    }

    // ── Subir todas las fotos a S3 ────────────────────────
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const timestamp = Date.now();
      const filename = `foto-entrega-${entregaRecordId}-${i + 1}-${timestamp}.${ext}`;

      const s3Key = generateS3Key(S3_FOLDERS.ENTREGA_EPP, filename);
      const { url: s3Url } = await uploadToS3(s3Key, buffer, file.type);

      uploadedUrls.push(s3Url);
      console.log(`Foto evidencia ${i + 1}/${files.length} subida a S3: ${s3Url}`);
    }

    // ── Guardar URLs en Airtable (formato attachment) ──
    const { entregasTableId, entregasFields } = airtableSGSSTConfig;
    const updateUrl = `${getSGSSTUrl(entregasTableId)}/${entregaRecordId}`;

    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: getSGSSTHeaders(),
      body: JSON.stringify({
        fields: {
          [entregasFields.FOTO_EVIDENCIA_URL]: uploadedUrls.map((url) => ({ url })),
        },
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error("Error actualizando Airtable con URLs de fotos:", errText);
      return NextResponse.json({
        success: true,
        message: "Fotos subidas a S3 pero no se pudieron guardar en Airtable",
        urls: uploadedUrls,
        warning: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedUrls.length} foto(s) de evidencia guardada(s) exitosamente`,
      urls: uploadedUrls,
    });
  } catch (error) {
    console.error("Error en POST /api/entregas-epp/foto-evidencia:", error);
    return NextResponse.json(
      { success: false, message: "Error al procesar la foto de evidencia" },
      { status: 500 }
    );
  }
}
