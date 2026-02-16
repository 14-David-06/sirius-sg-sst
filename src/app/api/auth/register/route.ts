import { NextRequest, NextResponse } from "next/server";
import { registerPassword } from "@/infrastructure/container";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { numeroDocumento, password } = body;

    const result = await registerPassword(numeroDocumento, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        user: result.user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor. Intente nuevamente.",
      },
      { status: 500 }
    );
  }
}
