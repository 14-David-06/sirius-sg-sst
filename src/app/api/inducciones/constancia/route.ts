// ══════════════════════════════════════════════════════════
// POST /api/inducciones/constancia
// Guardar constancia de realización de inducción
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableInduccionesConfig } from "@/infrastructure/config/airtableInducciones";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      induccionId,
      fechaRealizacion,
      lugarRealizacion,
      horaInicio,
      horaFin,
      responsableSST,
      observaciones,
    } = body;

    // Validar campos requeridos
    if (!induccionId || !fechaRealizacion || !lugarRealizacion || !horaInicio || !horaFin || !responsableSST) {
      return NextResponse.json(
        {
          success: false,
          message: "Faltan campos requeridos: induccionId, fechaRealizacion, lugarRealizacion, horaInicio, horaFin, responsableSST",
        },
        { status: 400 }
      );
    }

    const { constanciasTableId, constanciasFields: CF } = airtableInduccionesConfig;
    const { registrosTableId, registrosFields: RF } = airtableInduccionesConfig;
    const { baseUrl, headers } = createInduccionesClient();

    // 1. Buscar el registro de inducción para obtener su Record ID
    const filterFormula = `{ID_Induccion} = '${induccionId}'`;
    const searchUrl = `${baseUrl}/${registrosTableId}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;

    const searchRes = await fetch(searchUrl, { headers, cache: "no-store" });

    if (!searchRes.ok) {
      console.error("[Constancia] Error buscando inducción:", await searchRes.text());
      return NextResponse.json(
        { success: false, message: "Error buscando la inducción" },
        { status: 500 }
      );
    }

    const searchData = await searchRes.json();
    const registroRecord = searchData.records?.[0];

    if (!registroRecord) {
      return NextResponse.json(
        { success: false, message: "Inducción no encontrada" },
        { status: 404 }
      );
    }

    // 2. Generar ID de constancia
    const timestamp = Date.now().toString().slice(-6);
    const idConstancia = `CONST-IND-${timestamp}`;

    // 3. Crear registro de constancia en Airtable
    const createUrl = `${baseUrl}/${constanciasTableId}`;
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        records: [
          {
            fields: {
              [CF.ID_CONSTANCIA]: idConstancia,
              [CF.ID_INDUCCION]: [registroRecord.id], // Link al registro
              [CF.FECHA_REALIZACION]: fechaRealizacion,
              [CF.LUGAR_REALIZACION]: lugarRealizacion,
              [CF.HORA_INICIO]: horaInicio,
              [CF.HORA_FIN]: horaFin,
              [CF.RESPONSABLE_SST]: responsableSST,
              [CF.OBSERVACIONES]: observaciones || "",
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error("[Constancia] Error creando constancia:", errorText);
      return NextResponse.json(
        { success: false, message: "Error al guardar la constancia" },
        { status: 500 }
      );
    }

    const createData = await createRes.json();
    const constanciaRecord = createData.records[0];

    return NextResponse.json({
      success: true,
      message: "Constancia guardada exitosamente",
      data: {
        id: constanciaRecord.id,
        idConstancia,
        induccionId,
        fechaRealizacion,
        lugarRealizacion,
        horaInicio,
        horaFin,
        responsableSST,
        observaciones,
      },
    });
  } catch (error: any) {
    console.error("[Constancia] Error en POST:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/inducciones/constancia — Actualizar constancia existente
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      induccionId,
      fechaRealizacion,
      lugarRealizacion,
      horaInicio,
      horaFin,
      responsableSST,
      observaciones,
    } = body;

    // Validar que venga el induccionId para buscar
    if (!induccionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Campo requerido: induccionId",
        },
        { status: 400 }
      );
    }

    const { constanciasTableId, constanciasFields: CF } = airtableInduccionesConfig;
    const { registrosTableId, registrosFields: RF } = airtableInduccionesConfig;
    const { baseUrl, headers } = createInduccionesClient();

    // 1. Primero buscar el registro de inducción para obtener su Record ID
    const induccionFilter = `{ID_Induccion} = '${induccionId}'`;
    const induccionUrl = `${baseUrl}/${registrosTableId}?filterByFormula=${encodeURIComponent(induccionFilter)}&maxRecords=1`;

    const induccionRes = await fetch(induccionUrl, { headers, cache: "no-store" });

    if (!induccionRes.ok) {
      console.error("[Constancia PATCH] Error buscando inducción:", await induccionRes.text());
      return NextResponse.json(
        { success: false, message: "Error buscando la inducción" },
        { status: 500 }
      );
    }

    const induccionData = await induccionRes.json();
    const induccionRecord = induccionData.records?.[0];

    if (!induccionRecord) {
      return NextResponse.json(
        { success: false, message: "Inducción no encontrada" },
        { status: 404 }
      );
    }

    // 2. Buscar la constancia vinculada a ese record ID
    // Usamos FIND() para buscar en el array de linked records
    const constanciaFilter = `FIND("${induccionRecord.id}", {ID_Induccion}) > 0`;
    const searchUrl = `${baseUrl}/${constanciasTableId}?filterByFormula=${encodeURIComponent(constanciaFilter)}&maxRecords=1`;

    const searchRes = await fetch(searchUrl, { headers, cache: "no-store" });

    if (!searchRes.ok) {
      console.error("[Constancia PATCH] Error buscando constancia:", await searchRes.text());
      return NextResponse.json(
        { success: false, message: "Error buscando la constancia" },
        { status: 500 }
      );
    }

    const searchData = await searchRes.json();
    const constanciaRecord = searchData.records?.[0];

    if (!constanciaRecord) {
      return NextResponse.json(
        { success: false, message: "Constancia no encontrada para esta inducción" },
        { status: 404 }
      );
    }

    // 2. Preparar campos a actualizar (solo los que vengan en el body)
    const fieldsToUpdate: any = {};

    if (fechaRealizacion !== undefined) fieldsToUpdate[CF.FECHA_REALIZACION] = fechaRealizacion;
    if (lugarRealizacion !== undefined) fieldsToUpdate[CF.LUGAR_REALIZACION] = lugarRealizacion;
    if (horaInicio !== undefined) fieldsToUpdate[CF.HORA_INICIO] = horaInicio;
    if (horaFin !== undefined) fieldsToUpdate[CF.HORA_FIN] = horaFin;
    if (responsableSST !== undefined) fieldsToUpdate[CF.RESPONSABLE_SST] = responsableSST;
    if (observaciones !== undefined) fieldsToUpdate[CF.OBSERVACIONES] = observaciones;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json(
        { success: false, message: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    // 3. Actualizar en Airtable
    const updateUrl = `${baseUrl}/${constanciasTableId}/${constanciaRecord.id}`;
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        fields: fieldsToUpdate,
      }),
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error("[Constancia PATCH] Error actualizando:", errorText);
      return NextResponse.json(
        { success: false, message: "Error al actualizar la constancia" },
        { status: 500 }
      );
    }

    const updateData = await updateRes.json();

    return NextResponse.json({
      success: true,
      message: "Constancia actualizada exitosamente",
      data: {
        id: updateData.id,
        fields: updateData.fields,
      },
    });
  } catch (error: any) {
    console.error("[Constancia PATCH] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

// Helper: Crear cliente Airtable
function createInduccionesClient() {
  const { apiToken, baseId, baseUrl } = airtableInduccionesConfig;

  return {
    baseUrl: `${baseUrl}/${baseId}`,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  };
}
