// ══════════════════════════════════════════════════════════
// API: Obtener una política específica por ID
// GET /api/politicas/[id]
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

const F = airtableSGSSTConfig.politicasFields;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const url = `${getSGSSTUrl(airtableSGSSTConfig.politicasTableId)}/${id}?returnFieldsByFieldId=true`;

    const response = await fetch(url, {
      method: "GET",
      headers: getSGSSTHeaders(),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Política no encontrada" },
        { status: 404 }
      );
    }

    const data = await response.json();

    const politica = {
      id: data.id,
      codigo: data.fields[F.CODIGO] || "",
      titulo: data.fields[F.TITULO] || "",
      descripcion: data.fields[F.DESCRIPCION] || "",
      categoria: data.fields[F.CATEGORIA] || "",
      version: data.fields[F.VERSION] || "1.0",
      fechaPublicacion: data.fields[F.FECHA_PUBLICACION] || "",
      fechaVigencia: data.fields[F.FECHA_VIGENCIA] || "",
      estado: data.fields[F.ESTADO] || "",
      urlDocumento: data.fields[F.URL_DOCUMENTO_S3] || "",
      requiereFirma: data.fields[F.REQUIERE_FIRMA] || false,
      orden: data.fields[F.ORDEN_VISUALIZACION] || 0,
    };

    return NextResponse.json({ success: true, data: politica });
  } catch (error) {
    console.error("Error en GET /api/politicas/[id]:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
