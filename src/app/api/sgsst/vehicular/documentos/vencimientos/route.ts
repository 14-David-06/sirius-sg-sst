// GET — Documentos próximos a vencer
import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dias = parseInt(searchParams.get("dias") || "30");
    const tipo = searchParams.get("tipo"); // SOAT | Tecnomecánica

    const config = airtableSGSSTConfig;
    const url = getSGSSTUrl(config.documentosVehicularesTableId);
    const headers = getSGSSTHeaders();

    const response = await fetch(url, { headers });
    if (!response.ok) {
      return NextResponse.json({ error: "Error al consultar documentos" }, { status: response.status });
    }

    const data = await response.json();
    const documentos = data.records || [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limiteVencimiento = new Date(hoy);
    limiteVencimiento.setDate(limiteVencimiento.getDate() + dias);

    const vencimientos = documentos
      .map((doc: any) => {
        const fields = doc.fields;
        const fechaVenc = fields[config.documentosVehicularesFields.FECHA_VENCIMIENTO];
        if (!fechaVenc) return null;

        const vencimiento = new Date(fechaVenc);
        vencimiento.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= dias) {
          const tipoDoc = fields[config.documentosVehicularesFields.TIPO_DOCUMENTO];
          if (tipo && tipoDoc !== tipo) return null;

          return {
            id: doc.id,
            vehiculoId: fields[config.documentosVehicularesFields.VEHICULO_LINK]?.[0],
            tipoDocumento: tipoDoc,
            numeroDocumento: fields[config.documentosVehicularesFields.NUMERO_DOCUMENTO],
            entidadEmisora: fields[config.documentosVehicularesFields.ENTIDAD_EMISORA],
            fechaVencimiento: fechaVenc,
            diasRestantes: diffDays,
            estado: diffDays < 0 ? "Vencido" : diffDays <= 30 ? "Por vencer" : "Vigente",
          };
        }
        return null;
      })
      .filter(Boolean);

    vencimientos.sort((a: any, b: any) => a.diasRestantes - b.diasRestantes);

    return NextResponse.json({ success: true, total: vencimientos.length, vencimientos });
  } catch (error) {
    console.error("Error en GET vencimientos:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
