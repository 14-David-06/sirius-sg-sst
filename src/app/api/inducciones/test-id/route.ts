// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/test-id
// GET - Probar generación de próximo ID
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableInduccionesConfig, createInduccionesClient } from "@/infrastructure/config/airtableInducciones";

const RF = airtableInduccionesConfig.registrosFields;
const TF = airtableInduccionesConfig.tokensFields;

async function obtenerUltimoIdInduccion(): Promise<string | null> {
  const client = createInduccionesClient();
  const url = `${client.baseUrl}/${airtableInduccionesConfig.registrosTableId}`;

  console.log('[TEST obtenerUltimoIdInduccion] Consultando último ID...');

  const params = new URLSearchParams({
    pageSize: "100",
  });

  const response = await fetch(`${url}?${params}`, {
    headers: client.headers,
  });

  if (!response.ok) {
    console.error('[TEST obtenerUltimoIdInduccion] Error en la consulta:', await response.text());
    return null;
  }

  const data = await response.json();

  if (data.records.length === 0) {
    console.log('[TEST obtenerUltimoIdInduccion] No hay registros, iniciando en IND-0001');
    return null;
  }

  console.log('[TEST obtenerUltimoIdInduccion] Registros obtenidos:', data.records.length);
  console.log('[TEST obtenerUltimoIdInduccion] Primer registro (campos):', JSON.stringify(Object.keys(data.records[0].fields || {})));

  // Ordenar en JS por número extraído
  const ids = data.records
    .map((r: any) => {
      const idValue = r.fields['ID_Induccion'] ||
                      r.fields[RF.ID_INDUCCION] ||
                      r.fields['ID Induccion'] ||
                      r.fields['ID Inducción'];

      if (!idValue) {
        console.warn('[TEST obtenerUltimoIdInduccion] Registro sin ID_Induccion:', r.id);
      }

      return idValue;
    })
    .filter(Boolean)
    .map((id: string) => ({
      original: id,
      numero: parseInt(id.split('-')[1] || '0', 10)
    }))
    .sort((a: { original: string; numero: number }, b: { original: string; numero: number }) => b.numero - a.numero); // DESC

  const lastId = ids.length > 0 ? ids[0].original : null;
  console.log(`[TEST obtenerUltimoIdInduccion] Último ID encontrado: ${lastId || 'NINGUNO (primera inducción)'}`);
  console.log(`[TEST obtenerUltimoIdInduccion] Total de IDs válidos extraídos: ${ids.length}`);
  console.log(`[TEST obtenerUltimoIdInduccion] Todos los IDs ordenados:`, ids.map(i => i.original));

  return lastId;
}

async function obtenerUltimoIdToken(): Promise<string | null> {
  const client = createInduccionesClient();
  const url = `${client.baseUrl}/${airtableInduccionesConfig.tokensTableId}`;

  console.log('[TEST obtenerUltimoIdToken] Consultando último Token_ID...');

  const params = new URLSearchParams({
    pageSize: "100",
  });

  const response = await fetch(`${url}?${params}`, {
    headers: client.headers,
  });

  if (!response.ok) {
    console.error('[TEST obtenerUltimoIdToken] Error en la consulta:', await response.text());
    return null;
  }

  const data = await response.json();

  if (data.records.length === 0) {
    console.log('[TEST obtenerUltimoIdToken] No hay registros, iniciando en TKNI-0001');
    return null;
  }

  console.log('[TEST obtenerUltimoIdToken] Registros obtenidos:', data.records.length);
  console.log('[TEST obtenerUltimoIdToken] Primer registro (campos):', JSON.stringify(Object.keys(data.records[0].fields || {})));

  // Ordenar en JS por número extraído
  const ids = data.records
    .map((r: any) => {
      const tokenValue = r.fields['Token_ID'] ||
                         r.fields[TF.TOKEN_ID] ||
                         r.fields['Token ID'] ||
                         r.fields['TokenID'];

      if (!tokenValue) {
        console.warn('[TEST obtenerUltimoIdToken] Registro sin Token_ID:', r.id);
      }

      return tokenValue;
    })
    .filter(Boolean)
    .map((id: string) => ({
      original: id,
      numero: parseInt(id.split('-')[1] || '0', 10)
    }))
    .sort((a: { original: string; numero: number }, b: { original: string; numero: number }) => b.numero - a.numero); // DESC

  const lastId = ids.length > 0 ? ids[0].original : null;
  console.log(`[TEST obtenerUltimoIdToken] Último Token_ID encontrado: ${lastId || 'NINGUNO'}`);
  console.log(`[TEST obtenerUltimoIdToken] Total de Token_IDs válidos extraídos: ${ids.length}`);
  console.log(`[TEST obtenerUltimoIdToken] Todos los Token_IDs ordenados:`, ids.map(i => i.original));

  return lastId;
}

// GET /api/inducciones/test-id
export async function GET(request: NextRequest) {
  try {
    const lastInduccionId = await obtenerUltimoIdInduccion();
    const newInduccionNum = lastInduccionId ? parseInt(lastInduccionId.split("-")[1]) + 1 : 1;
    const nextInduccionId = `IND-${String(newInduccionNum).padStart(4, "0")}`;

    const lastTokenId = await obtenerUltimoIdToken();
    const newTokenNum = lastTokenId ? parseInt(lastTokenId.split("-")[1]) + 1 : 1;
    const nextTokenId = `TKNI-${String(newTokenNum).padStart(4, "0")}`;

    return NextResponse.json({
      success: true,
      data: {
        inducciones: {
          ultimoIdEncontrado: lastInduccionId,
          proximoIdGenerado: nextInduccionId,
        },
        tokens: {
          ultimoIdEncontrado: lastTokenId,
          proximoIdGenerado: nextTokenId,
        },
      },
      message: "Si los próximos IDs son correctos, el problema está resuelto.",
    });
  } catch (error: any) {
    console.error("Error en test de IDs:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error en test de IDs",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
