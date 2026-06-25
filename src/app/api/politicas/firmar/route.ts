// POST /api/politicas/firmar
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

const FF = airtableSGSSTConfig.firmasPoliticasFields;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { politicaId, idEmpleado, nombreEmpleado, firma } = body;

    console.log("✍️ [FIRMAR] Iniciando proceso de firma");
    console.log("📋 [FIRMAR] Política ID:", politicaId);
    console.log("👤 [FIRMAR] ID Empleado:", idEmpleado);
    console.log("👤 [FIRMAR] Nombre Empleado:", nombreEmpleado);

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
            [FF.ID_EMPLEADO_CORE]: idEmpleado,
            [FF.POLITICA_LINK]: [politicaId],
            [FF.NOMBRE_EMPLEADO]: nombreEmpleado,
            [FF.FECHA_FIRMA]: new Date().toISOString(),
            [FF.FIRMA]: firma,
          },
        },
      ],
    };

    console.log("📦 [FIRMAR] Payload a enviar:");
    console.log("  - Field ID_EMPLEADO_CORE:", FF.ID_EMPLEADO_CORE);
    console.log("  - Field POLITICA_LINK:", FF.POLITICA_LINK);
    console.log("  - Field NOMBRE_EMPLEADO:", FF.NOMBRE_EMPLEADO);
    console.log("  - Field FECHA_FIRMA:", FF.FECHA_FIRMA);
    console.log("  - Payload completo:", JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: getSGSSTHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ [FIRMAR] Error Airtable:", errorData);
      return NextResponse.json(
        { success: false, error: "Error al guardar firma" },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log("✅ [FIRMAR] Firma guardada exitosamente");
    console.log("📄 [FIRMAR] Record creado:", JSON.stringify(data.records[0], null, 2));

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
