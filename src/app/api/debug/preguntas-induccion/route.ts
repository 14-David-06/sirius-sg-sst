// Endpoint temporal para revisar preguntas de inducción
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const AIRTABLE_SGSST_API_TOKEN = process.env.AIRTABLE_SGSST_API_TOKEN;
    const AIRTABLE_SGSST_BASE_ID = process.env.AIRTABLE_SGSST_BASE_ID;
    const BANCO_TABLE_ID = process.env.AIRTABLE_PRG_BANCO_TABLE_ID;

    // Field IDs
    const CODIGO_FIELD = process.env.AIRTABLE_PRG_BANCO_CODIGO;
    const TEXTO_FIELD = process.env.AIRTABLE_PRG_BANCO_TEXTO;
    const TIPO_FIELD = process.env.AIRTABLE_PRG_BANCO_TIPO;
    const OPCIONES_FIELD = process.env.AIRTABLE_PRG_BANCO_OPCIONES_JSON;
    const RESPUESTA_FIELD = process.env.AIRTABLE_PRG_BANCO_RESPUESTA_CORRECTA;
    const EXPLICACION_FIELD = process.env.AIRTABLE_PRG_BANCO_EXPLICACION;
    const CATEGORIA_FIELD = process.env.AIRTABLE_PRG_BANCO_CATEGORIA;

    console.log('[DEBUG] Token:', AIRTABLE_SGSST_API_TOKEN ? 'OK' : 'MISSING');
    console.log('[DEBUG] Base ID:', AIRTABLE_SGSST_BASE_ID);
    console.log('[DEBUG] Table ID:', BANCO_TABLE_ID);

    const headers = {
      Authorization: `Bearer ${AIRTABLE_SGSST_API_TOKEN}`,
      "Content-Type": "application/json",
    };

    // Buscar todas las preguntas (sin filtro, luego filtramos en JS)
    const url = `https://api.airtable.com/v0/${AIRTABLE_SGSST_BASE_ID}/${BANCO_TABLE_ID}`;
    const params = new URLSearchParams({
      pageSize: "100",
      returnFieldsByFieldId: "false", // Devolver nombres de campo, no IDs
    });

    console.log('[DEBUG] URL:', `${url}?${params}`);

    const response = await fetch(`${url}?${params}`, { headers });

    console.log('[DEBUG] Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEBUG] Error:', errorText);
      return NextResponse.json(
        { success: false, error: `Airtable error: ${response.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    console.log('[DEBUG] Records found:', data.records?.length || 0);

    if (!data.records || data.records.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No se encontraron preguntas de inducción",
      });
    }

    // Debug: ver campos del primer registro
    if (data.records.length > 0) {
      console.log('[DEBUG] Primer registro campos:', Object.keys(data.records[0].fields));
      console.log('[DEBUG] Primer registro:', JSON.stringify(data.records[0].fields, null, 2));
    }

    const preguntas = data.records.map((r: any, index: number) => ({
      numero: index + 1,
      id: r.id,
      codigo: r.fields[CODIGO_FIELD!] || r.fields.Codigo || "SIN_CODIGO",
      texto: r.fields[TEXTO_FIELD!] || r.fields.Texto_Pregunta || "Sin texto",
      tipo: r.fields[TIPO_FIELD!] || r.fields.Tipo || "Desconocido",
      opciones: r.fields[OPCIONES_FIELD!] ? JSON.parse(r.fields[OPCIONES_FIELD!]) : (r.fields.Opciones_JSON ? JSON.parse(r.fields.Opciones_JSON) : []),
      respuestaCorrecta: r.fields[RESPUESTA_FIELD!] || r.fields.Respuesta_Correcta || "No especificada",
      explicacion: r.fields[EXPLICACION_FIELD!] || r.fields.Explicacion || "Sin explicación",
      categoria: Array.isArray(r.fields[CATEGORIA_FIELD!]) ? r.fields[CATEGORIA_FIELD!].join(", ") : (r.fields[CATEGORIA_FIELD!] || r.fields.Categoria || "Sin categoría"),
    }));

    // Ordenar por código
    preguntas.sort((a: any, b: any) => a.codigo.localeCompare(b.codigo));

    // Filtrar preguntas 23 y 24
    const pregunta23 = preguntas[22]; // índice 22 = pregunta 23
    const pregunta24 = preguntas[23]; // índice 23 = pregunta 24

    return NextResponse.json({
      success: true,
      total: preguntas.length,
      pregunta23,
      pregunta24,
      // Solo las primeras 30 preguntas para no saturar la respuesta
      muestra: preguntas.slice(0, 30),
    });
  } catch (error: any) {
    console.error('[DEBUG] Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
