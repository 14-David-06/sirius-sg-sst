// GET — Licencias próximas a vencer
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dias = parseInt(searchParams.get("dias") || "30");
    const categoria = searchParams.get("categoria");

    const config = airtableSGSSTConfig;
    const url = getSGSSTUrl(config.licenciasConduccionTableId);
    const headers = getSGSSTHeaders();

    const response = await fetch(url, { headers });
    if (!response.ok) {
      return NextResponse.json({ error: "Error al consultar licencias" }, { status: response.status });
    }

    const data = await response.json();
    const licencias = data.records || [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limiteVencimiento = new Date(hoy);
    limiteVencimiento.setDate(limiteVencimiento.getDate() + dias);

    const vencimientos = licencias
      .map((lic: any) => {
        const fields = lic.fields;
        const fechaVenc = fields[config.licenciasConduccionFields.FECHA_VENCIMIENTO];
        if (!fechaVenc) return null;

        const vencimiento = new Date(fechaVenc);
        vencimiento.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= dias) {
          const cat = fields[config.licenciasConduccionFields.CATEGORIA];
          if (categoria && cat !== categoria) return null;

          return {
            id: lic.id,
            idPersonalCore: fields[config.licenciasConduccionFields.ID_PERSONAL_CORE],
            numeroLicencia: fields[config.licenciasConduccionFields.NUMERO_LICENCIA],
            categoria: cat,
            fechaVencimiento: fechaVenc,
            diasRestantes: diffDays,
            estado: diffDays < 0 ? "Vencida" : diffDays <= 30 ? "Por vencer" : "Vigente",
          };
        }
        return null;
      })
      .filter(Boolean);

    vencimientos.sort((a: any, b: any) => a.diasRestantes - b.diasRestantes);

    return NextResponse.json({ success: true, total: vencimientos.length, vencimientos });
  } catch (error) {
    console.error("Error en GET vencimientos licencias:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
