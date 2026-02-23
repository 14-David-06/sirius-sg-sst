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
 * GET /api/equipos-emergencia
 * Devuelve la lista de equipos de emergencia activos.
 */
export async function GET() {
  try {
    const { equiposFields } = airtableSGSSTConfig;
    const url = getSGSSTUrl(airtableSGSSTConfig.equiposTableId);

    let allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({
        filterByFormula: `{Estado} = 'Activo'`,
        pageSize: "100",
        returnFieldsByFieldId: "true",
        "sort[0][field]": equiposFields.AREA,
        "sort[0][direction]": "asc",
        "sort[1][field]": equiposFields.CATEGORIA,
        "sort[1][direction]": "asc",
      });
      if (offset) params.set("offset", offset);

      const response = await fetch(`${url}?${params.toString()}`, {
        method: "GET",
        headers: getSGSSTHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error listando equipos:", errorText);
        return NextResponse.json(
          { success: false, message: "Error al consultar equipos" },
          { status: 500 }
        );
      }

      const data: AirtableListResponse = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
    } while (offset);

    const equipos = allRecords.map((record) => ({
      id: record.id,
      codigo: (record.fields[equiposFields.CODIGO] as string) || "",
      nombre: (record.fields[equiposFields.NOMBRE] as string) || "",
      categoria: (record.fields[equiposFields.CATEGORIA] as string) || "",
      tipoEspecifico: (record.fields[equiposFields.TIPO_ESPECIFICO] as string) || "",
      area: (record.fields[equiposFields.AREA] as string) || "",
      ubicacion: (record.fields[equiposFields.UBICACION] as string) || "",
      capacidad: (record.fields[equiposFields.CAPACIDAD] as string) || "",
      fechaVencimiento: (record.fields[equiposFields.FECHA_VENCIMIENTO] as string) || null,
      estado: (record.fields[equiposFields.ESTADO] as string) || "",
      descripcion: (record.fields[equiposFields.DESCRIPCION] as string) || "",
    }));

    return NextResponse.json({
      success: true,
      data: equipos,
      total: equipos.length,
    });
  } catch (error) {
    console.error("Error en GET /api/equipos-emergencia:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
