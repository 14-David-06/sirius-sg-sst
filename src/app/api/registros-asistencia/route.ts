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
  const key = crypto.createHash("sha256").update(AES_SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

// ══════════════════════════════════════════════════════════
// Tipos
// ══════════════════════════════════════════════════════════
interface AsistentePayload {
  empleadoId: string;
  idEmpleado: string;
  nombreCompleto: string;
  cedula: string;
  labor: string;
  firma?: string;
}

interface RegistroPayload {
  nombreEvento: string;
  ciudad: string;
  fecha: string;
  horaInicio: string;
  lugar: string;
  duracion: string;
  area: string;
  tipo: string;
  temasTratados: string;
  nombreConferencista: string;
  asistentes: AsistentePayload[];
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
}

// ══════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════
function generateRegistroId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REG-ASIS-${year}${month}${day}-${random}`;
}

// ══════════════════════════════════════════════════════════
// POST /api/registros-asistencia
// Crea el registro de asistencia con sus asistentes
// ══════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const payload: RegistroPayload = await request.json();

    if (!payload.nombreEvento) {
      return NextResponse.json(
        { success: false, message: "El nombre del evento es requerido" },
        { status: 400 }
      );
    }
    if (!payload.fecha) {
      return NextResponse.json(
        { success: false, message: "La fecha del evento es requerida" },
        { status: 400 }
      );
    }
    if (!payload.asistentes || payload.asistentes.length === 0) {
      return NextResponse.json(
        { success: false, message: "Debe incluir al menos un asistente" },
        { status: 400 }
      );
    }

    const { registroAsistenciaFields, detalleRegistroFields } = airtableSGSSTConfig;
    const registroId = generateRegistroId();

    // 1. Crear la cabecera del registro
    const cabeceraUrl = getSGSSTUrl(airtableSGSSTConfig.registroAsistenciaTableId);
    const cabeceraBody = {
      records: [
        {
          fields: {
            [registroAsistenciaFields.ID_REGISTRO]:    registroId,
            [registroAsistenciaFields.NOMBRE_EVENTO]:  payload.nombreEvento,
            [registroAsistenciaFields.CIUDAD]:         payload.ciudad || "",
            [registroAsistenciaFields.FECHA]:          payload.fecha,
            [registroAsistenciaFields.HORA_INICIO]:    payload.horaInicio || "",
            [registroAsistenciaFields.LUGAR]:          payload.lugar || "",
            [registroAsistenciaFields.DURACION]:       payload.duracion || "",
            [registroAsistenciaFields.AREA]:           payload.area || "",
            [registroAsistenciaFields.TIPO]:           payload.tipo || "",
            [registroAsistenciaFields.TEMAS_TRATADOS]: payload.temasTratados || "",
            [registroAsistenciaFields.NOMBRE_CONFERENCISTA]: payload.nombreConferencista || "",
            [registroAsistenciaFields.ESTADO]:         "Borrador",
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
      console.error("Error creando cabecera de registro:", errorText);
      return NextResponse.json(
        { success: false, message: "Error al crear el registro de asistencia" },
        { status: 500 }
      );
    }

    const cabeceraData: AirtableResponse = await cabeceraResponse.json();
    const cabeceraRecordId = cabeceraData.records[0].id;

    // 2. Crear los registros de detalle por asistente (en lotes de 10)
    const detalleUrl = getSGSSTUrl(airtableSGSSTConfig.detalleRegistroTableId);

    const detalleRecords = payload.asistentes.map((asistente) => {
      let firmaEncriptada: string | undefined;
      if (asistente.firma && AES_SECRET) {
        const firmaPayload = JSON.stringify({
          signature: asistente.firma,
          employee: asistente.idEmpleado,
          name: asistente.nombreCompleto,
          timestamp: new Date().toISOString(),
          registroId,
        });
        firmaEncriptada = encryptAES(firmaPayload);
      }

      return {
        fields: {
          [detalleRegistroFields.ID_EMPLEADO]:   asistente.idEmpleado,
          [detalleRegistroFields.NOMBRE]:        asistente.nombreCompleto,
          [detalleRegistroFields.CEDULA]:        asistente.cedula,
          [detalleRegistroFields.LABOR]:         asistente.labor,
          [detalleRegistroFields.REGISTRO_LINK]: [cabeceraRecordId],
          ...(firmaEncriptada ? { [detalleRegistroFields.FIRMA]: firmaEncriptada } : {}),
        },
      };
    });

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
        console.error("Error creando detalles de registro:", errorText);
      } else {
        const detalleData: AirtableResponse = await detalleResponse.json();
        createdDetalleIds.push(...detalleData.records.map((r) => r.id));
      }
    }

    // 3. Actualizar la cabecera con los enlaces a los detalles
    if (createdDetalleIds.length > 0) {
      await fetch(cabeceraUrl, {
        method: "PATCH",
        headers: getSGSSTHeaders(),
        body: JSON.stringify({
          records: [
            {
              id: cabeceraRecordId,
              fields: {
                [registroAsistenciaFields.DETALLE_LINK]: createdDetalleIds,
              },
            },
          ],
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Registro de asistencia creado correctamente",
      data: {
        id: registroId,
        recordId: cabeceraRecordId,
        fecha: payload.fecha,
        asistentes: createdDetalleIds.length,
        detalleIds: createdDetalleIds,
      },
    });
  } catch (error) {
    console.error("Error en POST /api/registros-asistencia:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════
// GET /api/registros-asistencia
// Lista todos los registros de asistencia
// ══════════════════════════════════════════════════════════
export async function GET() {
  try {
    const { registroAsistenciaFields } = airtableSGSSTConfig;
    const url = getSGSSTUrl(airtableSGSSTConfig.registroAsistenciaTableId);

    const params = new URLSearchParams({
      "sort[0][field]":     registroAsistenciaFields.FECHA,
      "sort[0][direction]": "desc",
      maxRecords:           "100",
      returnFieldsByFieldId: "true",
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      headers: getSGSSTHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error listando registros de asistencia:", errorText);
      return NextResponse.json(
        { success: false, message: "Error al consultar los registros" },
        { status: 500 }
      );
    }

    const data: AirtableResponse = await response.json();

    const registros = data.records.map((record) => ({
      id: record.id,
      idRegistro:          record.fields[registroAsistenciaFields.ID_REGISTRO] as string,
      nombreEvento:        record.fields[registroAsistenciaFields.NOMBRE_EVENTO] as string,
      ciudad:              record.fields[registroAsistenciaFields.CIUDAD] as string,
      fecha:               record.fields[registroAsistenciaFields.FECHA] as string,
      horaInicio:          record.fields[registroAsistenciaFields.HORA_INICIO] as string,
      lugar:               record.fields[registroAsistenciaFields.LUGAR] as string,
      duracion:            record.fields[registroAsistenciaFields.DURACION] as string,
      area:                record.fields[registroAsistenciaFields.AREA] as string,
      tipo:                record.fields[registroAsistenciaFields.TIPO] as string,
      temasTratados:       record.fields[registroAsistenciaFields.TEMAS_TRATADOS] as string,
      nombreConferencista: record.fields[registroAsistenciaFields.NOMBRE_CONFERENCISTA] as string,
      estado:              record.fields[registroAsistenciaFields.ESTADO] as string,
      cantidadAsistentes:  (record.fields[registroAsistenciaFields.DETALLE_LINK] as string[] || []).length,
    }));

    return NextResponse.json({
      success: true,
      data: registros,
      total: registros.length,
    });
  } catch (error) {
    console.error("Error en GET /api/registros-asistencia:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
