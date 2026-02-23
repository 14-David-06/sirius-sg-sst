import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

// ══════════════════════════════════════════════════════════
// AES-256-CBC Encryption
// ══════════════════════════════════════════════════════════
const AES_SECRET = process.env.AES_SIGNATURE_SECRET || "";

function encryptAES(plaintext: string): string {
  // Derivar clave de 32 bytes desde el secreto
  const key = crypto.createHash("sha256").update(AES_SECRET).digest();
  // IV aleatorio de 16 bytes
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  // Retornar iv:encrypted en base64
  return iv.toString("base64") + ":" + encrypted;
}

// ══════════════════════════════════════════════════════════
// Tipos
// ══════════════════════════════════════════════════════════
type CondicionEPP = "B" | "R" | "M" | "NA" | null;

interface InspeccionEmpleadoPayload {
  empleadoId: string;
  idEmpleado: string;
  nombreCompleto: string;
  condiciones: Record<string, CondicionEPP>;
  observaciones: string;
  firma?: string; // Base64 data URL de la firma
}

interface InspeccionPayload {
  fechaInspeccion: string;
  inspector: string;
  inspecciones: InspeccionEmpleadoPayload[];
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
}

// Mapeo de nombres de condiciones a field IDs
const CONDICION_FIELD_MAP: Record<string, string> = {
  casco: airtableSGSSTConfig.detalleInspeccionFields.CASCO,
  proteccion_auditiva: airtableSGSSTConfig.detalleInspeccionFields.P_AUDITIVA,
  proteccion_visual: airtableSGSSTConfig.detalleInspeccionFields.P_VISUAL,
  proteccion_respiratoria: airtableSGSSTConfig.detalleInspeccionFields.P_RESPIRATORIA,
  ropa_trabajo: airtableSGSSTConfig.detalleInspeccionFields.ROPA,
  guantes: airtableSGSSTConfig.detalleInspeccionFields.GUANTES,
  botas_seguridad: airtableSGSSTConfig.detalleInspeccionFields.BOTAS,
  proteccion_caidas: airtableSGSSTConfig.detalleInspeccionFields.P_CAIDAS,
  otros: airtableSGSSTConfig.detalleInspeccionFields.OTROS,
};

/**
 * Genera un ID único para la inspección
 */
function generateInspeccionId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INSP-${year}${month}${day}-${random}`;
}

/**
 * POST /api/inspecciones-epp
 * Guarda una inspección de condición de EPP en Airtable.
 */
export async function POST(request: NextRequest) {
  try {
    const payload: InspeccionPayload = await request.json();

    // Validaciones básicas
    if (!payload.fechaInspeccion) {
      return NextResponse.json(
        { success: false, message: "La fecha de inspección es requerida" },
        { status: 400 }
      );
    }

    if (!payload.inspector) {
      return NextResponse.json(
        { success: false, message: "El inspector es requerido" },
        { status: 400 }
      );
    }

    if (!payload.inspecciones || payload.inspecciones.length === 0) {
      return NextResponse.json(
        { success: false, message: "Debe incluir al menos un empleado" },
        { status: 400 }
      );
    }

    const { inspeccionesFields, detalleInspeccionFields } = airtableSGSSTConfig;
    const inspeccionId = generateInspeccionId();

    console.log("Creando inspección EPP:", {
      id: inspeccionId,
      fecha: payload.fechaInspeccion,
      inspector: payload.inspector,
      cantidadEmpleados: payload.inspecciones.length,
    });

    // 1. Crear la cabecera de la inspección
    const cabeceraUrl = getSGSSTUrl(airtableSGSSTConfig.inspeccionesTableId);
    const cabeceraBody = {
      records: [
        {
          fields: {
            [inspeccionesFields.ID]: inspeccionId,
            [inspeccionesFields.FECHA]: payload.fechaInspeccion,
            [inspeccionesFields.INSPECTOR]: payload.inspector,
            [inspeccionesFields.ESTADO]: "Completada",
          },
        },
      ],
    };

    const cabeceraResponse = await fetch(cabeceraUrl, {
      method: "POST",
      headers: getSGSSTHeaders(),
      body: JSON.stringify(cabeceraBody),
    });

    if (!cabeceraResponse.ok) {
      const errorText = await cabeceraResponse.text();
      console.error("Error creando cabecera de inspección:", errorText);
      return NextResponse.json(
        { success: false, message: "Error al crear la inspección" },
        { status: 500 }
      );
    }

    const cabeceraData: AirtableResponse = await cabeceraResponse.json();
    const cabeceraRecordId = cabeceraData.records[0].id;

    // 2. Crear los detalles de inspección por empleado (en lotes de 10)
    const detalleUrl = getSGSSTUrl(airtableSGSSTConfig.detalleInspeccionTableId);
    const detalleRecords = payload.inspecciones.map((emp, index) => {
      const detalleId = `${inspeccionId}-${String(index + 1).padStart(2, "0")}`;
      
      // Construir los campos de condiciones
      const condicionFields: Record<string, string> = {};
      for (const [key, value] of Object.entries(emp.condiciones)) {
        const fieldId = CONDICION_FIELD_MAP[key];
        if (fieldId && value) {
          condicionFields[fieldId] = value;
        }
      }

      // Encriptar firma con AES-256-CBC si existe
      let firmaEncriptada: string | undefined;
      if (emp.firma && AES_SECRET) {
        const firmaPayload = JSON.stringify({
          signature: emp.firma,
          employee: emp.idEmpleado,
          name: emp.nombreCompleto,
          timestamp: new Date().toISOString(),
          inspeccionId: inspeccionId,
        });
        firmaEncriptada = encryptAES(firmaPayload);
      }

      return {
        fields: {
          [detalleInspeccionFields.ID]: detalleId,
          [detalleInspeccionFields.ID_EMPLEADO]: emp.idEmpleado,
          [detalleInspeccionFields.NOMBRE]: emp.nombreCompleto,
          [detalleInspeccionFields.OBSERVACIONES]: emp.observaciones || "",
          [detalleInspeccionFields.INSPECCION_LINK]: [cabeceraRecordId],
          ...(firmaEncriptada ? { [detalleInspeccionFields.FIRMA]: firmaEncriptada } : {}),
          ...condicionFields,
        },
      };
    });

    // Crear en lotes de 10 (límite de Airtable)
    const createdDetalleIds: string[] = [];
    for (let i = 0; i < detalleRecords.length; i += 10) {
      const batch = detalleRecords.slice(i, i + 10);
      
      const detalleResponse = await fetch(detalleUrl, {
        method: "POST",
        headers: getSGSSTHeaders(),
        body: JSON.stringify({ records: batch }),
      });

      if (!detalleResponse.ok) {
        const errorText = await detalleResponse.text();
        console.error("Error creando detalles de inspección:", errorText);
        // Continuar con los demás lotes aunque falle uno
      } else {
        const detalleData: AirtableResponse = await detalleResponse.json();
        createdDetalleIds.push(...detalleData.records.map((r) => r.id));
      }
    }

    // 3. Actualizar la cabecera con los enlaces a los detalles
    if (createdDetalleIds.length > 0) {
      const updateUrl = getSGSSTUrl(airtableSGSSTConfig.inspeccionesTableId);
      await fetch(updateUrl, {
        method: "PATCH",
        headers: getSGSSTHeaders(),
        body: JSON.stringify({
          records: [
            {
              id: cabeceraRecordId,
              fields: {
                [inspeccionesFields.DETALLE_LINK]: createdDetalleIds,
              },
            },
          ],
        }),
      });
    }

    console.log("Inspección EPP guardada exitosamente:", {
      id: inspeccionId,
      recordId: cabeceraRecordId,
      detalles: createdDetalleIds.length,
    });

    return NextResponse.json({
      success: true,
      message: "Inspección registrada correctamente",
      data: {
        id: inspeccionId,
        recordId: cabeceraRecordId,
        fecha: payload.fechaInspeccion,
        empleadosInspeccionados: createdDetalleIds.length,
      },
    });
  } catch (error) {
    console.error("Error en POST /api/inspecciones-epp:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inspecciones-epp
 * Lista las inspecciones de EPP desde Airtable.
 */
export async function GET() {
  try {
    const { inspeccionesFields } = airtableSGSSTConfig;
    const url = getSGSSTUrl(airtableSGSSTConfig.inspeccionesTableId);
    
    const params = new URLSearchParams({
      "sort[0][field]": inspeccionesFields.FECHA,
      "sort[0][direction]": "desc",
      maxRecords: "100",
      returnFieldsByFieldId: "true",
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      headers: getSGSSTHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error listando inspecciones:", errorText);
      return NextResponse.json(
        { success: false, message: "Error al consultar inspecciones" },
        { status: 500 }
      );
    }

    const data: AirtableResponse = await response.json();
    
    const inspecciones = data.records.map((record) => ({
      id: record.id,
      idInspeccion: record.fields[inspeccionesFields.ID] as string,
      fecha: record.fields[inspeccionesFields.FECHA] as string,
      inspector: record.fields[inspeccionesFields.INSPECTOR] as string,
      estado: record.fields[inspeccionesFields.ESTADO] as string,
      cantidadEmpleados: (record.fields[inspeccionesFields.DETALLE_LINK] as string[] || []).length,
    }));

    return NextResponse.json({
      success: true,
      data: inspecciones,
      total: inspecciones.length,
    });
  } catch (error) {
    console.error("Error en GET /api/inspecciones-epp:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
