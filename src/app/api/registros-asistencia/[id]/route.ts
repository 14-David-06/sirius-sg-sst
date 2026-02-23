import { NextRequest, NextResponse } from "next/server";
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
}

// ══════════════════════════════════════════════════════════
// GET /api/registros-asistencia/[id]
// Devuelve un registro de asistencia con sus asistentes
// ══════════════════════════════════════════════════════════
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { registroAsistenciaFields, detalleRegistroFields } = airtableSGSSTConfig;

    // 1. Fetch cabecera
    const cabeceraUrl = `${getSGSSTUrl(airtableSGSSTConfig.registroAsistenciaTableId)}/${id}?returnFieldsByFieldId=true`;
    const cabeceraResponse = await fetch(cabeceraUrl, {
      headers: getSGSSTHeaders(),
      cache: "no-store",
    });

    if (!cabeceraResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Registro no encontrado" },
        { status: 404 }
      );
    }

    const cabecera: AirtableRecord = await cabeceraResponse.json();
    const f = cabecera.fields;
    const detalleIds = (f[registroAsistenciaFields.DETALLE_LINK] as string[]) || [];

    // 2. Fetch asistentes si hay detalles
    let asistentes: Record<string, unknown>[] = [];
    if (detalleIds.length > 0) {
      const formula = `OR(${detalleIds.map((id) => `RECORD_ID()='${id}'`).join(",")})`;
      const detalleUrl = getSGSSTUrl(airtableSGSSTConfig.detalleRegistroTableId);
      const params = new URLSearchParams({
        filterByFormula: formula,
        pageSize: "100",
        returnFieldsByFieldId: "true",
      });

      const detalleResponse = await fetch(`${detalleUrl}?${params.toString()}`, {
        headers: getSGSSTHeaders(),
        cache: "no-store",
      });

      if (detalleResponse.ok) {
        const detalleData: AirtableListResponse = await detalleResponse.json();
        asistentes = detalleData.records.map((record, idx) => ({
          id: record.id,
          item: idx + 1,
          idEmpleado:    record.fields[detalleRegistroFields.ID_EMPLEADO] as string,
          nombre:        record.fields[detalleRegistroFields.NOMBRE] as string,
          cedula:        record.fields[detalleRegistroFields.CEDULA] as string,
          labor:         record.fields[detalleRegistroFields.LABOR] as string,
          tieneFirma:    !!(record.fields[detalleRegistroFields.FIRMA] as string),
          firmaEncriptada: record.fields[detalleRegistroFields.FIRMA] as string | undefined,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: cabecera.id,
        idRegistro:          f[registroAsistenciaFields.ID_REGISTRO] as string,
        nombreEvento:        f[registroAsistenciaFields.NOMBRE_EVENTO] as string,
        ciudad:              f[registroAsistenciaFields.CIUDAD] as string,
        fecha:               f[registroAsistenciaFields.FECHA] as string,
        horaInicio:          f[registroAsistenciaFields.HORA_INICIO] as string,
        lugar:               f[registroAsistenciaFields.LUGAR] as string,
        duracion:            f[registroAsistenciaFields.DURACION] as string,
        area:                f[registroAsistenciaFields.AREA] as string,
        tipo:                f[registroAsistenciaFields.TIPO] as string,
        temasTratados:       f[registroAsistenciaFields.TEMAS_TRATADOS] as string,
        nombreConferencista: f[registroAsistenciaFields.NOMBRE_CONFERENCISTA] as string,
        tieneConferencista:  !!(f[registroAsistenciaFields.FIRMA_CONFERENCISTA] as string),
        estado:              f[registroAsistenciaFields.ESTADO] as string,
        asistentes,
      },
    });
  } catch (error) {
    console.error("Error en GET /api/registros-asistencia/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
