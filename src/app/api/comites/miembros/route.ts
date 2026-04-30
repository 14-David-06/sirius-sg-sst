// GET /api/comites/miembros?comite=COPASST|COCOLAB&estado=activo
// Lista miembros del comité desde la tabla EXISTENTE "Miembros Comite SST"
import { NextRequest, NextResponse } from "next/server";
import { listarMiembrosComite } from "@/lib/comites/actasRepository";
import type { ComiteTipo } from "@/lib/comites/types";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const comiteParam = (sp.get("comite") || "").toUpperCase();
    if (comiteParam !== "COPASST" && comiteParam !== "COCOLAB") {
      return NextResponse.json(
        { success: false, message: "Parámetro 'comite' inválido (COPASST|COCOLAB)" },
        { status: 400 }
      );
    }
    const estadoParam = (sp.get("estado") || "activo").toLowerCase();
    const soloActivos = estadoParam !== "todos";
    const data = await listarMiembrosComite(comiteParam as ComiteTipo, soloActivos);
    return NextResponse.json({ success: true, data, total: data.length });
  } catch (e) {
    console.error("[comites] miembros:", e);
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : "Error al listar miembros",
      },
      { status: 500 }
    );
  }
}
