import { NextRequest, NextResponse } from "next/server";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

/**
 * POST /api/evaluaciones/habilitar
 *
 * Habilita evaluación para un evento existente creando una plantilla de evaluación
 * vinculada a las programaciones del evento.
 *
 * Body:
 *   {
 *     eventoRecordId: string;       // Record ID del evento
 *     nombrePlantilla?: string;     // Nombre opcional para la plantilla
 *     preguntas?: string[];         // Record IDs de preguntas del banco (opcional)
 *     puntajeMinimo?: number;       // Puntaje mínimo para aprobar (default: 60)
 *     tiempoLimite?: number;        // Tiempo límite en minutos (opcional)
 *   }
 *
 * Response:
 *   {
 *     success: true,
 *     plantillaId: string,
 *     message: string
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventoRecordId,
      nombrePlantilla,
      preguntas = [],
      puntajeMinimo = 60,
      tiempoLimite
    } = body;

    if (!eventoRecordId) {
      return NextResponse.json(
        { success: false, message: "eventoRecordId es requerido" },
        { status: 400 }
      );
    }

    const {
      eventosCapacitacionTableId,
      eventosCapacitacionFields: evtF,
      plantillasEvalTableId,
      plantillasEvalFields: plntF,
      pregXPlantTableId,
      pregXPlantFields: pxpF,
    } = airtableSGSSTConfig;

    const headers = getSGSSTHeaders();

    // 1. Obtener información del evento
    const eventoUrl = `${getSGSSTUrl(eventosCapacitacionTableId)}/${eventoRecordId}?returnFieldsByFieldId=true`;
    const eventoRes = await fetch(eventoUrl, { headers, cache: "no-store" });

    if (!eventoRes.ok) {
      return NextResponse.json(
        { success: false, message: "Evento no encontrado" },
        { status: 404 }
      );
    }

    const eventoData = await eventoRes.json();
    const progCapIds = (eventoData.fields[evtF.PROGRAMACION_LINK] as string[]) || [];
    const eventoCodigo = eventoData.fields[evtF.CODIGO] as string;
    const temasTratados = (eventoData.fields[evtF.TEMAS_TRATADOS] as string) || "";
    const primerTema = temasTratados.split("\n")[0].replace(/^[-•]\s*/, "").trim();

    if (progCapIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Este evento no tiene programaciones vinculadas. Solo eventos vinculados a programaciones pueden tener evaluaciones."
        },
        { status: 400 }
      );
    }

    // 2. Generar código único para la plantilla
    const year = new Date().getFullYear();
    const ts = Date.now().toString().slice(-6);
    const plantillaCodigo = `EVAL-${eventoCodigo}-${ts}`;

    // 3. Crear la plantilla de evaluación
    const plantillaData = {
      fields: {
        [plntF.CODIGO]: plantillaCodigo,
        [plntF.NOMBRE]: nombrePlantilla || `Evaluación: ${primerTema}`,
        [plntF.DESCRIPCION]: `Evaluación generada para el evento ${eventoCodigo}`,
        [plntF.TIPO]: "Capacitación",
        [plntF.PUNTAJE_MINIMO]: puntajeMinimo,
        [plntF.TIEMPO_LIMITE]: tiempoLimite || undefined,
        [plntF.INTENTOS]: 3, // Por defecto 3 intentos
        [plntF.ALEATORIZAR]: true,
        [plntF.MOSTRAR_RETRO]: true,
        [plntF.ESTADO]: "Activa",
        [plntF.VIGENCIA]: year.toString(),
        [plntF.PROGRAMACIONES]: progCapIds, // Vincular a las programaciones del evento
      }
    };

    // Limpiar campos undefined
    Object.keys(plantillaData.fields).forEach(key => {
      if (plantillaData.fields[key] === undefined) {
        delete plantillaData.fields[key];
      }
    });

    const plantillaRes = await fetch(getSGSSTUrl(plantillasEvalTableId), {
      method: "POST",
      headers,
      body: JSON.stringify({ records: [plantillaData] }),
    });

    if (!plantillaRes.ok) {
      const error = await plantillaRes.text();
      console.error("Error creando plantilla:", error);
      return NextResponse.json(
        { success: false, message: "Error al crear la plantilla de evaluación" },
        { status: 500 }
      );
    }

    const plantillaResult = await plantillaRes.json();
    const plantillaRecordId = plantillaResult.records[0].id;

    // 4. Si se proporcionaron preguntas, vincularlas a la plantilla
    if (preguntas.length > 0) {
      const preguntasRecords = preguntas.map((preguntaId, idx) => ({
        fields: {
          [pxpF.CODIGO]: `${plantillaCodigo}-P${idx + 1}`,
          [pxpF.PLANTILLA]: [plantillaRecordId],
          [pxpF.PREGUNTA]: [preguntaId],
          [pxpF.ORDEN]: idx + 1,
          [pxpF.PUNTAJE]: 10, // 10 puntos por pregunta por defecto
          [pxpF.OBLIGATORIA]: true,
        }
      }));

      // Crear en batches de 10
      for (let i = 0; i < preguntasRecords.length; i += 10) {
        const batch = preguntasRecords.slice(i, i + 10);
        await fetch(getSGSSTUrl(pregXPlantTableId), {
          method: "POST",
          headers,
          body: JSON.stringify({ records: batch }),
        });
      }
    }

    return NextResponse.json({
      success: true,
      plantillaId: plantillaRecordId,
      plantillaCodigo,
      message: preguntas.length > 0
        ? `Plantilla creada exitosamente con ${preguntas.length} preguntas vinculadas`
        : "Plantilla creada exitosamente. Agrega preguntas manualmente en Airtable.",
    });

  } catch (error) {
    console.error("Error en POST /api/evaluaciones/habilitar:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
