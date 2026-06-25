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

    let filterFormula = `AND({Visible Colaboradores} = 1`;

    if (!incluirInactivas) {
      filterFormula += `, {Estado} = "Activa"`;
    }

    if (categoria) {
      filterFormula += `, {Categoría} = "${categoria}"`;
    }

    filterFormula += ")";

    const url = `${getSGSSTUrl(airtableSGSSTConfig.politicasTableId)}?filterByFormula=${encodeURIComponent(filterFormula)}&sort[0][field]=Orden Visualización&sort[0][direction]=asc`;

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

    const politicas = data.records.map((record: any) => ({
      id: record.id,
      codigo: record.fields["Código"] || "",
      titulo: record.fields["Título"] || "",
      descripcion: record.fields["Descripción"] || "",
      categoria: record.fields["Categoría"] || "",
      version: record.fields["Versión"] || "1.0",
      fechaPublicacion: record.fields["Fecha Publicación"] || "",
      fechaVigencia: record.fields["Fecha Vigencia"] || "",
      estado: record.fields["Estado"] || "",
      urlDocumento: record.fields["URL Documento S3"] || "",
      requiereFirma: record.fields["Requiere Firma"] || false,
      orden: record.fields["Orden Visualización"] || 0,
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
