// ══════════════════════════════════════════════════════════
// API: Estado de Firma de Políticas
// GET: Obtener qué políticas ha firmado un colaborador
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

const FP = airtableSGSSTConfig.politicasFields;
const FF = airtableSGSSTConfig.firmasPoliticasFields;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idEmpleado = searchParams.get("idEmpleado");

    if (!idEmpleado) {
      return NextResponse.json(
        { success: false, error: "Falta el ID del empleado" },
        { status: 400 }
      );
    }

    // 1. Obtener todas las políticas activas que requieren firma
    const filterPoliticas = `AND({Estado} = "Activa", {Requiere Firma} = 1, {Visible Colaboradores} = 1)`;
    const urlPoliticas = `${getSGSSTUrl(airtableSGSSTConfig.politicasTableId)}?filterByFormula=${encodeURIComponent(filterPoliticas)}`;

    const resPoliticas = await fetch(urlPoliticas, {
      method: "GET",
      headers: getSGSSTHeaders(),
    });

    if (!resPoliticas.ok) {
      console.error("Error al obtener políticas");
      return NextResponse.json(
        { success: false, error: "Error al obtener políticas" },
        { status: resPoliticas.status }
      );
    }

    const dataPoliticas = await resPoliticas.json();

    // 2. Obtener firmas del empleado (la tabla probablemente no existe aún)
    let dataFirmas = { records: [] };

    try {
      const filterFirmas = `{ID Empleado Core} = "${idEmpleado}"`;
      const urlFirmas = `${getSGSSTUrl(airtableSGSSTConfig.firmasPoliticasTableId)}?filterByFormula=${encodeURIComponent(filterFirmas)}`;

      const resFirmas = await fetch(urlFirmas, {
        method: "GET",
        headers: getSGSSTHeaders(),
      });

      if (resFirmas.ok) {
        dataFirmas = await resFirmas.json();
      }
    } catch (error) {
      console.log("Tabla de firmas no disponible aún");
    }

    // Crear mapa de políticas firmadas
    const politicasFirmadas = new Set<string>();
    dataFirmas.records.forEach((firma: any) => {
      const politicaLinks = firma.fields["Política"];
      if (politicaLinks && politicaLinks.length > 0) {
        politicaLinks.forEach((link: string) => politicasFirmadas.add(link));
      }
    });

    // 3. Procesar resultado
    const estadoPoliticas = dataPoliticas.records.map((politica: any) => ({
      id: politica.id,
      codigo: politica.fields["Código"] || "",
      titulo: politica.fields["Título"] || "",
      categoria: politica.fields["Categoría"] || "",
      firmada: politicasFirmadas.has(politica.id),
    }));

    const pendientes = estadoPoliticas.filter((p: any) => !p.firmada);
    const firmadas = estadoPoliticas.filter((p: any) => p.firmada);

    return NextResponse.json({
      success: true,
      data: {
        pendientes,
        firmadas,
        totalPendientes: pendientes.length,
        totalFirmadas: firmadas.length,
      },
    });
  } catch (error) {
    console.error("Error en GET /api/politicas/estado-firma:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
