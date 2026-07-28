import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/infrastructure/container";
import { generateJWT } from "@/lib/jwt";

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

    // Generar JWT con los datos del usuario
    const token = generateJWT({
      idEmpleado: result.user!.idEmpleado,
      nombreCompleto: result.user!.nombreCompleto,
      correoElectronico: result.user!.correoElectronico,
      numeroDocumento: result.user!.numeroDocumento,
      tipoPersonal: result.user!.tipoPersonal,
      rol: result.user!.rol,
      nivelAcceso: result.user!.nivelAcceso,
      ordenNivel: result.user!.ordenNivel,
    });

    // Crear response con cookie HTTP-only
    const response = NextResponse.json(
      {
        success: true,
        message: result.message,
        user: result.user,
        token, // También enviamos en body para compatibilidad con frontend actual
      },
      { status: 200 }
    );

    // Set cookie HTTP-only (más seguro que localStorage)
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
    });

    return response;
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
