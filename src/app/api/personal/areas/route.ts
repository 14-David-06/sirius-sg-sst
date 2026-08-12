// ══════════════════════════════════════════════════════════
// GET /api/personal/areas — Catálogo de áreas de Sirius Nómina Core
//
// El campo "Areas" de la tabla Personal es un link y devuelve recIDs.
// Este endpoint expone el catálogo con sus nombres legibles para que la
// UI pueda mostrarlos y resolver el área de un colaborador.
// ══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { airtableConfig } from "@/infrastructure/config/airtable";
import { requireAuth } from "@/lib/authMiddleware";

export const dynamic = "force-dynamic";

interface AreaResponse {
  recordId: string;
  codigo: string;
  nombre: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { areasTableId, areasFields, baseId, baseUrl, apiToken } = airtableConfig;
    const params = new URLSearchParams({
      returnFieldsByFieldId: "true",
      pageSize: "100",
    });
    params.append("fields[]", areasFields.CODIGO_AREA);
    params.append("fields[]", areasFields.NOMBRE_AREA);

    const res = await fetch(
      `${baseUrl}/${baseId}/${areasTableId}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${apiToken}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const detalle = await res.text();
      console.error("[personal/areas] Airtable:", res.status, detalle);
      return NextResponse.json(
        { success: false, message: "Error al consultar el catálogo de áreas" },
        { status: 500 }
      );
    }

    const data = (await res.json()) as {
      records: { id: string; fields: Record<string, unknown> }[];
    };

    const areas: AreaResponse[] = data.records
      .map((r) => ({
        recordId: r.id,
        codigo: String(r.fields[areasFields.CODIGO_AREA] ?? ""),
        nombre: String(r.fields[areasFields.NOMBRE_AREA] ?? ""),
      }))
      .filter((a) => a.nombre !== "")
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    return NextResponse.json({ success: true, data: areas, total: areas.length });
  } catch (e) {
    console.error("[personal/areas] error:", e);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
