// ══════════════════════════════════════════════════════════
// API: Políticas Empresariales
// GET: Listar políticas visibles para colaboradores
// POST: Crear nueva política (solo admin)
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";
import { uploadToS3 } from "@/infrastructure/config/awsS3";

const F = airtableSGSSTConfig.politicasFields;

// ─── GET: Listar políticas activas y visibles ────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoria = searchParams.get("categoria");
    const incluirInactivas = searchParams.get("incluirInactivas") === "true";

    // Obtener TODAS las políticas y filtrar en código (field IDs no funcionan en fórmulas)
    const url = `${getSGSSTUrl(airtableSGSSTConfig.politicasTableId)}?returnFieldsByFieldId=true`;

    const response = await fetch(url, {
      method: "GET",
      headers: getSGSSTHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error Airtable:", errorData);
      return NextResponse.json(
        { success: false, error: "Error al obtener políticas" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Filtrar en código
    let recordsFiltrados = data.records.filter((record: any) => {
      // Visible colaboradores = true
      if (record.fields[F.VISIBLE_COLABORADORES] !== true) return false;

      // Estado = Activa (si no incluir inactivas)
      if (!incluirInactivas && record.fields[F.ESTADO] !== "Activa") return false;

      // Categoría (si se especificó)
      if (categoria && record.fields[F.CATEGORIA] !== categoria) return false;

      return true;
    });

    // Ordenar por ORDEN_VISUALIZACION
    recordsFiltrados.sort((a: any, b: any) => {
      const ordenA = a.fields[F.ORDEN_VISUALIZACION] || 0;
      const ordenB = b.fields[F.ORDEN_VISUALIZACION] || 0;
      return ordenA - ordenB;
    });

    const politicas = recordsFiltrados.map((record: any) => ({
      id: record.id,
      codigo: record.fields[F.CODIGO] || "",
      titulo: record.fields[F.TITULO] || "",
      descripcion: record.fields[F.DESCRIPCION] || "",
      categoria: record.fields[F.CATEGORIA] || "",
      version: record.fields[F.VERSION] || "1.0",
      fechaPublicacion: record.fields[F.FECHA_PUBLICACION] || "",
      fechaVigencia: record.fields[F.FECHA_VIGENCIA] || "",
      estado: record.fields[F.ESTADO] || "",
      urlDocumento: record.fields[F.URL_DOCUMENTO_S3] || "",
      requiereFirma: record.fields[F.REQUIERE_FIRMA] || false,
      orden: record.fields[F.ORDEN_VISUALIZACION] || 0,
    }));

    return NextResponse.json({ success: true, data: politicas });
  } catch (error) {
    console.error("Error en GET /api/politicas:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ─── POST: Crear nueva política ───────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const codigo = formData.get("codigo") as string;
    const titulo = formData.get("titulo") as string;
    const descripcion = formData.get("descripcion") as string;
    const categoria = formData.get("categoria") as string;
    const version = formData.get("version") as string || "v001";
    const fechaPublicacion = formData.get("fechaPublicacion") as string;
    const fechaVigencia = formData.get("fechaVigencia") as string;
    const requiereFirma = formData.get("requiereFirma") === "true";
    const visibleColaboradores = formData.get("visibleColaboradores") === "true";
    const orden = parseInt(formData.get("orden") as string || "0");
    const creadoPor = formData.get("creadoPor") as string;
    const archivo = formData.get("archivo") as File;

    // Validaciones
    if (!codigo || !titulo || !categoria || !archivo) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Subir PDF a S3
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const s3Key = `politicas/${codigo.replace(/\s+/g, "-").toLowerCase()}-${version}.pdf`;

    const { url: urlDocumento } = await uploadToS3(s3Key, buffer, "application/pdf");

    // Crear registro en Airtable
    const payload = {
      records: [
        {
          fields: {
            [F.CODIGO]: codigo,
            [F.TITULO]: titulo,
            [F.DESCRIPCION]: descripcion,
            [F.CATEGORIA]: categoria,
            [F.VERSION]: version,
            [F.FECHA_PUBLICACION]: fechaPublicacion,
            [F.FECHA_VIGENCIA]: fechaVigencia,
            [F.ESTADO]: "Activa",
            [F.URL_DOCUMENTO_S3]: urlDocumento,
            [F.REQUIERE_FIRMA]: requiereFirma,
            [F.VISIBLE_COLABORADORES]: visibleColaboradores,
            [F.ORDEN_VISUALIZACION]: orden,
            [F.CREADO_POR]: creadoPor,
            [F.FECHA_CREACION]: new Date().toISOString(),
          },
        },
      ],
    };

    const response = await fetch(getSGSSTUrl(airtableSGSSTConfig.politicasTableId), {
      method: "POST",
      headers: getSGSSTHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error Airtable:", errorData);
      return NextResponse.json(
        { success: false, error: "Error al crear política" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const created = data.records[0];

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        codigo: created.fields[F.CODIGO],
        titulo: created.fields[F.TITULO],
        urlDocumento: created.fields[F.URL_DOCUMENTO_S3],
      },
    });
  } catch (error) {
    console.error("Error en POST /api/politicas:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
