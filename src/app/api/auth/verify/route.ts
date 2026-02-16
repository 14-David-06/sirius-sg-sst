import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/infrastructure/container";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { numeroDocumento } = body;

    const result = await verifyUser(numeroDocumento);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        needsPassword: result.needsPassword,
        nombreCompleto: result.nombreCompleto,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor. Intente nuevamente.",
      },
      { status: 500 }
    );
  }
}
