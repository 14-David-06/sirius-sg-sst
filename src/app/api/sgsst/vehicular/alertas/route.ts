// GET — Historial de alertas enviadas
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entidadTipo = searchParams.get("entidadTipo"); // documento | licencia
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");

    const config = airtableSGSSTConfig;
    const url = getSGSSTUrl(config.alertasVehicularesTableId);
    const headers = getSGSSTHeaders();

    let filterFormula = "";
    const condiciones: string[] = [];

    if (entidadTipo) {
      condiciones.push(`{${config.alertasVehicularesFields.ENTIDAD_TIPO}} = '${entidadTipo}'`);
    }
    if (fechaDesde) {
      condiciones.push(`IS_AFTER({${config.alertasVehicularesFields.FECHA_ENVIO}}, '${fechaDesde}')`);
    }
    if (fechaHasta) {
      condiciones.push(`IS_BEFORE({${config.alertasVehicularesFields.FECHA_ENVIO}}, '${fechaHasta}')`);
    }

    if (condiciones.length > 0) {
      filterFormula = condiciones.length === 1 ? condiciones[0] : `AND(${condiciones.join(", ")})`;
    }

    const queryUrl = filterFormula ? `${url}?filterByFormula=${encodeURIComponent(filterFormula)}` : url;
    const response = await fetch(queryUrl, { headers });

    if (!response.ok) {
      return NextResponse.json({ error: "Error al consultar historial" }, { status: response.status });
    }

    const data = await response.json();
    const alertas = (data.records || []).map((rec: any) => ({
      id: rec.id,
      entidadTipo: rec.fields[config.alertasVehicularesFields.ENTIDAD_TIPO],
      entidadId: rec.fields[config.alertasVehicularesFields.ENTIDAD_ID],
      tipoAlerta: rec.fields[config.alertasVehicularesFields.TIPO_ALERTA],
      fechaEnvio: rec.fields[config.alertasVehicularesFields.FECHA_ENVIO],
      destinatario: rec.fields[config.alertasVehicularesFields.DESTINATARIO],
      enviado: rec.fields[config.alertasVehicularesFields.ENVIADO],
    }));

    // Ordenar por fecha desc (más recientes primero)
    alertas.sort((a: any, b: any) => new Date(b.fechaEnvio).getTime() - new Date(a.fechaEnvio).getTime());

    return NextResponse.json({
      success: true,
      total: alertas.length,
      alertas,
    });
  } catch (error) {
    console.error("Error en GET /api/sgsst/vehicular/alertas:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
