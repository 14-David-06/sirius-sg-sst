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

    // 1. Obtener TODAS las políticas y filtrar en código
    // (No podemos usar field IDs en filterByFormula)
    const urlPoliticas = `${getSGSSTUrl(airtableSGSSTConfig.politicasTableId)}?returnFieldsByFieldId=true`;

    const resPoliticas = await fetch(urlPoliticas, {
      method: "GET",
      headers: getSGSSTHeaders(),
    });

    if (!resPoliticas.ok) {
      console.error("Error al obtener políticas:", await resPoliticas.text());
      return NextResponse.json(
        { success: false, error: "Error al obtener políticas" },
        { status: resPoliticas.status }
      );
    }

    const dataPoliticas = await resPoliticas.json();

    // Filtrar políticas activas que requieren firma y son visibles
    const politicasFiltradas = dataPoliticas.records.filter((pol: any) => {
      const estado = pol.fields[FP.ESTADO];
      const requiereFirma = pol.fields[FP.REQUIERE_FIRMA];
      const visible = pol.fields[FP.VISIBLE_COLABORADORES];
      return estado === "Activa" && requiereFirma === true && visible === true;
    });

    // 2. Obtener TODAS las firmas y filtrar en código
    let dataFirmas = { records: [] };

    try {
      const urlFirmas = `${getSGSSTUrl(airtableSGSSTConfig.firmasPoliticasTableId)}?returnFieldsByFieldId=true`;

      const resFirmas = await fetch(urlFirmas, {
        method: "GET",
        headers: getSGSSTHeaders(),
      });

      if (resFirmas.ok) {
        const allFirmas = await resFirmas.json();
        // Filtrar solo las firmas de este empleado
        dataFirmas.records = allFirmas.records.filter((firma: any) => {
          return firma.fields[FF.ID_EMPLEADO_CORE] === idEmpleado;
        });
      } else {
        console.error("Error al obtener firmas:", await resFirmas.text());
      }
    } catch (error) {
      console.log("Error consultando firmas:", error);
    }

    // Crear mapa de políticas firmadas
    const politicasFirmadas = new Set<string>();
    dataFirmas.records.forEach((firma: any) => {
      const politicaLinks = firma.fields[FF.POLITICA_LINK];
      if (politicaLinks && politicaLinks.length > 0) {
        politicaLinks.forEach((link: string) => politicasFirmadas.add(link));
      }
    });

    // 3. Procesar resultado usando políticas filtradas
    const estadoPoliticas = politicasFiltradas.map((politica: any) => ({
      id: politica.id,
      codigo: politica.fields[FP.CODIGO] || "",
      titulo: politica.fields[FP.TITULO] || "",
      categoria: politica.fields[FP.CATEGORIA] || "",
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
