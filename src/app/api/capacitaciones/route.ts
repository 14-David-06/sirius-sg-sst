import { NextResponse } from "next/server";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

/**
 * GET /api/capacitaciones
 * Devuelve todas las capacitaciones/actividades SST ordenadas por nombre.
 */
export async function GET() {
  try {
    const { capacitacionesTableId, capacitacionesFields } = airtableSGSSTConfig;
    const headers = getSGSSTHeaders();
    const all: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({
        pageSize: "100",
        returnFieldsByFieldId: "true",
        "sort[0][field]": capacitacionesFields.NOMBRE,
        "sort[0][direction]": "asc",
      });
      if (offset) params.set("offset", offset);

      const res = await fetch(
        `${getSGSSTUrl(capacitacionesTableId)}?${params.toString()}`,
        { headers }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("Error fetching capacitaciones:", res.status, err);
        throw new Error("Error al consultar capacitaciones");
      }

      const data: AirtableListResponse = await res.json();
      all.push(...data.records);
      offset = data.offset;
    } while (offset);

    const result = all.map((r) => ({
      id: r.id,
      nombre: (r.fields[capacitacionesFields.NOMBRE] as string) || "",
    }));

    return NextResponse.json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error("Error fetching capacitaciones:", error);
    return NextResponse.json(
      { success: false, message: "Error al consultar capacitaciones" },
      { status: 500 }
    );
  }
}
