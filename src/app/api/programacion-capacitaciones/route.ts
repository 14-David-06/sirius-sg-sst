import { NextResponse } from "next/server";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

async function fetchAllPages(tableId: string, extraParams?: Record<string, string>): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(getSGSSTUrl(tableId));
    url.searchParams.set("returnFieldsByFieldId", "true");
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), { headers: getSGSSTHeaders() });
    const json = await res.json();
    all.push(...(json.records ?? []));
    offset = json.offset;
  } while (offset);
  return all;
}

export async function GET() {
  try {
    const {
      programacionCapacitacionesTableId: progTableId,
      programacionCapacitacionesFields: pf,
      capacitacionesTableId,
      capacitacionesFields: cf,
    } = airtableSGSSTConfig;

    // Fetch programaciones + capacitaciones catalog in parallel
    const [progRecords, capRecords] = await Promise.all([
      fetchAllPages(progTableId, {
        "sort[0][field]": pf.FECHA_EJECUCION,
        "sort[0][direction]": "asc",
      }),
      fetchAllPages(capacitacionesTableId),
    ]);

    // Build lookup: capacitacion record ID → { nombre, codigo, categoria }
    const capMap = new Map<string, { nombre: string; codigo: string; categoria: string }>(
      capRecords.map((r) => [
        r.id,
        {
          nombre:    (r.fields[cf.NOMBRE]    as string) || "",
          codigo:    (r.fields[cf.CODIGO]    as string) || "",
          categoria: (r.fields[cf.CATEGORIA] as string) || "",
        },
      ])
    );

    const data = progRecords.map((r) => {
      const capIds = (r.fields[pf.CAPACITACION_LINK] as string[]) ?? [];
      const capInfo = capIds.length > 0
        ? (capMap.get(capIds[0]) ?? { nombre: "", codigo: "", categoria: "" })
        : { nombre: "", codigo: "", categoria: "" };
      return {
        id: r.id,
        identificador:         (r.fields[pf.IDENTIFICADOR] as string) ?? "",
        mes:                   (r.fields[pf.MES] as string) ?? "",
        trimestre:             (r.fields[pf.TRIMESTRE] as string) ?? "",
        programado:            !!(r.fields[pf.PROGRAMADO]),
        ejecutado:             !!(r.fields[pf.EJECUTADO]),
        fechaEjecucion:        (r.fields[pf.FECHA_EJECUCION] as string) ?? "",
        totalAsistentes:       (r.fields[pf.TOTAL_ASISTENTES] as number) ?? 0,
        capacitacionNombre:    capInfo.nombre,
        capacitacionCodigo:    capInfo.codigo,
        capacitacionCategoria: capInfo.categoria,
        observaciones:         (r.fields[pf.OBSERVACIONES] as string) ?? "",
      };
    });

    const capacitaciones = capRecords.map((r) => ({
      id: r.id,
      nombre: (r.fields[cf.NOMBRE] as string) || "",
      codigo: (r.fields[cf.CODIGO] as string) || "",
    }));

    return NextResponse.json({ success: true, data, capacitaciones });
  } catch (err) {
    console.error("[programacion-capacitaciones GET]", err);
    return NextResponse.json(
      { success: false, message: String(err) },
      { status: 500 }
    );
  }
}
