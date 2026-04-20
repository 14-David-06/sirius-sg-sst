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
  s3Config,
} from "@/infrastructure/config/awsS3";

// ══════════════════════════════════════════════════════════
// POST /api/entregas-epp/foto-evidencia
// Opción A (producción): Recibe keys de S3 ya subidas y guarda en Airtable
// Opción B (fallback): Recibe archivos FormData, sube a S3 y guarda en Airtable
// ══════════════════════════════════════════════════════════

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB por foto
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MIN_FOTOS = 1;
const MAX_FOTOS = 3;

function getFotoFieldId(): string | null {
  const fieldId = airtableSGSSTConfig.entregasFields.FOTO_EVIDENCIA_URL;
  if (!fieldId || fieldId === "undefined") return null;
  return fieldId;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // ── Opción A: JSON con keys de S3 (subida directa desde navegador) ──
    if (contentType.includes("application/json")) {
      return handleJsonKeys(req);
    }

    // ── Opción B: FormData con archivos (fallback local/dev) ──
    return handleFormDataUpload(req);
  } catch (error) {
    console.error("Error en POST /api/entregas-epp/foto-evidencia:", error);
    return NextResponse.json(
      { success: false, message: "Error al procesar la foto de evidencia" },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────
// Opción A: El frontend ya subió a S3, solo guardar en Airtable
// ──────────────────────────────────────────────────────────
async function handleJsonKeys(req: NextRequest) {
  const body = await req.json();
  const { entregaRecordId, s3Keys } = body as {
    entregaRecordId: string;
    s3Keys: string[];
  };

  if (!entregaRecordId || !/^rec[a-zA-Z0-9]{14}$/.test(entregaRecordId)) {
    return NextResponse.json(
      { success: false, message: "ID de entrega inválido" },
      { status: 400 }
    );
  }

  if (!s3Keys || s3Keys.length < MIN_FOTOS || s3Keys.length > MAX_FOTOS) {
    return NextResponse.json(
      { success: false, message: `Se requieren entre ${MIN_FOTOS} y ${MAX_FOTOS} fotos` },
      { status: 400 }
    );
  }

  const fotoFieldId = getFotoFieldId();
  if (!fotoFieldId) {
    return NextResponse.json(
      {
        success: false,
        message: "Configuración faltante: AIRTABLE_ENT_FOTO_EVIDENCIA_URL no está definida en el entorno",
      },
      { status: 500 }
    );
  }

  // Validar que las keys pertenezcan al folder correcto
  for (const key of s3Keys) {
    if (!key.startsWith(S3_FOLDERS.ENTREGA_EPP + "/")) {
      return NextResponse.json(
        { success: false, message: "Key de S3 inválida" },
        { status: 400 }
      );
    }
  }

  // Generar URLs firmadas de lectura para Airtable (24h para que Airtable descargue)
  const signedUrls = await Promise.all(
    s3Keys.map((key) => getSignedUrlForKey(key, 86400))
  );

  const publicUrls = s3Keys.map(
    (key) => `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${key}`
  );

  // Guardar en Airtable
  const result = await saveUrlsToAirtable(entregaRecordId, signedUrls, fotoFieldId);

  if (!result.success) {
    return NextResponse.json({
      success: true,
      message: "Fotos subidas a S3 pero no se pudieron guardar en Airtable",
      urls: publicUrls,
      warning: true,
    });
  }

  return NextResponse.json({
    success: true,
    message: `${s3Keys.length} foto(s) de evidencia guardada(s) exitosamente`,
    urls: publicUrls,
  });
}

// ──────────────────────────────────────────────────────────
// Opción B: Subir archivos desde FormData (fallback)
// ──────────────────────────────────────────────────────────
async function handleFormDataUpload(req: NextRequest) {
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

    if (!/^rec[a-zA-Z0-9]{14}$/.test(entregaRecordId)) {
      return NextResponse.json(
        { success: false, message: "ID de entrega inválido" },
        { status: 400 }
      );
    }

    const fotoFieldId = getFotoFieldId();
    if (!fotoFieldId) {
      return NextResponse.json(
        {
          success: false,
          message: "Configuración faltante: AIRTABLE_ENT_FOTO_EVIDENCIA_URL no está definida en el entorno",
        },
        { status: 500 }
      );
    }

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
    const signedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const timestamp = Date.now();
      const filename = `foto-entrega-${entregaRecordId}-${i + 1}-${timestamp}.${ext}`;

      const s3Key = generateS3Key(S3_FOLDERS.ENTREGA_EPP, filename);
      const { url: s3Url, key } = await uploadToS3(s3Key, buffer, file.type);

      const presignedUrl = await getSignedUrlForKey(key, 86400);

      uploadedUrls.push(s3Url);
      signedUrls.push(presignedUrl);
      console.log(`Foto evidencia ${i + 1}/${files.length} subida a S3: ${s3Url}`);
    }

    // ── Guardar en Airtable ──
    const result = await saveUrlsToAirtable(entregaRecordId, signedUrls, fotoFieldId);

    if (!result.success) {
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
}

// ══════════════════════════════════════════════════════════
// PATCH /api/entregas-epp/foto-evidencia
// Reemplaza una sola foto en un índice específico, preservando las demás.
// También permite agregar fotos a slots vacíos.
// Body JSON: { entregaRecordId, index, s3Key }
// ══════════════════════════════════════════════════════════
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { entregaRecordId, index, s3Key } = body as {
      entregaRecordId: string;
      index: number;
      s3Key: string;
    };

    if (!entregaRecordId || !/^rec[a-zA-Z0-9]{14}$/.test(entregaRecordId)) {
      return NextResponse.json(
        { success: false, message: "ID de entrega inválido" },
        { status: 400 }
      );
    }

    if (typeof index !== "number" || index < 0 || index > 2) {
      return NextResponse.json(
        { success: false, message: "Índice inválido (0-2)" },
        { status: 400 }
      );
    }

    if (!s3Key || !s3Key.startsWith(S3_FOLDERS.ENTREGA_EPP + "/")) {
      return NextResponse.json(
        { success: false, message: "Key de S3 inválida" },
        { status: 400 }
      );
    }

    const { entregasTableId } = airtableSGSSTConfig;
    const fotoFieldId = getFotoFieldId();
    if (!fotoFieldId) {
      return NextResponse.json(
        {
          success: false,
          message: "Configuración faltante: AIRTABLE_ENT_FOTO_EVIDENCIA_URL no está definida en el entorno",
        },
        { status: 500 }
      );
    }

    // 1. Leer attachments actuales (returnFieldsByFieldId para usar field IDs)
    const getUrl = `${getSGSSTUrl(entregasTableId)}/${entregaRecordId}?returnFieldsByFieldId=true`;
    const getRes = await fetch(getUrl, { headers: getSGSSTHeaders() });
    if (!getRes.ok) {
      return NextResponse.json(
        { success: false, message: "No se pudo obtener la entrega" },
        { status: 500 }
      );
    }
    const record = await getRes.json();
    const currentAttachments: { id?: string; url: string }[] =
      Array.isArray(record.fields?.[fotoFieldId])
        ? record.fields[fotoFieldId]
        : [];

    // 2. Generar URL firmada de lectura para la nueva foto
    const newSignedUrl = await getSignedUrlForKey(s3Key, 86400);

    // 3. Construir array actualizado preservando las demás fotos
    // Para Airtable attachments: incluir "id" para preservar, solo "url" para nuevas
    const updatedAttachments: ({ id: string } | { url: string })[] = [];

    const maxIndex = Math.max(currentAttachments.length, index + 1);
    for (let i = 0; i < maxIndex; i++) {
      if (i === index) {
        // Reemplazar esta posición con la nueva foto
        updatedAttachments.push({ url: newSignedUrl });
      } else if (i < currentAttachments.length) {
        // Preservar foto existente usando su ID de Airtable
        const existing = currentAttachments[i];
        if (existing.id) {
          updatedAttachments.push({ id: existing.id });
        } else {
          updatedAttachments.push({ url: existing.url });
        }
      }
    }

    // 4. Guardar en Airtable
    const updateUrl = `${getSGSSTUrl(entregasTableId)}/${entregaRecordId}`;
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: getSGSSTHeaders(),
      body: JSON.stringify({
        fields: {
          [fotoFieldId]: updatedAttachments,
        },
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error("Error actualizando foto en Airtable:", errText);
      return NextResponse.json(
        { success: false, message: "Error al actualizar la foto en Airtable" },
        { status: 500 }
      );
    }

    const publicUrl = `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${s3Key}`;

    return NextResponse.json({
      success: true,
      message: "Foto actualizada exitosamente",
      url: publicUrl,
      index,
    });
  } catch (error) {
    console.error("Error en PATCH /api/entregas-epp/foto-evidencia:", error);
    return NextResponse.json(
      { success: false, message: "Error al actualizar la foto" },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────
// Guardar URLs firmadas en Airtable como attachments
// ──────────────────────────────────────────────────────────
async function saveUrlsToAirtable(
  entregaRecordId: string,
  signedUrls: string[],
  fotoFieldId: string
): Promise<{ success: boolean }> {
  const { entregasTableId } = airtableSGSSTConfig;
  const updateUrl = `${getSGSSTUrl(entregasTableId)}/${entregaRecordId}`;

  const updateRes = await fetch(updateUrl, {
    method: "PATCH",
    headers: getSGSSTHeaders(),
    body: JSON.stringify({
      fields: {
        [fotoFieldId]: signedUrls.map((url) => ({ url })),
      },
    }),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.error("Error actualizando Airtable con URLs de fotos:", errText);
    return { success: false };
  }

  await updateRes.json();
  return { success: true };
}
