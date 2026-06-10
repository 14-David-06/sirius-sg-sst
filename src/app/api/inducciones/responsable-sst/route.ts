// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/responsable-sst
// GET - Obtener el responsable SST actual desde Miembros Comités SST
// ══════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { airtableSGSSTConfig } from "@/infrastructure/config/airtableSGSST";

const { apiToken, baseId, baseUrl, miembrosComitesTableId, miembrosComitesFields } = airtableSGSSTConfig;
const MF = miembrosComitesFields;

export async function GET() {
  try {
    // Query: buscar miembro con ROL="Responsable SST" y ESTADO="Activo"
    const filterFormula = `AND(
      {${MF.ROL}} = 'Responsable SST',
      {${MF.ESTADO}} = 'Activo'
    )`;

    const url = `${baseUrl}/${baseId}/${miembrosComitesTableId}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Error consultando Airtable:", response.status, response.statusText);
      return NextResponse.json(
        { success: false, message: "Error al consultar base de datos" },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      // Fallback: usar valor por defecto desde .env
      const fallbackNombre = process.env.IND_RESPONSABLE_SST_NOMBRE || "Responsable SST";
      const fallbackCedula = process.env.IND_RESPONSABLE_SST_CEDULA || "";

      return NextResponse.json({
        success: true,
        data: {
          nombre: fallbackNombre,
          numeroDocumento: fallbackCedula,
          cargo: "Responsable SST",
          source: "env-fallback",
        },
      });
    }

    const record = data.records[0];
    const fields = record.fields;

    return NextResponse.json({
      success: true,
      data: {
        nombre: fields[MF.NOMBRE] || "Responsable SST",
        numeroDocumento: fields[MF.DOCUMENTO] || "",
        cargo: fields[MF.CARGO] || "Responsable SST",
        source: "airtable",
      },
    });
  } catch (error: any) {
    console.error("Error obteniendo responsable SST:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
