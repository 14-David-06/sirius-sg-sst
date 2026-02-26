import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

/**
 * GET /api/evaluaciones/plantilla/[id]
 *
 * Returns a plantilla with all its questions (fully expanded).
 * Steps:
 *  1. Fetch PlantillasEval record by id
 *  2. Fetch PregxPlant records linked to the plantilla
 *  3. For each PregxPlant, fetch the BancoPreguntas record
 *  4. Return merged question list with options parsed from JSON
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: plantillaId } = await params;

  const {
    plantillasEvalTableId,
    plantillasEvalFields: pF,
    pregXPlantTableId,
    pregXPlantFields: ppF,
    bancoPreguntasTableId,
    bancoPreguntasFields: bF,
  } = airtableSGSSTConfig;

  const headers = getSGSSTHeaders();
  const base = getSGSSTUrl;

  // ── 1. Fetch plantilla ───────────────────────────────
  const plntUrl = `${base(plantillasEvalTableId)}/${plantillaId}?returnFieldsByFieldId=true`;
  const plntRes = await fetch(plntUrl, { headers, cache: "no-store" });
  if (!plntRes.ok) {
    return NextResponse.json({ success: false, message: "Plantilla no encontrada" }, { status: 404 });
  }
  const plntData = await plntRes.json();
  const pf = plntData.fields;

  // ── 2. Fetch PregxPlant rows for this plantilla ──────
  // Use the linked record IDs from the plantilla's PREGUNTAS_LINK field
  // (FIND/ARRAYJOIN doesn't work with field IDs on linked record fields)
  const ppLinkedIds: string[] = (pf[pF.PREGUNTAS_LINK] as string[]) || [];

  if (ppLinkedIds.length === 0) {
    return NextResponse.json({
      success: true,
      plantilla: buildPlantilla(plntData.id, pf, pF),
      preguntas: [],
    });
  }

  // Fetch PregxPlant records by their IDs
  const ppRecords: { id: string; fields: Record<string, unknown> }[] = [];
  for (let i = 0; i < ppLinkedIds.length; i += 10) {
    const batch = ppLinkedIds.slice(i, i + 10);
    const formula = `OR(${batch.map((rid) => `RECORD_ID()="${rid}"`).join(",")})`;
    const ppUrl = `${base(pregXPlantTableId)}?returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(formula)}`;
    const ppRes = await fetch(ppUrl, { headers, cache: "no-store" });
    if (ppRes.ok) {
      const ppData = await ppRes.json();
      ppRecords.push(...(ppData.records || []));
    }
  }

  // Sort by ORDEN
  ppRecords.sort((a, b) => {
    const oa = Number(a.fields[ppF.ORDEN]) || 0;
    const ob = Number(b.fields[ppF.ORDEN]) || 0;
    return oa - ob;
  });

  // ── 3. Fetch BancoPreguntas for each PregxPlant ──────
  // Extract pregunta IDs from PregxPlant link fields
  const pregIds: string[] = ppRecords
    .flatMap((r) => (r.fields[ppF.PREGUNTA] as string[]) || [])
    .filter(Boolean);

  // Batch-fetch all pregunta records
  const pregMap: Record<string, Record<string, unknown>> = {};
  if (pregIds.length > 0) {
    // Fetch up to 100 at a time (Airtable limit)
    for (let i = 0; i < pregIds.length; i += 10) {
      const batch = pregIds.slice(i, i + 10);
      const formula = `OR(${batch.map((id) => `RECORD_ID()="${id}"`).join(",")})`;
      const batchUrl = `${base(bancoPreguntasTableId)}?returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(formula)}`;
      const batchRes = await fetch(batchUrl, { headers, cache: "no-store" });
      if (batchRes.ok) {
        const batchData = await batchRes.json();
        for (const r of batchData.records || []) {
          pregMap[r.id] = r.fields;
        }
      }
    }
  }

  // ── 4. Build question list ───────────────────────────
  const preguntas = ppRecords.map((pp, index) => {
    const pregRecordIds: string[] = (pp.fields[ppF.PREGUNTA] as string[]) || [];
    const pregId = pregRecordIds[0];
    const pregFields = pregMap[pregId] || {};

    // Parse opciones from JSON string — normalize to string[]
    let opciones: string[] = [];
    let keyToText: Record<string, string> = {};
    const opcionesRaw = pregFields[bF.OPCIONES_JSON] as string;
    if (opcionesRaw) {
      try {
        const parsed = JSON.parse(opcionesRaw);
        if (Array.isArray(parsed)) {
          // Could be string[] or {key, texto}[]
          opciones = parsed.map((item: unknown) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object") {
              const obj = item as Record<string, string>;
              if (obj.key && obj.texto) {
                keyToText[obj.key] = obj.texto;
                return obj.texto;
              }
              if ("texto" in obj) return obj.texto;
            }
            return String(item);
          });
        }
      } catch {
        opciones = [opcionesRaw];
      }
    }

    // Normalize respuestaCorrecta: convert key → texto for Selección type questions
    const tipo = (pregFields[bF.TIPO] as string) || "Selección Única";
    let respuestaCorrecta = (pregFields[bF.RESPUESTA_CORRECTA] as string) || "";
    if (tipo === "Verdadero/Falso") {
      // Normalize "true"/"false" → "Verdadero"/"Falso"
      respuestaCorrecta = respuestaCorrecta.toLowerCase() === "true" ? "Verdadero" : "Falso";
    } else if (Object.keys(keyToText).length > 0) {
      // Convert key-based answers to text-based
      if (respuestaCorrecta.startsWith("[")) {
        // Multiple selection: ["A","C"] → ["texto A","texto C"]
        try {
          const keys: string[] = JSON.parse(respuestaCorrecta);
          respuestaCorrecta = JSON.stringify(keys.map(k => keyToText[k] || k));
        } catch { /* keep as-is */ }
      } else {
        // Single selection: "C" → "texto de opción C"
        respuestaCorrecta = keyToText[respuestaCorrecta] || respuestaCorrecta;
      }
    }

    return {
      ppId: pp.id,
      preguntaId: pregId,
      orden: Number(pp.fields[ppF.ORDEN]) ?? index + 1,
      puntajeAsignado: Number(pp.fields[ppF.PUNTAJE]) || 0,
      obligatoria: !!(pp.fields[ppF.OBLIGATORIA]),
      texto: (pregFields[bF.TEXTO] as string) || "",
      tipo,
      opciones,
      respuestaCorrecta,
      explicacion: (pregFields[bF.EXPLICACION] as string) || "",
    };
  });

  // Shuffle if aleatorizar is set
  const aleatorizar = !!(pf[pF.ALEATORIZAR]);
  const preguntasFinal = aleatorizar
    ? [...preguntas].sort(() => Math.random() - 0.5)
    : preguntas;

  return NextResponse.json({
    success: true,
    plantilla: buildPlantilla(plntData.id, pf, pF),
    preguntas: preguntasFinal,
  });
}

function buildPlantilla(
  id: string,
  fields: Record<string, unknown>,
  pF: Record<string, string>
) {
  return {
    id,
    codigo: fields[pF.CODIGO] as string,
    nombre: fields[pF.NOMBRE] as string,
    descripcion: fields[pF.DESCRIPCION] as string,
    tipo: fields[pF.TIPO] as string,
    puntajeMinimo: Number(fields[pF.PUNTAJE_MINIMO]) || 60,
    tiempoLimite: Number(fields[pF.TIEMPO_LIMITE]) || 0,
    intentosPermitidos: Number(fields[pF.INTENTOS]) || 1,
    aleatorizar: !!(fields[pF.ALEATORIZAR]),
    mostrarRetro: !!(fields[pF.MOSTRAR_RETRO]),
  };
}
