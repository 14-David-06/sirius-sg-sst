// POST/PUT — Gestión de licencias de conducción
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

const CATEGORIAS = ["A1", "A2", "B1", "B2", "B3", "C1", "C2", "C3"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idPersonalCore, numeroLicencia, categoria, fechaExpedicion, fechaVencimiento, organismoTransito, urlLicencia } = body;

    if (!idPersonalCore || !numeroLicencia || !categoria || !fechaVencimiento) {
      return NextResponse.json({ error: "Campos requeridos: idPersonalCore, numeroLicencia, categoria, fechaVencimiento" }, { status: 400 });
    }

    if (!CATEGORIAS.includes(categoria)) {
      return NextResponse.json({ error: `Categoría inválida. Valores permitidos: ${CATEGORIAS.join(", ")}` }, { status: 400 });
    }

    const config = airtableSGSSTConfig;
    const url = getSGSSTUrl(config.licenciasConduccionTableId);
    const headers = getSGSSTHeaders();

    // Verificar si ya existe licencia para este colaborador
    const checkFormula = `{${config.licenciasConduccionFields.ID_PERSONAL_CORE}} = '${idPersonalCore}'`;
    const checkResponse = await fetch(`${url}?filterByFormula=${encodeURIComponent(checkFormula)}`, { headers });
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.records && checkData.records.length > 0) {
        return NextResponse.json({ error: "El colaborador ya tiene una licencia registrada. Use PUT para actualizar." }, { status: 409 });
      }
    }

    const payload = {
      fields: {
        [config.licenciasConduccionFields.ID_PERSONAL_CORE]: idPersonalCore,
        [config.licenciasConduccionFields.NUMERO_LICENCIA]: numeroLicencia,
        [config.licenciasConduccionFields.CATEGORIA]: categoria,
        [config.licenciasConduccionFields.FECHA_EXPEDICION]: fechaExpedicion || "",
        [config.licenciasConduccionFields.FECHA_VENCIMIENTO]: fechaVencimiento,
        [config.licenciasConduccionFields.ORGANISMO_TRANSITO]: organismoTransito || "",
        [config.licenciasConduccionFields.URL_LICENCIA]: urlLicencia || "",
        [config.licenciasConduccionFields.CREATED_AT]: new Date().toISOString(),
      },
    };

    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!response.ok) {
      return NextResponse.json({ error: "Error al crear licencia" }, { status: response.status });
    }

    const created = await response.json();
    return NextResponse.json({ success: true, licencia: { id: created.id, ...created.fields } });
  } catch (error) {
    console.error("Error en POST /api/sgsst/vehicular/licencias:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, numeroLicencia, categoria, fechaExpedicion, fechaVencimiento, organismoTransito, urlLicencia } = body;

    if (!id) {
      return NextResponse.json({ error: "Campo requerido: id" }, { status: 400 });
    }

    if (categoria && !CATEGORIAS.includes(categoria)) {
      return NextResponse.json({ error: `Categoría inválida. Valores permitidos: ${CATEGORIAS.join(", ")}` }, { status: 400 });
    }

    const config = airtableSGSSTConfig;
    const url = `${getSGSSTUrl(config.licenciasConduccionTableId)}/${id}`;
    const headers = getSGSSTHeaders();

    const fields: Record<string, any> = {};
    if (numeroLicencia !== undefined) fields[config.licenciasConduccionFields.NUMERO_LICENCIA] = numeroLicencia;
    if (categoria !== undefined) fields[config.licenciasConduccionFields.CATEGORIA] = categoria;
    if (fechaExpedicion !== undefined) fields[config.licenciasConduccionFields.FECHA_EXPEDICION] = fechaExpedicion;
    if (fechaVencimiento !== undefined) fields[config.licenciasConduccionFields.FECHA_VENCIMIENTO] = fechaVencimiento;
    if (organismoTransito !== undefined) fields[config.licenciasConduccionFields.ORGANISMO_TRANSITO] = organismoTransito;
    if (urlLicencia !== undefined) fields[config.licenciasConduccionFields.URL_LICENCIA] = urlLicencia;

    const response = await fetch(url, { method: "PATCH", headers, body: JSON.stringify({ fields }) });
    if (!response.ok) {
      return NextResponse.json({ error: "Error al actualizar licencia" }, { status: response.status });
    }

    const updated = await response.json();
    return NextResponse.json({ success: true, licencia: { id: updated.id, ...updated.fields } });
  } catch (error) {
    console.error("Error en PUT /api/sgsst/vehicular/licencias:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
