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
 * Devuelve el catálogo de Capacitaciones (temas) ordenados por código ascendente.
 * Los registros se usan para pre-llenar el formulario de registro de asistencia.
 */
export async function GET() {
  try {
    const { capacitacionesTableId, capacitacionesFields: f } = airtableSGSSTConfig;
    const headers = getSGSSTHeaders();
    const all: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({
        pageSize: "100",
        returnFieldsByFieldId: "true",
        "sort[0][field]": f.CODIGO,
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
        throw new Error("Error al consultar el catálogo de capacitaciones");
      }

      const data: AirtableListResponse = await res.json();
      all.push(...data.records);
      offset = data.offset;
    } while (offset);

    const result = all.map((r) => {
      const fields = r.fields;
      return {
        id:         r.id,
        codigo:     (fields[f.CODIGO]     as string) || "",
        nombre:     (fields[f.NOMBRE]     as string) || "",
        intensidad: (fields[f.INTENSIDAD] as string) || "",
        tipo:       (fields[f.TIPO]       as string) || "",
      };
    });

    return NextResponse.json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error("Error fetching capacitaciones:", error);
    return NextResponse.json(
      { success: false, message: "Error al consultar el catálogo de capacitaciones" },
      { status: 500 }
    );
  }
}
