// ══════════════════════════════════════════════════════════
// API: Obtener una política específica por ID
// GET /api/politicas/[id]
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const url = `${getSGSSTUrl(airtableSGSSTConfig.politicasTableId)}/${id}`;

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
      codigo: data.fields["Código"] || "",
      titulo: data.fields["Título"] || "",
      descripcion: data.fields["Descripción"] || "",
      categoria: data.fields["Categoría"] || "",
      version: data.fields["Versión"] || "1.0",
      fechaPublicacion: data.fields["Fecha Publicación"] || "",
      fechaVigencia: data.fields["Fecha Vigencia"] || "",
      estado: data.fields["Estado"] || "",
      urlDocumento: data.fields["URL Documento S3"] || "",
      requiereFirma: data.fields["Requiere Firma"] || false,
      orden: data.fields["Orden Visualización"] || 0,
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
