/**
 * Utilidades JWT para autenticación de sesiones.
 * Genera y verifica tokens JWT con expiración.
 */
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = "7d"; // 7 días

if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET no está definido. Usando secreto por defecto (INSEGURO)");
}

export interface JwtPayload {
  idEmpleado: string;
  nombreCompleto: string;
  correoElectronico: string;
  numeroDocumento: string;
  tipoPersonal: string;
  rol?: string;
}

/**
 * Genera un token JWT para una sesión de usuario.
 */
export function generateJWT(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "sirius-sgsst",
    audience: "sirius-sgsst-api",
  });
}

/**
 * Verifica y decodifica un token JWT.
 * Retorna el payload si es válido, null si inválido/expirado.
 */
export function verifyJWT(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "sirius-sgsst",
      audience: "sirius-sgsst-api",
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    // Token inválido, expirado o malformado
    return null;
  }
}

/**
 * Extrae el token JWT de los headers de la request.
 * Busca en: Authorization header (Bearer token) o cookie.
 */
export function extractTokenFromRequest(headers: Headers): string | null {
  // 1. Buscar en Authorization header
  const authHeader = headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 2. Buscar en cookie
  const cookies = headers.get("Cookie");
  if (cookies) {
    const tokenCookie = cookies
      .split(";")
      .find((c) => c.trim().startsWith("auth_token="));

    if (tokenCookie) {
      return tokenCookie.split("=")[1];
    }
  }

  return null;
}
