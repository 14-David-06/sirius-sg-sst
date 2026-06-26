// POST/PUT — Gestión de SOAT y Tecnomecánica
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vehiculoId, tipoDocumento, numeroDocumento, entidadEmisora, fechaExpedicion, fechaVencimiento, urlDocumento } = body;

    if (!vehiculoId || !tipoDocumento || !fechaVencimiento) {
      return NextResponse.json({ error: "Campos requeridos: vehiculoId, tipoDocumento, fechaVencimiento" }, { status: 400 });
    }

    if (!["SOAT", "Tecnomecánica"].includes(tipoDocumento)) {
      return NextResponse.json({ error: "tipoDocumento debe ser 'SOAT' o 'Tecnomecánica'" }, { status: 400 });
    }

    if (fechaExpedicion && new Date(fechaExpedicion) > new Date(fechaVencimiento)) {
      return NextResponse.json({ error: "fechaExpedicion no puede ser posterior a fechaVencimiento" }, { status: 400 });
    }

    const config = airtableSGSSTConfig;
    const url = getSGSSTUrl(config.documentosVehicularesTableId);
    const headers = getSGSSTHeaders();

    const payload = {
      fields: {
        [config.documentosVehicularesFields.VEHICULO_LINK]: [vehiculoId],
        [config.documentosVehicularesFields.TIPO_DOCUMENTO]: tipoDocumento,
        [config.documentosVehicularesFields.NUMERO_DOCUMENTO]: numeroDocumento || "",
        [config.documentosVehicularesFields.ENTIDAD_EMISORA]: entidadEmisora || "",
        [config.documentosVehicularesFields.FECHA_EXPEDICION]: fechaExpedicion || "",
        [config.documentosVehicularesFields.FECHA_VENCIMIENTO]: fechaVencimiento,
        [config.documentosVehicularesFields.URL_DOCUMENTO]: urlDocumento || "",
        [config.documentosVehicularesFields.CREATED_AT]: new Date().toISOString(),
      },
    };

    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!response.ok) {
      return NextResponse.json({ error: "Error al crear documento" }, { status: response.status });
    }

    const created = await response.json();
    return NextResponse.json({ success: true, documento: { id: created.id, ...created.fields } });
  } catch (error) {
    console.error("Error en POST /api/sgsst/vehicular/documentos:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, numeroDocumento, entidadEmisora, fechaExpedicion, fechaVencimiento, urlDocumento } = body;

    if (!id) {
      return NextResponse.json({ error: "Campo requerido: id" }, { status: 400 });
    }

    const config = airtableSGSSTConfig;
    const url = `${getSGSSTUrl(config.documentosVehicularesTableId)}/${id}`;
    const headers = getSGSSTHeaders();

    const fields: Record<string, any> = {};
    if (numeroDocumento !== undefined) fields[config.documentosVehicularesFields.NUMERO_DOCUMENTO] = numeroDocumento;
    if (entidadEmisora !== undefined) fields[config.documentosVehicularesFields.ENTIDAD_EMISORA] = entidadEmisora;
    if (fechaExpedicion !== undefined) fields[config.documentosVehicularesFields.FECHA_EXPEDICION] = fechaExpedicion;
    if (fechaVencimiento !== undefined) fields[config.documentosVehicularesFields.FECHA_VENCIMIENTO] = fechaVencimiento;
    if (urlDocumento !== undefined) fields[config.documentosVehicularesFields.URL_DOCUMENTO] = urlDocumento;

    const response = await fetch(url, { method: "PATCH", headers, body: JSON.stringify({ fields }) });
    if (!response.ok) {
      return NextResponse.json({ error: "Error al actualizar documento" }, { status: response.status });
    }

    const updated = await response.json();
    return NextResponse.json({ success: true, documento: { id: updated.id, ...updated.fields } });
  } catch (error) {
    console.error("Error en PUT /api/sgsst/vehicular/documentos:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
