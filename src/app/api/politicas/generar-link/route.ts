// POST /api/politicas/generar-link
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";
import crypto from "crypto";

const TF = airtableSGSSTConfig.tokensFirmaPoliticaFields;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { politicaId, idEmpleado, diasValidos = 7 } = body;

    if (!politicaId || !idEmpleado) {
      return NextResponse.json(
        { success: false, error: "Faltan datos requeridos" },
        { status: 400 }
      );
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString("hex");

    // Calcular fechas
    const now = new Date();
    const expiration = new Date(now.getTime() + diasValidos * 24 * 60 * 60 * 1000);

    // Guardar en Airtable
    const url = getSGSSTUrl(airtableSGSSTConfig.tokensFirmaPoliticaTableId);

    const payload = {
      records: [
        {
          fields: {
            [TF.TOKEN_ID]: token,
            [TF.POLITICA_LINK]: [politicaId],
            [TF.ID_EMPLEADO_CORE]: idEmpleado,
            [TF.FECHA_GENERACION]: now.toISOString(),
            [TF.FECHA_EXPIRACION]: expiration.toISOString(),
            [TF.ESTADO]: "Activo",
          },
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: getSGSSTHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error Airtable:", errorData);
      return NextResponse.json(
        { success: false, error: "Error al generar token" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Construir URL de firma
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const firmaUrl = `${baseUrl}/firmar/politica?token=${token}`;

    return NextResponse.json({
      success: true,
      data: {
        token,
        url: firmaUrl,
        expiracion: expiration.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error en POST /api/politicas/generar-link:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
