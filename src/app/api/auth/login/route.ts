import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/infrastructure/container";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { numeroDocumento, password } = body;

    const result = await authenticateUser(numeroDocumento, password);

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
        user: result.user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor. Intente nuevamente.",
      },
      { status: 500 }
    );
  }
}
