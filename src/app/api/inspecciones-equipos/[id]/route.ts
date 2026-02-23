import { NextRequest, NextResponse } from "next/server";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

/**
 * GET /api/inspecciones-equipos/[id]
 * Devuelve el detalle de una inspección de equipos.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { inspEquiposFields, detalleEquiposFields, respEquiposFields } =
      airtableSGSSTConfig;

    // 1. Obtener cabecera
    const cabeceraUrl = `${getSGSSTUrl(airtableSGSSTConfig.inspEquiposTableId)}/${id}`;
    const cabeceraRes = await fetch(cabeceraUrl, {
      headers: getSGSSTHeaders(),
      cache: "no-store",
    });

    if (!cabeceraRes.ok) {
      return NextResponse.json(
        { success: false, message: "Inspección no encontrada" },
        { status: 404 }
      );
    }

    const cabeceraData: AirtableRecord = await cabeceraRes.json();

    const inspeccion = {
      id: cabeceraData.id,
      idInspeccion: cabeceraData.fields[inspEquiposFields.ID] as string,
      fecha: cabeceraData.fields[inspEquiposFields.FECHA] as string,
      inspector: cabeceraData.fields[inspEquiposFields.INSPECTOR] as string,
      estado: cabeceraData.fields[inspEquiposFields.ESTADO] as string,
      observaciones:
        (cabeceraData.fields[inspEquiposFields.OBSERVACIONES] as string) || "",
    };

    // 2. Obtener detalles vinculados
    const detalleUrl = getSGSSTUrl(airtableSGSSTConfig.detalleEquiposTableId);
    const detalleParams = new URLSearchParams({
      filterByFormula: `FIND("${id}", ARRAYJOIN({${detalleEquiposFields.INSPECCION_LINK}}))`,
      returnFieldsByFieldId: "true",
      pageSize: "100",
    });

    let allDetalles: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      if (offset) detalleParams.set("offset", offset);
      const res = await fetch(`${detalleUrl}?${detalleParams.toString()}`, {
        headers: getSGSSTHeaders(),
        cache: "no-store",
      });

      if (res.ok) {
        const data: AirtableListResponse = await res.json();
        allDetalles = allDetalles.concat(data.records);
        offset = data.offset;
      } else {
        console.error("Error fetching detalles:", await res.text());
        break;
      }
    } while (offset);

    // Resolver nombres de equipos
    const equipoIds = allDetalles
      .map((r) => {
        const links = r.fields[detalleEquiposFields.EQUIPO_LINK] as string[] | undefined;
        return links?.[0];
      })
      .filter(Boolean) as string[];

    const equipoNames: Record<string, { nombre: string; codigo: string }> = {};
    if (equipoIds.length > 0) {
      const { equiposFields } = airtableSGSSTConfig;
      const equipoUrl = getSGSSTUrl(airtableSGSSTConfig.equiposTableId);

      // Fetch equipment records in batches
      const uniqueIds = [...new Set(equipoIds)];
      for (let i = 0; i < uniqueIds.length; i += 10) {
        const batch = uniqueIds.slice(i, i + 10);
        const formula = `OR(${batch.map((eid) => `RECORD_ID()='${eid}'`).join(",")})`;
        const eqParams = new URLSearchParams({
          filterByFormula: formula,
          returnFieldsByFieldId: "true",
          "fields[]": equiposFields.NOMBRE,
        });
        eqParams.append("fields[]", equiposFields.CODIGO);

        const eqRes = await fetch(`${equipoUrl}?${eqParams.toString()}`, {
          headers: getSGSSTHeaders(),
          cache: "no-store",
        });

        if (eqRes.ok) {
          const eqData: AirtableListResponse = await eqRes.json();
          eqData.records.forEach((r) => {
            equipoNames[r.id] = {
              nombre: (r.fields[equiposFields.NOMBRE] as string) || "",
              codigo: (r.fields[equiposFields.CODIGO] as string) || "",
            };
          });
        }
      }
    }

    const detalles = allDetalles.map((r) => {
      const equipoLink = (r.fields[detalleEquiposFields.EQUIPO_LINK] as string[])?.[0];
      const equipoInfo = equipoLink ? equipoNames[equipoLink] : undefined;

      return {
        id: r.id,
        idDetalle: (r.fields[detalleEquiposFields.ID] as string) || "",
        categoria: (r.fields[detalleEquiposFields.CATEGORIA] as string) || "",
        area: (r.fields[detalleEquiposFields.AREA] as string) || "",
        estadoGeneral: (r.fields[detalleEquiposFields.ESTADO_GENERAL] as string) || null,
        senalizacion: (r.fields[detalleEquiposFields.SENALIZACION] as string) || null,
        accesibilidad: (r.fields[detalleEquiposFields.ACCESIBILIDAD] as string) || null,
        presionManometro: (r.fields[detalleEquiposFields.PRESION_MANOMETRO] as string) || null,
        manguera: (r.fields[detalleEquiposFields.MANGUERA] as string) || null,
        pinSeguridad: (r.fields[detalleEquiposFields.PIN_SEGURIDAD] as string) || null,
        soporteBase: (r.fields[detalleEquiposFields.SOPORTE_BASE] as string) || null,
        completitudElementos: (r.fields[detalleEquiposFields.COMPLETITUD] as string) || null,
        estadoContenedor: (r.fields[detalleEquiposFields.ESTADO_CONTENEDOR] as string) || null,
        estructura: (r.fields[detalleEquiposFields.ESTRUCTURA] as string) || null,
        correasArnes: (r.fields[detalleEquiposFields.CORREAS] as string) || null,
        fechaVencimiento: (r.fields[detalleEquiposFields.FECHA_VENCIMIENTO] as string) || null,
        observaciones: (r.fields[detalleEquiposFields.OBSERVACIONES] as string) || "",
        equipoNombre: equipoInfo?.nombre || "",
        equipoCodigo: equipoInfo?.codigo || "",
      };
    });

    // 3. Obtener responsables
    const respUrl = getSGSSTUrl(airtableSGSSTConfig.respEquiposTableId);
    const respParams = new URLSearchParams({
      filterByFormula: `FIND("${id}", ARRAYJOIN({${respEquiposFields.INSPECCION_LINK}}))`,
      returnFieldsByFieldId: "true",
    });

    const respRes = await fetch(`${respUrl}?${respParams.toString()}`, {
      headers: getSGSSTHeaders(),
      cache: "no-store",
    });

    let responsables: { tipo: string; nombre: string; cedula: string; cargo: string }[] = [];
    if (respRes.ok) {
      const respData: AirtableListResponse = await respRes.json();
      responsables = respData.records.map((r) => ({
        tipo: (r.fields[respEquiposFields.TIPO] as string) || "",
        nombre: (r.fields[respEquiposFields.NOMBRE] as string) || "",
        cedula: (r.fields[respEquiposFields.CEDULA] as string) || "",
        cargo: (r.fields[respEquiposFields.CARGO] as string) || "",
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        ...inspeccion,
        detalles,
        responsables,
        totalEquipos: detalles.length,
      },
    });
  } catch (error) {
    console.error("Error en GET /api/inspecciones-equipos/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
