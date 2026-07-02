// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/diagnostico
// GET - Diagnóstico de IDs (temporal)
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableInduccionesConfig, createInduccionesClient } from "@/infrastructure/config/airtableInducciones";

const RF = airtableInduccionesConfig.registrosFields;
const TF = airtableInduccionesConfig.tokensFields;

// GET /api/inducciones/diagnostico - Ver IDs actuales
export async function GET(request: NextRequest) {
  try {
    const client = createInduccionesClient();

    // 1. Consultar registros de inducciones
    const registrosUrl = `${client.baseUrl}/${airtableInduccionesConfig.registrosTableId}`;
    const registrosResponse = await fetch(`${registrosUrl}?pageSize=100`, {
      headers: client.headers,
    });

    if (!registrosResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Error consultando registros",
          error: await registrosResponse.text(),
        },
        { status: 500 }
      );
    }

    const registrosData = await registrosResponse.json();

    // 2. Consultar tokens
    const tokensUrl = `${client.baseUrl}/${airtableInduccionesConfig.tokensTableId}`;
    const tokensResponse = await fetch(`${tokensUrl}?pageSize=100`, {
      headers: client.headers,
    });

    if (!tokensResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Error consultando tokens",
          error: await tokensResponse.text(),
        },
        { status: 500 }
      );
    }

    const tokensData = await tokensResponse.json();

    // 3. Analizar registros
    const registros = registrosData.records.map((r: any) => {
      const campos = r.fields;
      return {
        recordId: r.id,
        idInduccion:
          campos["ID_Induccion"] ||
          campos[RF.ID_INDUCCION] ||
          "NO ENCONTRADO",
        idEmpleado:
          campos["ID_Empleado_CORE"] ||
          campos[RF.ID_EMPLEADO_CORE] ||
          "NO ENCONTRADO",
        nombresDisponibles: Object.keys(campos),
      };
    });

    // 4. Analizar tokens
    const tokens = tokensData.records.map((r: any) => {
      const campos = r.fields;
      return {
        recordId: r.id,
        tokenId:
          campos["Token_ID"] || campos[TF.TOKEN_ID] || "NO ENCONTRADO",
        induccionId:
          campos["Induccion_ID"] ||
          campos[TF.INDUCCION_ID] ||
          "NO ENCONTRADO",
        nombresDisponibles: Object.keys(campos),
      };
    });

    // 5. Detectar IDs duplicados
    const idsInduccion = registros.map((r: any) => r.idInduccion);
    const idsToken = tokens.map((t: any) => t.tokenId);

    const conteoInduccion: { [key: string]: number } = {};
    idsInduccion.forEach((id: string) => {
      conteoInduccion[id] = (conteoInduccion[id] || 0) + 1;
    });

    const conteoToken: { [key: string]: number } = {};
    idsToken.forEach((id: string) => {
      conteoToken[id] = (conteoToken[id] || 0) + 1;
    });

    const duplicadosInduccion = Object.entries(conteoInduccion).filter(
      ([_, count]) => count > 1
    );
    const duplicadosToken = Object.entries(conteoToken).filter(
      ([_, count]) => count > 1
    );

    return NextResponse.json({
      success: true,
      data: {
        registros: {
          total: registros.length,
          ultimosCinco: registros.slice(-5),
          duplicados: duplicadosInduccion,
        },
        tokens: {
          total: tokens.length,
          ultimosCinco: tokens.slice(-5),
          duplicados: duplicadosToken,
        },
        nombresDesCampos: {
          primerRegistro: registros[0]?.nombresDisponibles || [],
          primerToken: tokens[0]?.nombresDisponibles || [],
        },
      },
    });
  } catch (error: any) {
    console.error("Error en diagnóstico:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error en diagnóstico",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
