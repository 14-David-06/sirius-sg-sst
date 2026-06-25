// GET /api/politicas/debug-firmas?politicaId=xxx
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const politicaId = searchParams.get("politicaId");

    if (!politicaId) {
      return NextResponse.json(
        { success: false, error: "Falta el ID de la política" },
        { status: 400 }
      );
    }

    const FP = airtableSGSSTConfig.firmasPoliticasFields;

    console.log("=== DEBUG FIRMAS ===");
    console.log("Política ID:", politicaId);
    console.log("Field ID POLITICA_LINK:", FP.POLITICA_LINK);
    console.log("Field ID ID_EMPLEADO_CORE:", FP.ID_EMPLEADO_CORE);

    // Query 1: Sin filtro (todas las firmas)
    const urlTodasFirmas = `${getSGSSTUrl(airtableSGSSTConfig.firmasPoliticasTableId)}?returnFieldsByFieldId=true`;
    const resTodas = await fetch(urlTodasFirmas, {
      method: "GET",
      headers: getSGSSTHeaders(),
    });

    let todasFirmas = { records: [] };
    if (resTodas.ok) {
      todasFirmas = await resTodas.json();
      console.log("Total firmas en tabla:", todasFirmas.records.length);
      console.log("Primera firma (sample):", JSON.stringify(todasFirmas.records[0], null, 2));
    } else {
      console.error("Error obteniendo todas las firmas:", await resTodas.text());
    }

    // Query 2: Con filtro FIND
    const filterFirmas = `FIND("${politicaId}", ARRAYJOIN({${FP.POLITICA_LINK}})) > 0`;
    console.log("Filter formula:", filterFirmas);

    const urlFirmas = `${getSGSSTUrl(airtableSGSSTConfig.firmasPoliticasTableId)}?returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(filterFirmas)}`;
    console.log("URL completa:", urlFirmas);

    const resFirmas = await fetch(urlFirmas, {
      method: "GET",
      headers: getSGSSTHeaders(),
    });

    let dataFirmas = { records: [] };
    if (resFirmas.ok) {
      dataFirmas = await resFirmas.json();
      console.log("Firmas filtradas:", dataFirmas.records.length);
      console.log("Firmas filtradas (data):", JSON.stringify(dataFirmas.records, null, 2));
    } else {
      const errorText = await resFirmas.text();
      console.error("Error al obtener firmas filtradas:", errorText);
      return NextResponse.json({
        success: false,
        error: errorText,
        debug: {
          politicaId,
          filterFormula: filterFirmas,
          url: urlFirmas,
        }
      }, { status: resFirmas.status });
    }

    // Extraer IDs de empleados
    const empleados = dataFirmas.records.map((firma: any) => ({
      id: firma.id,
      idEmpleado: firma.fields[FP.ID_EMPLEADO_CORE],
      nombreEmpleado: firma.fields[FP.NOMBRE_EMPLEADO],
      fechaFirma: firma.fields[FP.FECHA_FIRMA],
      politicaLink: firma.fields[FP.POLITICA_LINK],
    }));

    return NextResponse.json({
      success: true,
      debug: {
        politicaId,
        filterFormula: filterFirmas,
        totalFirmasEnTabla: todasFirmas.records.length,
        firmasFiltradas: dataFirmas.records.length,
        empleados,
        fieldIds: {
          POLITICA_LINK: FP.POLITICA_LINK,
          ID_EMPLEADO_CORE: FP.ID_EMPLEADO_CORE,
          NOMBRE_EMPLEADO: FP.NOMBRE_EMPLEADO,
          FECHA_FIRMA: FP.FECHA_FIRMA,
        },
        sampleFirma: todasFirmas.records[0],
      },
    });
  } catch (error: any) {
    console.error("Error en debug-firmas:", error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
