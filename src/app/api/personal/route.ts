import { NextResponse } from "next/server";
import {
  airtableConfig,
  getAirtableUrl,
  getAirtableHeaders,
} from "@/infrastructure/config/airtable";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface PersonalItem {
  id: string;
  idEmpleado: string;
  nombreCompleto: string;
  numeroDocumento: string;
  tipoPersonal: string;
  estado: string;
  fotoPerfil: { url: string; filename: string } | null;
}

/**
 * GET /api/personal
 * Devuelve la lista de personal activo desde Sirius Nomina Core.
 */
export async function GET() {
  try {
    const { personalTableId, personalFields } = airtableConfig;
    const url = getAirtableUrl(personalTableId);
    const headers = getAirtableHeaders();

    // Excluir: CEO y Contratistas
    const filterFormula = `AND({Estado de Actividad} = 'Activo', {Tipo Personal} != 'Contratista', {Rol (from Rol)} != 'DIRECTOR EJECUTIVO (CEO) (Chief Executive Officer)')`;

    let allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({
        filterByFormula: filterFormula,
        pageSize: "100",
        returnFieldsByFieldId: "true",
      });
      if (offset) params.set("offset", offset);

      const response = await fetch(`${url}?${params.toString()}`, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Airtable personal error:", response.status, errorText);
        return NextResponse.json(
          { success: false, message: "Error al consultar personal" },
          { status: 500 }
        );
      }

      const data: AirtableListResponse = await response.json();
      allRecords = [...allRecords, ...data.records];
      offset = data.offset;
    } while (offset);

    const personal: PersonalItem[] = allRecords.map((record) => {
      const f = record.fields;
      const fotoArray = f[personalFields.FOTO_PERFIL] as
        | { url: string; filename: string }[]
        | undefined;

      return {
        id: record.id,
        idEmpleado: (f[personalFields.ID_EMPLEADO] as string) || "",
        nombreCompleto: (f[personalFields.NOMBRE_COMPLETO] as string) || "",
        numeroDocumento: (f[personalFields.NUMERO_DOCUMENTO] as string) || "",
        tipoPersonal: (f[personalFields.TIPO_PERSONAL] as string) || "",
        estado: (f[personalFields.ESTADO_ACTIVIDAD] as string) || "Activo",
        fotoPerfil: fotoArray?.[0]
          ? { url: fotoArray[0].url, filename: fotoArray[0].filename }
          : null,
      };
    });

    // Ordenar alfabéticamente
    personal.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

    return NextResponse.json({ success: true, data: personal, total: personal.length });
  } catch (error) {
    console.error("Error fetching personal:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
