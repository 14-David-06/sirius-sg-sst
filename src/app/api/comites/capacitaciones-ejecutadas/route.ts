// GET /api/comites/capacitaciones-ejecutadas?mes=N&anio=YYYY
// Lista capacitaciones ejecutadas del mes desde la tabla EXISTENTE
// "Programación Capacitaciones" — para vincular al acta COPASST.
import { NextRequest, NextResponse } from "next/server";
import {
  airtableSGSSTConfig,
  getSGSSTHeaders,
  getSGSSTUrl,
} from "@/infrastructure/config/airtableSGSST";

const MESES_NOMBRE = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const mes = parseInt(sp.get("mes") || "0", 10);
    const anio = parseInt(sp.get("anio") || "0", 10);
    if (!mes || mes < 1 || mes > 12 || !anio) {
      return NextResponse.json(
        { success: false, message: "Parámetros 'mes' (1-12) y 'anio' requeridos" },
        { status: 400 }
      );
    }

    const F = airtableSGSSTConfig.programacionCapacitacionesFields;
    const mesNombre = MESES_NOMBRE[mes - 1];

    // Filtro: ejecutado=true Y (mes coincide por nombre o por número) Y año coincide
    // El campo MES puede venir como texto "Enero" o como número; soportamos ambos.
    // Año se extrae de FECHA_EJECUCION si está presente.
    const filtro = `AND(
      OR({${F.EJECUTADO}} = TRUE(), {${F.EJECUTADO}} = 1),
      OR(
        LOWER({${F.MES}}) = '${mesNombre.toLowerCase()}',
        {${F.MES}} = '${mes}',
        {${F.MES}} = ${mes}
      ),
      OR(
        {${F.FECHA_EJECUCION}} = BLANK(),
        YEAR({${F.FECHA_EJECUCION}}) = ${anio}
      )
    )`.replace(/\s+/g, " ");

    const params = new URLSearchParams({
      filterByFormula: filtro,
      pageSize: "100",
      returnFieldsByFieldId: "true",
      "sort[0][field]": F.FECHA_EJECUCION,
      "sort[0][direction]": "desc",
    });

    const res = await fetch(
      `${getSGSSTUrl(airtableSGSSTConfig.programacionCapacitacionesTableId)}?${params}`,
      { headers: getSGSSTHeaders(), cache: "no-store" }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable ${res.status}: ${text}`);
    }
    const data = (await res.json()) as { records: AirtableRecord[] };

    const items = data.records.map((r) => {
      const ident = r.fields[F.IDENTIFICADOR];
      const fecha = r.fields[F.FECHA_EJECUCION];
      // El IDENTIFICADOR suele venir como texto descriptivo de la capacitación
      const tema =
        typeof ident === "string"
          ? ident
          : Array.isArray(ident) && ident.length > 0
            ? String(ident[0])
            : "(sin identificador)";
      return {
        recordId: r.id,
        tema,
        fechaEjecucion: typeof fecha === "string" ? fecha : null,
      };
    });

    return NextResponse.json({ success: true, data: items, total: items.length });
  } catch (e) {
    console.error("[comites] capacitaciones-ejecutadas:", e);
    return NextResponse.json(
      {
        success: false,
        message:
          e instanceof Error ? e.message : "Error al listar capacitaciones",
      },
      { status: 500 }
    );
  }
}
