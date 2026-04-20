import { NextRequest, NextResponse } from "next/server";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";
import {
  uploadToS3,
  generateS3Key,
  getSignedUrlForKey,
  S3_FOLDERS,
} from "@/infrastructure/config/awsS3";

// ══════════════════════════════════════════════════════════
// POST /api/entregas-epp/foto-evidencia/actualizar
// Sube una foto a S3 y actualiza/agrega en un índice específico
// preservando las demás fotos existentes.
// Body: FormData con entregaRecordId, index, foto (File)
// ══════════════════════════════════════════════════════════

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const entregaRecordId = formData.get("entregaRecordId") as string | null;
    const indexStr = formData.get("index") as string | null;
    const foto = formData.get("foto") as File | null;

    // ── Validaciones ──────────────────────────────────
    if (!entregaRecordId || !/^rec[a-zA-Z0-9]{14}$/.test(entregaRecordId)) {
      return NextResponse.json(
        { success: false, message: "ID de entrega inválido" },
        { status: 400 }
      );
    }

    const index = parseInt(indexStr || "", 10);
    if (isNaN(index) || index < 0 || index > 2) {
      return NextResponse.json(
        { success: false, message: "Índice inválido (0-2)" },
        { status: 400 }
      );
    }

    if (!foto || !(foto instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Se requiere una foto" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(foto.type)) {
      return NextResponse.json(
        { success: false, message: `Formato no permitido: ${foto.type}. Use JPG, PNG o WebP` },
        { status: 400 }
      );
    }

    if (foto.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "La imagen excede 10 MB" },
        { status: 400 }
      );
    }

    const { entregasTableId, entregasFields } = airtableSGSSTConfig;

    // 1. Leer attachments actuales de Airtable (returnFieldsByFieldId para usar field IDs)
    const getUrl = `${getSGSSTUrl(entregasTableId)}/${entregaRecordId}?returnFieldsByFieldId=true`;
    const getRes = await fetch(getUrl, { headers: getSGSSTHeaders() });
    if (!getRes.ok) {
      console.error("Error leyendo entrega:", await getRes.text());
      return NextResponse.json(
        { success: false, message: "No se pudo obtener la entrega" },
        { status: 500 }
      );
    }

    const record = await getRes.json();
    const currentAttachments: { id?: string; url: string }[] =
      Array.isArray(record.fields?.[entregasFields.FOTO_EVIDENCIA_URL])
        ? record.fields[entregasFields.FOTO_EVIDENCIA_URL]
        : [];

    // 2. Subir foto a S3
    const arrayBuffer = await foto.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
    const timestamp = Date.now();
    const filename = `foto-entrega-${entregaRecordId}-${index + 1}-${timestamp}.${ext}`;
    const s3Key = generateS3Key(S3_FOLDERS.ENTREGA_EPP, filename);

    const { key } = await uploadToS3(s3Key, buffer, foto.type);
    console.log(`Foto evidencia subida a S3: ${key}`);

    // 3. Generar URL firmada para Airtable (24h)
    const signedUrl = await getSignedUrlForKey(key, 86400);

    // 4. Construir array actualizado preservando las demás fotos
    const updatedAttachments: ({ id: string } | { url: string })[] = [];
    const maxIndex = Math.max(currentAttachments.length, index + 1);

    for (let i = 0; i < maxIndex; i++) {
      if (i === index) {
        updatedAttachments.push({ url: signedUrl });
      } else if (i < currentAttachments.length) {
        const existing = currentAttachments[i];
        if (existing.id) {
          updatedAttachments.push({ id: existing.id });
        } else {
          updatedAttachments.push({ url: existing.url });
        }
      }
    }

    // 5. Guardar en Airtable
    const updateUrl = `${getSGSSTUrl(entregasTableId)}/${entregaRecordId}`;
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: getSGSSTHeaders(),
      body: JSON.stringify({
        fields: {
          [entregasFields.FOTO_EVIDENCIA_URL]: updatedAttachments,
        },
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error("Error actualizando foto en Airtable:", errText);
      return NextResponse.json(
        { success: false, message: "Foto subida a S3 pero error al guardar en Airtable" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Foto ${index + 1} ${index < currentAttachments.length ? "actualizada" : "agregada"} exitosamente`,
      index,
    });
  } catch (error) {
    console.error("Error en POST /api/entregas-epp/foto-evidencia/actualizar:", error);
    return NextResponse.json(
      { success: false, message: "Error al procesar la foto" },
      { status: 500 }
    );
  }
}
