import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

interface RespuestaItem {
  preguntaId: string;    // BancoPreguntas record ID
  ppId: string;          // PregxPlant record ID
  respuestaDada: string; // JSON string for multi / plain string for others
  esCorrecta: boolean;
  puntajeObtenido: number;
  tiempoSeg?: number;
  ordenPresentado: number;
}

interface SubmitBody {
  plantillaId: string;
  idEmpleadoCore: string;
  nombres: string;
  cedula: string;
  cargo: string;
  progCapId?: string;       // Programación Capacitación record ID (optional)
  respuestas: RespuestaItem[];
  puntajeMaximo: number;
  tiempoEmpleadoMin?: number;
  intentoNumero: number;
}

/**
 * POST /api/evaluaciones/responder
 *
 * Creates an EvalAplicadas record + individual RespEval records.
 * Returns { success, evalId, puntajeObtenido, puntajeMaximo, porcentaje, estado }
 */
export async function POST(request: NextRequest) {
  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Body inválido" }, { status: 400 });
  }

  const {
    plantillaId,
    idEmpleadoCore,
    nombres,
    cedula,
    cargo,
    progCapId,
    respuestas,
    puntajeMaximo,
    tiempoEmpleadoMin,
    intentoNumero,
  } = body;

  if (!plantillaId || !idEmpleadoCore || !respuestas?.length) {
    return NextResponse.json({ success: false, message: "Datos incompletos" }, { status: 400 });
  }

  const {
    evalAplicadasTableId,
    evalAplicadasFields: eF,
    respEvalTableId,
    respEvalFields: rF,
    plantillasEvalTableId,
    plantillasEvalFields: pF,
  } = airtableSGSSTConfig;

  const headers = getSGSSTHeaders();
  const base = getSGSSTUrl;

  // ── Calcular puntaje ─────────────────────────────────
  const puntajeObtenido = respuestas.reduce((sum, r) => sum + (r.puntajeObtenido || 0), 0);
  const porcentaje = puntajeMaximo > 0
    ? Math.round((puntajeObtenido / puntajeMaximo) * 100 * 100) / 100
    : 0;

  // ── Obtener puntaje mínimo de la plantilla ───────────
  const plntUrl = `${base(plantillasEvalTableId)}/${plantillaId}?returnFieldsByFieldId=true&fields[]=${pF.PUNTAJE_MINIMO}`;
  const plntRes = await fetch(plntUrl, { headers, cache: "no-store" });
  let puntajeMinimo = 60;
  if (plntRes.ok) {
    const pd = await plntRes.json();
    puntajeMinimo = Number(pd.fields[pF.PUNTAJE_MINIMO]) || 60;
  }
  const estado = porcentaje >= puntajeMinimo ? "Aprobada" : "No Aprobada";

  // ── 1. Crear EvalAplicadas ───────────────────────────
  const evalFields: Record<string, unknown> = {
    [eF.PLANTILLA]:   [plantillaId],
    [eF.ID_EMPLEADO]: idEmpleadoCore,
    [eF.NOMBRES]:     nombres,
    [eF.CEDULA]:      cedula,
    [eF.CARGO]:       cargo,
    [eF.FECHA]:       new Date().toISOString().split("T")[0],
    [eF.PUNTAJE_OBT]: puntajeObtenido,
    [eF.PUNTAJE_MAX]: puntajeMaximo,
    [eF.PORCENTAJE]:  porcentaje,
    [eF.ESTADO]:      estado,
    [eF.INTENTO]:     intentoNumero,
  };
  if (tiempoEmpleadoMin !== undefined) evalFields[eF.TIEMPO] = tiempoEmpleadoMin;
  if (progCapId) evalFields[eF.PROG_CAP] = [progCapId];

  const evalRes = await fetch(`${base(evalAplicadasTableId)}?returnFieldsByFieldId=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields: evalFields }),
  });

  if (!evalRes.ok) {
    const err = await evalRes.text();
    console.error("Error creando EvalAplicadas:", err);
    return NextResponse.json({ success: false, message: "Error guardando evaluación" }, { status: 500 });
  }
  const evalData = await evalRes.json();
  const evalId = evalData.id as string;

  // ── 2. Crear RespEval records en batches ─────────────
  const batchSize = 10;
  for (let i = 0; i < respuestas.length; i += batchSize) {
    const batch = respuestas.slice(i, i + batchSize);
    const records = batch.map((r) => ({
      fields: {
        [rF.EVALUACION]:      [evalId],
        [rF.PREGUNTA]:        [r.preguntaId],
        [rF.RESPUESTA_DADA]:  r.respuestaDada,
        [rF.ES_CORRECTA]:     r.esCorrecta,
        [rF.PUNTAJE]:         r.puntajeObtenido,
        [rF.TIEMPO_SEG]:      r.tiempoSeg || 0,
        [rF.ORDEN]:           r.ordenPresentado,
      },
    }));

    const batchRes = await fetch(`${base(respEvalTableId)}?returnFieldsByFieldId=true`, {
      method: "POST",
      headers,
      body: JSON.stringify({ records }),
    });

    if (!batchRes.ok) {
      console.error("Error guardando respuestas batch:", await batchRes.text());
      // Continue — partial save is better than failing entirely
    }
  }

  return NextResponse.json({
    success: true,
    evalId,
    puntajeObtenido,
    puntajeMaximo,
    porcentaje,
    estado,
    puntajeMinimo,
  });
}
