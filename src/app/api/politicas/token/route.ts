// GET /api/politicas/token?token=xxx
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token no proporcionado" },
        { status: 400 }
      );
    }

    // Buscar token en Airtable
    const filterFormula = `{Token ID} = "${token}"`;
    const url = `${getSGSSTUrl(airtableSGSSTConfig.tokensFirmaPoliticaTableId)}?filterByFormula=${encodeURIComponent(filterFormula)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: getSGSSTHeaders(),
    });

    if (!response.ok) {
      console.error("Error al buscar token");
      return NextResponse.json(
        { success: false, error: "Error al validar token" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.records.length === 0) {
      return NextResponse.json(
        { success: false, error: "Token no válido" },
        { status: 404 }
      );
    }

    const tokenRecord = data.records[0];
    const estado = tokenRecord.fields["Estado"];
    const expiracion = new Date(tokenRecord.fields["Fecha Expiración"]);
    const now = new Date();

    // Validar estado
    if (estado !== "Activo") {
      return NextResponse.json(
        { success: false, error: `Token ya fue ${estado.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Validar expiración
    if (now > expiracion) {
      return NextResponse.json(
        { success: false, error: "Token expirado" },
        { status: 400 }
      );
    }

    // Obtener datos de la política
    const politicaLinks = tokenRecord.fields["Política"];
    if (!politicaLinks || politicaLinks.length === 0) {
      return NextResponse.json(
        { success: false, error: "Política no encontrada" },
        { status: 404 }
      );
    }

    const politicaId = politicaLinks[0];
    const idEmpleado = tokenRecord.fields["ID Empleado Core"];

    console.log("🔐 Token validado:", {
      token,
      politicaId,
      idEmpleado,
      tokenRecordId: tokenRecord.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        tokenId: tokenRecord.id,
        politicaId,
        idEmpleado,
        expiracion: expiracion.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error en GET /api/politicas/token:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
