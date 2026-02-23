import { NextRequest, NextResponse } from "next/server";
import {
  airtableConfig,
  getAirtableUrl,
  getAirtableHeaders,
} from "@/infrastructure/config/airtable";

const APP_CODE_REQUIRED = "SIRIUS-APP-0003";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
}

/**
 * Busca el record ID de una app en la tabla Sistemas por su código.
 * Retorna null si no se encuentra.
 */
async function getSistemaRecordId(codigoApp: string): Promise<string | null> {
  const { sistemasTableId, sistemasFields } = airtableConfig;
  const url = getAirtableUrl(sistemasTableId);
  const headers = getAirtableHeaders();

  const params = new URLSearchParams({
    filterByFormula: `{${sistemasFields.CODIGO_APP}} = '${codigoApp}'`,
    maxRecords: "1",
    returnFieldsByFieldId: "true",
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data: AirtableListResponse = await response.json();
  return data.records[0]?.id ?? null;
}

/**
 * POST /api/personal/validar
 * Valida que un número de documento (cédula) existe, está activo
 * y tiene acceso a SIRIUS-APP-0003.
 */
export async function POST(request: NextRequest) {
  try {
    const { documento } = await request.json();

    if (!documento || typeof documento !== "string") {
      return NextResponse.json(
        { success: false, message: "Número de documento requerido" },
        { status: 400 }
      );
    }

    const documentoLimpio = documento.replace(/\D/g, "");

    if (documentoLimpio.length < 6) {
      return NextResponse.json(
        { success: false, message: "Documento inválido" },
        { status: 400 }
      );
    }

    const { personalTableId, personalFields } = airtableConfig;
    const headers = getAirtableHeaders();

    const filterFormula = `AND(
      {${personalFields.ESTADO_ACTIVIDAD}} = 'Activo',
      TRIM({${personalFields.NUMERO_DOCUMENTO}}) = '${documentoLimpio}'
    )`;

    const params = new URLSearchParams({
      filterByFormula: filterFormula,
      maxRecords: "1",
      returnFieldsByFieldId: "true",
    });

    // Buscar empleado y record ID de la app en paralelo
    const [response, appRecordId] = await Promise.all([
      fetch(`${getAirtableUrl(personalTableId)}?${params.toString()}`, {
        headers,
        cache: "no-store",
      }),
      getSistemaRecordId(APP_CODE_REQUIRED),
    ]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Airtable validar error:", response.status, errorText);
      return NextResponse.json(
        { success: false, message: "Error al validar documento" },
        { status: 500 }
      );
    }

    const data: AirtableListResponse = await response.json();

    if (data.records.length === 0) {
      return NextResponse.json(
        { success: false, message: "No se encontró un empleado activo con ese documento" },
        { status: 404 }
      );
    }

    const record = data.records[0];
    const f = record.fields;

    // Verificar acceso a SIRIUS-APP-0003
    const accesosIds = (f[personalFields.ACCESOS_ASIGNADOS] as string[]) || [];
    if (!appRecordId || !accesosIds.includes(appRecordId)) {
      return NextResponse.json(
        { success: false, message: "El empleado no tiene acceso a esta aplicación" },
        { status: 403 }
      );
    }

    const fotoArray = f[personalFields.FOTO_PERFIL] as
      | { url: string; filename: string }[]
      | undefined;

    // Resolver nombre del rol desde tabla "Roles y Permisos"
    let rolNombre = "";
    const rolIds = f[personalFields.ROL] as string[] | undefined;
    if (rolIds && rolIds.length > 0) {
      try {
        const rolUrl = `${airtableConfig.baseUrl}/${airtableConfig.baseId}/${airtableConfig.rolesTableId}/${rolIds[0]}?returnFieldsByFieldId=true`;
        const rolResponse = await fetch(rolUrl, { headers });
        if (rolResponse.ok) {
          const rolData = await rolResponse.json();
          rolNombre = (rolData.fields?.[airtableConfig.rolesFields.NOMBRE_ROL] as string) || "";
        }
      } catch (e) {
        console.error("Error resolviendo rol:", e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        idEmpleado: (f[personalFields.ID_EMPLEADO] as string) || "",
        nombreCompleto: (f[personalFields.NOMBRE_COMPLETO] as string) || "",
        numeroDocumento: (f[personalFields.NUMERO_DOCUMENTO] as string) || "",
        tipoPersonal: (f[personalFields.TIPO_PERSONAL] as string) || "",
        rol: rolNombre,
        fotoPerfil: fotoArray?.[0]
          ? { url: fotoArray[0].url, filename: fotoArray[0].filename }
          : null,
      },
    });
  } catch (error) {
    console.error("Error validando documento:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
