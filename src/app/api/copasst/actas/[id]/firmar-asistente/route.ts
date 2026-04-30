import { NextRequest, NextResponse } from "next/server";
import { firmarAsistencia } from "@/lib/comites/actasRepository";
import type { ComiteTipo } from "@/lib/comites/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/copasst/actas/[id]/firmar-asistente
 * POST /api/cocolab/actas/[id]/firmar-asistente
 *
 * Body: { miembroRecordId: string, firma: string }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idActa } = await params;

    // Extraer comité de la URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const comiteStr = pathParts[2]; // /api/copasst/...
    const comite: ComiteTipo = comiteStr.toUpperCase() as ComiteTipo;

    if (comite !== "COPASST" && comite !== "COCOLAB") {
      return NextResponse.json(
        { error: "Comité inválido" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { miembroRecordId, firma } = body;

    if (!miembroRecordId || typeof miembroRecordId !== "string") {
      return NextResponse.json(
        { error: "miembroRecordId es requerido" },
        { status: 400 }
      );
    }

    if (!firma || typeof firma !== "string") {
      return NextResponse.json(
        { error: "firma es requerida" },
        { status: 400 }
      );
    }

    // Validar formato de data URL
    if (!firma.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "firma debe ser un data URL de imagen" },
        { status: 400 }
      );
    }

    await firmarAsistencia(comite, idActa, miembroRecordId, firma);

    return NextResponse.json({
      success: true,
      message: "Asistencia firmada correctamente",
    });
  } catch (error) {
    console.error("[firmar-asistente] Error:", error);
    const message =
      error instanceof Error ? error.message : "Error al firmar asistencia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
