// ══════════════════════════════════════════════════════════
// Handlers HTTP compartidos para actas COPASST / COCOLAB.
// Los route.ts de cada comité son wrappers de 3 líneas que
// inyectan el tipo del comité.
// ══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import {
  S3_FOLDERS,
  generateS3Key,
  uploadToS3,
} from "@/infrastructure/config/awsS3";
import { encryptFirmaActa, isAESReady } from "@/lib/firmaCrypto";
import { generarPdfActaComite } from "./actaPdf";
import {
  actualizarActa,
  actualizarUrlDocumento,
  crearActa,
  listarActas,
  listarCompromisosPendientes,
  marcarActaFirmada,
  obtenerActaPorId,
  type CrearActaPayload,
  type ListarFiltros,
} from "./actasRepository";
import { validarQuorum, type ComiteTipo, type FirmaActaInput } from "./types";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

// ── GET /api/{comite}/actas ────────────────────────────
export async function handleListar(
  comite: ComiteTipo,
  request: NextRequest
): Promise<Response> {
  try {
    const sp = request.nextUrl.searchParams;
    const filtros: ListarFiltros = {};
    const anio = sp.get("anio");
    const mes = sp.get("mes");
    const estado = sp.get("estado");
    if (anio) filtros.anio = parseInt(anio, 10);
    if (mes) filtros.mes = parseInt(mes, 10);
    if (estado === "borrador" || estado === "firmada") filtros.estado = estado;
    const data = await listarActas(comite, filtros);
    return NextResponse.json({ success: true, data, total: data.length });
  } catch (e) {
    console.error(`[${comite}] listar actas:`, e);
    return jsonError("Error al listar actas", 500);
  }
}

// ── POST /api/{comite}/actas ────────────────────────────
export async function handleCrear(
  comite: ComiteTipo,
  request: NextRequest
): Promise<Response> {
  try {
    const body = (await request.json()) as CrearActaPayload;
    if (!body.fechaReunion || !body.mesEvaluado || !body.lugar) {
      return jsonError("Faltan campos requeridos: fechaReunion, mesEvaluado, lugar");
    }

    // Soportar ambos formatos: legacy (asistentesRecordIds) y nuevo (asistentesConFirmas)
    const tieneAsistentes =
      (Array.isArray(body.asistentesConFirmas) && body.asistentesConFirmas.length > 0) ||
      (Array.isArray(body.asistentesRecordIds) && body.asistentesRecordIds.length > 0);

    if (!tieneAsistentes) {
      return jsonError("Debe seleccionar al menos un asistente del comité");
    }

    const result = await crearActa(comite, body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (e) {
    console.error(`[${comite}] crear acta:`, e);
    return jsonError(
      e instanceof Error ? e.message : "Error al crear acta",
      500
    );
  }
}

// ── GET /api/{comite}/actas/:id ─────────────────────────
export async function handleObtener(
  comite: ComiteTipo,
  id: string
): Promise<Response> {
  try {
    const data = await obtenerActaPorId(comite, id);
    if (!data) return jsonError("Acta no encontrada", 404);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error(`[${comite}] obtener acta:`, e);
    return jsonError("Error al obtener acta", 500);
  }
}

// ── PUT /api/{comite}/actas/:id ─────────────────────────
export async function handleActualizar(
  comite: ComiteTipo,
  id: string,
  request: NextRequest
): Promise<Response> {
  try {
    const body = (await request.json()) as Partial<CrearActaPayload>;
    await actualizarActa(comite, id, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(`[${comite}] actualizar acta:`, e);
    return jsonError(
      e instanceof Error ? e.message : "Error al actualizar acta",
      400
    );
  }
}

// ── POST /api/{comite}/actas/:id/firmar ─────────────────
interface FirmarPayload {
  presidente: FirmaActaInput;
  secretario: FirmaActaInput;
}
export async function handleFirmar(
  comite: ComiteTipo,
  id: string,
  request: NextRequest
): Promise<Response> {
  try {
    if (!isAESReady()) return jsonError("AES no configurado", 500);
    const body = (await request.json()) as FirmarPayload;
    if (!body.presidente?.signatureDataUrl || !body.secretario?.signatureDataUrl) {
      return jsonError("Faltan firmas de presidente y secretario(a)");
    }

    const acta = await obtenerActaPorId(comite, id);
    if (!acta) return jsonError("Acta no encontrada", 404);
    if (acta.estado === "firmada") {
      return jsonError("El acta ya está firmada", 409);
    }

    // Validar quórum (usar asistentes resueltos)
    const q = validarQuorum(comite, acta.asistentes);
    if (!q.ok) return jsonError(q.mensaje || "Quórum insuficiente", 422);

    const ts = new Date().toISOString();
    const presEnc = encryptFirmaActa({
      signature: body.presidente.signatureDataUrl,
      nombre: body.presidente.nombre,
      cedula: body.presidente.cedula,
      cargo: body.presidente.cargo,
      rol: "presidente",
      comite,
      actaId: id,
      timestamp: ts,
    });
    const secEnc = encryptFirmaActa({
      signature: body.secretario.signatureDataUrl,
      nombre: body.secretario.nombre,
      cedula: body.secretario.cedula,
      cargo: body.secretario.cargo,
      rol: "secretaria",
      comite,
      actaId: id,
      timestamp: ts,
    });

    await marcarActaFirmada(comite, id, presEnc, secEnc);

    // Generar PDF y subir a S3 (best-effort: si falla no impide la firma)
    try {
      const actaFirmada = await obtenerActaPorId(comite, id);
      if (actaFirmada) {
        const buf = await generarPdfActaComite({ acta: actaFirmada });
        const key = generateS3Key(
          S3_FOLDERS.DOCUMENTOS_SST,
          `actas-${comite.toLowerCase()}/${id}-${Date.now()}.pdf`
        );
        const { url } = await uploadToS3(key, buf, "application/pdf");
        await actualizarUrlDocumento(comite, id, url);
        return NextResponse.json({ success: true, data: { pdfUrl: url } });
      }
    } catch (pdfErr) {
      console.error(`[${comite}] PDF generación falló:`, pdfErr);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(`[${comite}] firmar acta:`, e);
    return jsonError(
      e instanceof Error ? e.message : "Error al firmar acta",
      500
    );
  }
}

// ── GET /api/{comite}/actas/:id/pdf ─────────────────────
export async function handleDescargarPdf(
  comite: ComiteTipo,
  id: string
): Promise<Response> {
  try {
    const acta = await obtenerActaPorId(comite, id);
    if (!acta) return jsonError("Acta no encontrada", 404);
    const buf = await generarPdfActaComite({ acta });
    const filename = `acta-${comite.toLowerCase()}-${acta.numeroActa.replace(/[^\w-]/g, "_")}.pdf`;
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(`[${comite}] PDF acta:`, e);
    return jsonError("Error al generar PDF", 500);
  }
}

// ── GET /api/{comite}/compromisos/pendientes ────────────
export async function handleCompromisosPendientes(
  comite: ComiteTipo
): Promise<Response> {
  try {
    const data = await listarCompromisosPendientes(comite);
    return NextResponse.json({ success: true, data, total: data.length });
  } catch (e) {
    console.error(`[${comite}] compromisos pendientes:`, e);
    return jsonError("Error al listar compromisos", 500);
  }
}
