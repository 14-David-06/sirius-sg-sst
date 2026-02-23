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

interface AirtableResponse {
  records: AirtableRecord[];
}

// Mapeo inverso de field IDs a nombres de categorías
const FIELD_TO_CATEGORIA: Record<string, string> = {
  [airtableSGSSTConfig.detalleInspeccionFields.CASCO]: "casco",
  [airtableSGSSTConfig.detalleInspeccionFields.P_AUDITIVA]: "proteccion_auditiva",
  [airtableSGSSTConfig.detalleInspeccionFields.P_VISUAL]: "proteccion_visual",
  [airtableSGSSTConfig.detalleInspeccionFields.P_RESPIRATORIA]: "proteccion_respiratoria",
  [airtableSGSSTConfig.detalleInspeccionFields.ROPA]: "ropa_trabajo",
  [airtableSGSSTConfig.detalleInspeccionFields.GUANTES]: "guantes",
  [airtableSGSSTConfig.detalleInspeccionFields.BOTAS]: "botas_seguridad",
  [airtableSGSSTConfig.detalleInspeccionFields.P_CAIDAS]: "proteccion_caidas",
  [airtableSGSSTConfig.detalleInspeccionFields.OTROS]: "otros",
};

/**
 * GET /api/inspecciones-epp/[id]
 * Obtiene el detalle de una inspección específica incluyendo todos los empleados inspeccionados.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { inspeccionesFields, detalleInspeccionFields } = airtableSGSSTConfig;

    // 1. Obtener la cabecera de la inspección
    const cabeceraUrl = `${getSGSSTUrl(airtableSGSSTConfig.inspeccionesTableId)}/${id}?returnFieldsByFieldId=true`;
    
    const cabeceraResponse = await fetch(cabeceraUrl, {
      method: "GET",
      headers: getSGSSTHeaders(),
      cache: "no-store",
    });

    if (!cabeceraResponse.ok) {
      if (cabeceraResponse.status === 404) {
        return NextResponse.json(
          { success: false, message: "Inspección no encontrada" },
          { status: 404 }
        );
      }
      const errorText = await cabeceraResponse.text();
      console.error("Error obteniendo inspección:", errorText);
      return NextResponse.json(
        { success: false, message: "Error al obtener la inspección" },
        { status: 500 }
      );
    }

    const cabeceraData: AirtableRecord = await cabeceraResponse.json();
    const detalleIds = cabeceraData.fields[inspeccionesFields.DETALLE_LINK] as string[] || [];

    // 2. Obtener los detalles de cada empleado
    const detalles: {
      id: string;
      idDetalle: string;
      idEmpleado: string;
      nombreEmpleado: string;
      observaciones: string;
      condiciones: Record<string, string | null>;
      firmaHash?: string; // Hash AES-256-CBC de la firma
    }[] = [];

    if (detalleIds.length > 0) {
      // Construir formula para obtener todos los detalles
      const filterFormula = `OR(${detalleIds.map((id) => `RECORD_ID()='${id}'`).join(",")})`;
      
      const detalleUrl = getSGSSTUrl(airtableSGSSTConfig.detalleInspeccionTableId);
      const params = new URLSearchParams({
        filterByFormula: filterFormula,
        maxRecords: "100",
        returnFieldsByFieldId: "true",
      });

      const detalleResponse = await fetch(`${detalleUrl}?${params.toString()}`, {
        method: "GET",
        headers: getSGSSTHeaders(),
        cache: "no-store",
      });

      if (detalleResponse.ok) {
        const detalleData: AirtableResponse = await detalleResponse.json();
        
        for (const record of detalleData.records) {
          const f = record.fields;
          
          // Extraer condiciones de los campos
          const condiciones: Record<string, string | null> = {};
          for (const [fieldId, categoria] of Object.entries(FIELD_TO_CATEGORIA)) {
            condiciones[categoria] = (f[fieldId] as string) || null;
          }

          // Extraer firma encriptada
          const firmaHash = (f[detalleInspeccionFields.FIRMA] as string) || undefined;

          detalles.push({
            id: record.id,
            idDetalle: (f[detalleInspeccionFields.ID] as string) || "",
            idEmpleado: (f[detalleInspeccionFields.ID_EMPLEADO] as string) || "",
            nombreEmpleado: (f[detalleInspeccionFields.NOMBRE] as string) || "",
            observaciones: (f[detalleInspeccionFields.OBSERVACIONES] as string) || "",
            condiciones,
            firmaHash,
          });
        }
      }
    }

    // Ordenar detalles por nombre
    detalles.sort((a, b) => a.nombreEmpleado.localeCompare(b.nombreEmpleado));

    return NextResponse.json({
      success: true,
      data: {
        id: cabeceraData.id,
        idInspeccion: cabeceraData.fields[inspeccionesFields.ID] as string,
        fecha: cabeceraData.fields[inspeccionesFields.FECHA] as string,
        inspector: cabeceraData.fields[inspeccionesFields.INSPECTOR] as string,
        estado: cabeceraData.fields[inspeccionesFields.ESTADO] as string,
        empleados: detalles,
        totalEmpleados: detalles.length,
      },
    });
  } catch (error) {
    console.error("Error en GET /api/inspecciones-epp/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
