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

      // Fallback silencioso en caso de error de red
      const fallbackNombre = process.env.IND_RESPONSABLE_SST_NOMBRE || "María Alejandra";
      return NextResponse.json({
        success: true,
        data: {
          nombre: fallbackNombre,
          numeroDocumento: process.env.IND_RESPONSABLE_SST_CEDULA || "",
          cargo: "Responsable SST",
          source: "env-fallback-error",
        },
      });
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      console.warn("No se encontró Responsable SST activo en Miembros Comités SST");

      // Fallback: usar valor por defecto desde .env o hardcoded
      const fallbackNombre = process.env.IND_RESPONSABLE_SST_NOMBRE || "María Alejandra";
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
        nombre: fields[MF.NOMBRE] || "María Alejandra",
        numeroDocumento: fields[MF.DOCUMENTO] || "",
        cargo: fields[MF.CARGO] || "Responsable SST",
        source: "airtable",
      },
    });
  } catch (error: any) {
    console.error("Error obteniendo responsable SST:", error);

    // Fallback final en caso de excepción
    const fallbackNombre = process.env.IND_RESPONSABLE_SST_NOMBRE || "María Alejandra";
    return NextResponse.json({
      success: true,
      data: {
        nombre: fallbackNombre,
        numeroDocumento: process.env.IND_RESPONSABLE_SST_CEDULA || "",
        cargo: "Responsable SST",
        source: "exception-fallback",
      },
    });
  }
}
