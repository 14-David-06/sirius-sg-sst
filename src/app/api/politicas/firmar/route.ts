// POST /api/politicas/firmar
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { politicaId, idEmpleado, nombreEmpleado, firma } = body;

    if (!politicaId || !idEmpleado || !nombreEmpleado || !firma) {
      return NextResponse.json(
        { success: false, error: "Faltan datos requeridos" },
        { status: 400 }
      );
    }

    const url = getSGSSTUrl(airtableSGSSTConfig.firmasPoliticasTableId);
    
    const payload = {
      records: [
        {
          fields: {
            "ID Empleado Core": idEmpleado,
            "Política": [politicaId],
            "Nombre Empleado": nombreEmpleado,
            "Fecha Firma": new Date().toISOString(),
            "Firma": firma,
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
        { success: false, error: "Error al guardar firma" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: { id: data.records[0].id },
    });
  } catch (error) {
    console.error("Error en POST /api/politicas/firmar:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
