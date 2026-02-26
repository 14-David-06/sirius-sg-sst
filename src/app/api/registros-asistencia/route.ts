import { NextRequest, NextResponse } from "next/server";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

interface AsistentePayload {
  idEmpleado: string;
  nombreCompleto: string;
  cedula: string;
  labor: string;
}

interface EventoData {
  ciudad: string;
  lugar: string;
  fecha: string;
  horaInicio: string;
  duracion: string;
  temasTratados: string;
  nombreConferencista: string;
  tipoEvento: string; // "Capacitación" | "Inducción" | "Charla" | "CAPACITACION/CHARLA"
}

interface RegistroPayload {
  capacitacionCodigo: string;          // Código del catálogo: "CAP-1.1"
  programacionRecordIds?: string[];    // Record IDs de Programación Capacitaciones (multi-selección)
  programacionRecordId?: string;       // (legacy, single — fallback)
  eventoData: EventoData;
  asistentes: AsistentePayload[];
  fechaRegistro: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
}

// ══════════════════════════════════════════════════════════
// POST /api/registros-asistencia
// 1. Crea el Evento Capacitación con los datos del formulario.
// 2. Crea los registros de Asistencia vinculados a ese nuevo Evento.
// ══════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const payload: RegistroPayload = await request.json();

    if (!payload.capacitacionCodigo) {
      return NextResponse.json(
        { success: false, message: "Debe seleccionar una capacitación" },
        { status: 400 }
      );
    }
    if (!payload.asistentes || payload.asistentes.length === 0) {
      return NextResponse.json(
        { success: false, message: "Debe incluir al menos un asistente" },
        { status: 400 }
      );
    }

    const {
      eventosCapacitacionTableId,
      eventosCapacitacionFields: evtF,
      asistenciaCapacitacionesTableId,
      asistenciaCapacitacionesFields: asisF,
      programacionCapacitacionesTableId,
      programacionCapacitacionesFields: progF,
      capacitacionesTableId,
      capacitacionesFields: capF,
      miembrosComitesTableId,
      miembrosComitesFields: mF,
    } = airtableSGSSTConfig;
    const headers = getSGSSTHeaders();

    const fechaRegistro =
      payload.fechaRegistro ||
      new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

    // Soportar multi-selección y fallback a single ID (legacy)
    const progRecordIds: string[] =
      payload.programacionRecordIds ??
      (payload.programacionRecordId ? [payload.programacionRecordId] : []);

    // ── 1. Determinar Población Objetivo por programación ──
    // Resolve: progRecordId → linked capacitación → POBLACION
    const progPoblacion: Record<string, string> = {};
    if (progRecordIds.length > 0) {
      try {
        // Fetch programación records to get linked capacitación IDs
        const progOrParts = progRecordIds.map(id => `RECORD_ID()="${id}"`).join(",");
        const progFormula = encodeURIComponent(`OR(${progOrParts})`);
        const progRes = await fetch(
          `${getSGSSTUrl(programacionCapacitacionesTableId)}?returnFieldsByFieldId=true&filterByFormula=${progFormula}&fields[]=${progF.CAPACITACION_LINK}`,
          { headers, cache: "no-store" }
        );
        const progData = progRes.ok ? await progRes.json() : { records: [] };

        // Map: progRecordId → capRecordId
        const progCapMap: Record<string, string> = {};
        for (const r of (progData.records || [])) {
          const capIds = (r.fields[progF.CAPACITACION_LINK] as string[]) || [];
          if (capIds.length > 0) progCapMap[r.id] = capIds[0];
        }

        // Fetch unique capacitación records to get POBLACION
        const uniqueCapIds = [...new Set(Object.values(progCapMap))];
        if (uniqueCapIds.length > 0) {
          const capOrParts = uniqueCapIds.map(id => `RECORD_ID()="${id}"`).join(",");
          const capFormula = encodeURIComponent(`OR(${capOrParts})`);
          const capRes = await fetch(
            `${getSGSSTUrl(capacitacionesTableId)}?returnFieldsByFieldId=true&filterByFormula=${capFormula}&fields[]=${capF.POBLACION}`,
            { headers, cache: "no-store" }
          );
          const capData = capRes.ok ? await capRes.json() : { records: [] };
          const capPoblacionMap: Record<string, string> = {};
          for (const r of (capData.records || [])) {
            capPoblacionMap[r.id] = (r.fields[capF.POBLACION] as string) || "Todos los Colaboradores";
          }
          // Build final mapping: progRecordId → poblacion
          for (const [pId, cId] of Object.entries(progCapMap)) {
            progPoblacion[pId] = capPoblacionMap[cId] || "Todos los Colaboradores";
          }
        }
      } catch (e) {
        console.warn("[registros-asistencia] Error resolving prog populations:", e);
        // Fall through — all progs will be treated as "Todos los Colaboradores"
      }
    }

    // ── 2. Obtener membresías de comités por empleado ──
    const empComitesMap: Record<string, Set<string>> = {};
    const hasCommitteeTargeted = Object.values(progPoblacion).some(p => p !== "Todos los Colaboradores");
    if (hasCommitteeTargeted) {
      try {
        const mbrFormula = encodeURIComponent(`{${mF.ESTADO}}="Activo"`);
        const mbrRes = await fetch(
          `${getSGSSTUrl(miembrosComitesTableId)}?returnFieldsByFieldId=true&filterByFormula=${mbrFormula}&fields[]=${mF.ID_EMPLEADO}&fields[]=${mF.COMITE}`,
          { headers, cache: "no-store" }
        );
        if (mbrRes.ok) {
          const mbrData = await mbrRes.json();
          for (const r of (mbrData.records || [])) {
            const empId = r.fields[mF.ID_EMPLEADO] as string;
            const comite = r.fields[mF.COMITE] as string;
            if (empId && comite) {
              if (!empComitesMap[empId]) empComitesMap[empId] = new Set();
              empComitesMap[empId].add(comite);
            }
          }
        }
      } catch (e) {
        console.warn("[registros-asistencia] Error fetching committee memberships:", e);
      }
    }

    // Helper: get applicable prog IDs for an employee
    const getEmployeeProgs = (idEmpleado: string): string[] => {
      if (progRecordIds.length === 0) return [];
      const comites = empComitesMap[idEmpleado] || new Set<string>();
      return progRecordIds.filter(progId => {
        const poblacion = progPoblacion[progId] || "Todos los Colaboradores";
        if (poblacion === "Todos los Colaboradores") return true;
        return comites.has(poblacion);
      });
    };

    // ── 3. Generar código único para el evento ────────────
    const year = new Date().getFullYear();
    const ts  = Date.now().toString().slice(-5);
    const codigoBase = payload.capacitacionCodigo.replace(/^CAP-?/i, "");
    const eventoCodigo = `EVT-CAP${codigoBase}-${year}-${ts}`;

    // ── 4. Crear el Evento Capacitación ──────────────────
    const evtData = payload.eventoData;
    const eventoFields: Record<string, unknown> = {
      [evtF.CODIGO]:               eventoCodigo,
      [evtF.CIUDAD]:               evtData.ciudad || "",
      [evtF.LUGAR]:                evtData.lugar  || "",
      [evtF.FECHA]:                evtData.fecha  || fechaRegistro,
      [evtF.AREA]:                 "SG-SST",
      [evtF.TIPO]:                 evtData.tipoEvento || "Capacitación",
      [evtF.TEMAS_TRATADOS]:       evtData.temasTratados || "",
      [evtF.NOMBRE_CONFERENCISTA]: evtData.nombreConferencista || "",
      [evtF.ESTADO]:               "En Curso",
    };
    // Solo incluir campos de tiempo/duración si tienen valor (Airtable rechaza strings vacíos en campos time)
    if (evtData.horaInicio) eventoFields[evtF.HORA_INICIO] = evtData.horaInicio;
    if (evtData.duracion)   eventoFields[evtF.DURACION]   = evtData.duracion;
    if (progRecordIds.length > 0) eventoFields[evtF.PROGRAMACION_LINK] = progRecordIds;

    const eventoRes = await fetch(getSGSSTUrl(eventosCapacitacionTableId), {
      method: "POST",
      headers,
      body: JSON.stringify({ records: [{ fields: eventoFields }] }),
    });

    if (!eventoRes.ok) {
      const err = await eventoRes.text();
      console.error("Error creando evento capacitación:", err);
      return NextResponse.json(
        { success: false, message: "Error al crear el evento de capacitación" },
        { status: 500 }
      );
    }

    const eventoJson: AirtableResponse = await eventoRes.json();
    const eventoRecordId = eventoJson.records[0].id;

    // ── 5. Crear registros de Asistencia (con progs filtradas por comité) ──
    const asistenciaUrl = getSGSSTUrl(asistenciaCapacitacionesTableId);
    const progAttendeeCount: Record<string, number> = {};
    const records = payload.asistentes.map((a, idx) => {
      const empProgs = getEmployeeProgs(a.idEmpleado);
      // Track per-prog attendee count
      for (const pid of empProgs) {
        progAttendeeCount[pid] = (progAttendeeCount[pid] || 0) + 1;
      }
      const fields: Record<string, unknown> = {
        [asisF.ID_ASISTENCIA]: `ASIS-${eventoCodigo}-${String(idx + 1).padStart(3, "0")}`,
        [asisF.NOMBRES]:          a.nombreCompleto,
        [asisF.CEDULA]:           a.cedula,
        [asisF.LABOR]:            a.labor,
        [asisF.FECHA_REGISTRO]:   fechaRegistro,
        [asisF.EVENTO_LINK]:      [eventoRecordId],
        [asisF.ID_EMPLEADO_CORE]: a.idEmpleado,
        [asisF.FIRMA_CONFIRMADA]: false,
      };
      if (empProgs.length > 0) {
        fields[asisF.PROGRAMACION_LINK] = empProgs;
      }
      return { fields };
    });

    const createdIds: string[] = [];
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      const res = await fetch(asistenciaUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ records: batch }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Error creando asistencia:", err);
        return NextResponse.json(
          { success: false, message: "Error al crear registros de asistencia" },
          { status: 500 }
        );
      }

      const data: AirtableResponse = await res.json();
      createdIds.push(...data.records.map((r) => r.id));
    }

    // ── 6. Actualizar Programaciones: marcar Ejecutado, fecha, total ──
    for (const progId of progRecordIds) {
      const patchUrl = `${getSGSSTUrl(programacionCapacitacionesTableId)}/${progId}`;
      await fetch(patchUrl, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          fields: {
            [progF.EJECUTADO]:        true,
            [progF.FECHA_EJECUCION]:  evtData.fecha || fechaRegistro,
            [progF.TOTAL_ASISTENTES]: progAttendeeCount[progId] || 0,
          },
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Registro creado correctamente",
      data: {
        id:         eventoCodigo,
        recordId:   eventoRecordId,
        fecha:      fechaRegistro,
        asistentes: createdIds.length,
        detalleIds: createdIds,
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
// Lista todos los Eventos Capacitación con conteo de asistentes
// ══════════════════════════════════════════════════════════
export async function GET() {
  try {
    const { eventosCapacitacionTableId, eventosCapacitacionFields: f } =
      airtableSGSSTConfig;
    const headers = getSGSSTHeaders();

    const params = new URLSearchParams({
      "sort[0][field]": f.FECHA,
      "sort[0][direction]": "desc",
      maxRecords: "100",
      returnFieldsByFieldId: "true",
    });

    const res = await fetch(
      `${getSGSSTUrl(eventosCapacitacionTableId)}?${params.toString()}`,
      { headers, cache: "no-store" }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Error listando eventos:", err);
      return NextResponse.json(
        { success: false, message: "Error al consultar los eventos" },
        { status: 500 }
      );
    }

    const data: AirtableResponse = await res.json();

    const registros = data.records.map((r) => {
      const temas = (r.fields[f.TEMAS_TRATADOS] as string) || "";
      const primerTema = temas.split("\n")[0].replace(/^[-•]\s*/, "").trim();
      const asistenciaLinks = (r.fields[f.ASISTENCIA_LINK] as string[]) || [];

      return {
        id: r.id,
        idRegistro: (r.fields[f.CODIGO] as string) || "",
        nombreEvento: primerTema || (r.fields[f.CODIGO] as string) || "",
        ciudad: (r.fields[f.CIUDAD] as string) || "",
        fecha: (r.fields[f.FECHA] as string) || "",
        horaInicio: (r.fields[f.HORA_INICIO] as string) || "",
        lugar: (r.fields[f.LUGAR] as string) || "",
        duracion: (r.fields[f.DURACION] as string) || "",
        temasTratados: temas,
        tipo: (r.fields[f.TIPO] as string) || "",
        area: (r.fields[f.AREA] as string) || "",
        nombreConferencista: (r.fields[f.NOMBRE_CONFERENCISTA] as string) || "",
        estado: (r.fields[f.ESTADO] as string) || "",
        cantidadAsistentes: asistenciaLinks.length,
      };
    });

    return NextResponse.json({ success: true, data: registros, total: registros.length });
  } catch (error) {
    console.error("Error en GET /api/registros-asistencia:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
