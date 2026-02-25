import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";
import { verifySigningToken } from "@/lib/signingToken";

// ── AES-256-CBC Encryption ──────────────────────────────
const AES_SECRET = process.env.AES_SIGNATURE_SECRET || "";

function encryptAES(plaintext: string): string {
  const key = crypto.createHash("sha256").update(AES_SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

/**
 * GET /api/registros-asistencia/firmar-publico?t=TOKEN
 * Verifica el token y retorna info del evento (para mostrar en la página pública).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.json({ success: false, message: "Token requerido" }, { status: 400 });
  }

  const payload = verifySigningToken(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Enlace inválido o expirado" },
      { status: 401 }
    );
  }

  // Obtener info del evento y estado de la asistencia
  const {
    eventosCapacitacionTableId,
    eventosCapacitacionFields: evtF,
    asistenciaCapacitacionesTableId,
    asistenciaCapacitacionesFields: asisF,
  } = airtableSGSSTConfig;

  // Fetch evento
  const evtUrl = `${getSGSSTUrl(eventosCapacitacionTableId)}/${payload.e}?returnFieldsByFieldId=true`;
  const evtRes = await fetch(evtUrl, { headers: getSGSSTHeaders(), cache: "no-store" });
  if (!evtRes.ok) {
    return NextResponse.json({ success: false, message: "Evento no encontrado" }, { status: 404 });
  }
  const evtData = await evtRes.json();
  const ef = evtData.fields;

  // Fetch asistencia para verificar si ya firmó
  const asisUrl = `${getSGSSTUrl(asistenciaCapacitacionesTableId)}/${payload.r}?returnFieldsByFieldId=true`;
  const asisRes = await fetch(asisUrl, { headers: getSGSSTHeaders(), cache: "no-store" });
  let yaFirmo = false;
  if (asisRes.ok) {
    const asisData = await asisRes.json();
    yaFirmo = !!(asisData.fields[asisF.FIRMA_CONFIRMADA] || asisData.fields[asisF.FIRMA]);
  }

  const temas = (ef[evtF.TEMAS_TRATADOS] as string) || "";
  const nombreEvento = temas.split("\n")[0].replace(/^[-•]\s*/, "").trim() || "Evento de Capacitación";

  return NextResponse.json({
    success: true,
    data: {
      nombre: payload.n,
      cedula: payload.c,
      detalleRecordId: payload.r,
      yaFirmo,
      evento: {
        titulo: nombreEvento,
        fecha: ef[evtF.FECHA] as string,
        lugar: ef[evtF.LUGAR] as string,
        ciudad: ef[evtF.CIUDAD] as string,
        conferencista: ef[evtF.NOMBRE_CONFERENCISTA] as string,
      },
    },
  });
}

/**
 * POST /api/registros-asistencia/firmar-publico
 *
 * Body: { token: string, firmaDataUrl: string }
 * Valida el token, cifra la firma AES-256-CBC y la guarda en Airtable.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, firmaDataUrl } = await request.json();

    if (!token || !firmaDataUrl) {
      return NextResponse.json(
        { success: false, message: "token y firmaDataUrl son requeridos" },
        { status: 400 }
      );
    }

    if (!AES_SECRET) {
      return NextResponse.json(
        { success: false, message: "Error de configuración del servidor" },
        { status: 500 }
      );
    }

    // 1. Validar token
    const payload = verifySigningToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Enlace inválido o expirado. Solicita un nuevo enlace al organizador." },
        { status: 401 }
      );
    }

    const { asistenciaCapacitacionesTableId, asistenciaCapacitacionesFields: f } =
      airtableSGSSTConfig;

    // 2. Verificar que no haya firmado ya
    const checkUrl = `${getSGSSTUrl(asistenciaCapacitacionesTableId)}/${payload.r}?returnFieldsByFieldId=true`;
    const checkRes = await fetch(checkUrl, { headers: getSGSSTHeaders(), cache: "no-store" });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.fields[f.FIRMA_CONFIRMADA] || checkData.fields[f.FIRMA]) {
        return NextResponse.json(
          { success: false, message: "Este asistente ya registró su firma anteriormente." },
          { status: 409 }
        );
      }
    }

    // 3. Encriptar firma
    const firmaPayload = JSON.stringify({
      signature: firmaDataUrl,
      employee: payload.r,
      document: payload.c,
      nombre: payload.n,
      timestamp: new Date().toISOString(),
      source: "remote-link",
    });
    const encryptedSignature = encryptAES(firmaPayload);

    // 4. Guardar en Airtable
    const patchUrl = `${getSGSSTUrl(asistenciaCapacitacionesTableId)}?returnFieldsByFieldId=true`;
    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: getSGSSTHeaders(),
      body: JSON.stringify({
        records: [
          {
            id: payload.r,
            fields: {
              [f.FIRMA]: encryptedSignature,
              [f.FIRMA_CONFIRMADA]: true,
            },
          },
        ],
      }),
    });

    if (!patchRes.ok) {
      const err = await patchRes.text();
      console.error("Error guardando firma remota:", err);
      return NextResponse.json(
        { success: false, message: "Error al guardar la firma. Intenta nuevamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "¡Firma registrada exitosamente!",
    });
  } catch (error) {
    console.error("Error en POST /api/registros-asistencia/firmar-publico:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
