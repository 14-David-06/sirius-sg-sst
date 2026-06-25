// GET /api/politicas/estadisticas?politicaId=xxx
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";
import { airtableConfig, getAirtableUrl, getAirtableHeaders } from "@/infrastructure/config/airtable";

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

    const PF = airtableConfig.personalFields;

    // 1. Obtener todos los empleados activos usando Field IDs
    const filterPersonal = `{${PF.ESTADO_ACTIVIDAD}} = "Activo"`;
    const urlPersonal = `${getAirtableUrl(airtableConfig.personalTableId)}?returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(filterPersonal)}`;
    const resPersonal = await fetch(urlPersonal, {
      method: "GET",
      headers: getAirtableHeaders(),
    });

    if (!resPersonal.ok) {
      console.error("Error al obtener personal:", await resPersonal.text());
      return NextResponse.json(
        { success: false, error: "Error al obtener personal" },
        { status: resPersonal.status }
      );
    }

    const dataPersonal = await resPersonal.json();

    // 2. Obtener TODAS las firmas (sin filtro) y filtrar en código
    // IMPORTANTE: No podemos usar field IDs dentro de filterByFormula, solo para acceder a datos
    const FP = airtableSGSSTConfig.firmasPoliticasFields;
    const urlFirmas = `${getSGSSTUrl(airtableSGSSTConfig.firmasPoliticasTableId)}?returnFieldsByFieldId=true`;

    console.log("🔍 [ESTADISTICAS] Consultando todas las firmas para filtrar en código");
    console.log("📋 [ESTADISTICAS] Política ID buscada:", politicaId);
    console.log("📋 [ESTADISTICAS] Field ID POLITICA_LINK:", FP.POLITICA_LINK);

    const resFirmas = await fetch(urlFirmas, {
      method: "GET",
      headers: getSGSSTHeaders(),
    });

    let dataFirmas = { records: [] };
    if (resFirmas.ok) {
      dataFirmas = await resFirmas.json();
      console.log("✅ [ESTADISTICAS] Total firmas en tabla:", dataFirmas.records.length);
    } else {
      const errorText = await resFirmas.text();
      console.error("❌ [ESTADISTICAS] Error al obtener firmas:", errorText);
    }

    // 3. Filtrar firmas de esta política y crear mapa de quién ha firmado
    const empleadosFirmaron = new Set<string>();
    const firmasDetalle: Record<string, any> = {};

    dataFirmas.records.forEach((firma: any) => {
      const politicaLinks = firma.fields[FP.POLITICA_LINK];

      // Verificar si esta firma pertenece a la política que buscamos
      if (politicaLinks && Array.isArray(politicaLinks) && politicaLinks.includes(politicaId)) {
        const idEmp = firma.fields[FP.ID_EMPLEADO_CORE];
        console.log("👤 [ESTADISTICAS] Firma encontrada - ID Empleado:", idEmp);

        if (idEmp) {
          empleadosFirmaron.add(idEmp);
          firmasDetalle[idEmp] = {
            fecha: firma.fields[FP.FECHA_FIRMA],
            nombre: firma.fields[FP.NOMBRE_EMPLEADO],
          };
        }
      }
    });

    console.log("📊 [ESTADISTICAS] Total empleados que firmaron esta política:", empleadosFirmaron.size);
    console.log("📊 [ESTADISTICAS] IDs empleados firmaron:", Array.from(empleadosFirmaron));

    // 4. Clasificar empleados
    const firmaron: any[] = [];
    const pendientes: any[] = [];

    dataPersonal.records.forEach((emp: any) => {
      const idEmpleado = emp.fields[PF.ID_EMPLEADO];
      const nombreCompleto = emp.fields[PF.NOMBRE_COMPLETO];
      const rolLookup = emp.fields[PF.ROL_LOOKUP];
      const cargo = Array.isArray(rolLookup) ? rolLookup[0] : (rolLookup || "");

      const empleadoData = {
        id: emp.id,
        idEmpleado,
        nombreCompleto,
        cargo,
      };

      if (empleadosFirmaron.has(idEmpleado)) {
        firmaron.push({
          ...empleadoData,
          fechaFirma: firmasDetalle[idEmpleado]?.fecha,
        });
      } else {
        pendientes.push(empleadoData);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        total: dataPersonal.records.length,
        totalFirmaron: firmaron.length,
        totalPendientes: pendientes.length,
        porcentajeFirmado: ((firmaron.length / dataPersonal.records.length) * 100).toFixed(1),
        firmaron: firmaron.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)),
        pendientes: pendientes.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)),
      },
    });
  } catch (error) {
    console.error("Error en GET /api/politicas/estadisticas:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
