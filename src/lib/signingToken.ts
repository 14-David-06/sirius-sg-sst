/**
 * Utilidad de tokens HMAC-SHA256 para firma remota de asistencia.
 * No requiere base de datos — el token es auto-validante.
 */
import crypto from "crypto";

const AES_SECRET = process.env.AES_SIGNATURE_SECRET || "";

export interface TokenPayload {
  r: string;  // detalleRecordId  (Asistencia Capacitaciones)
  e: string;  // eventoRecordId   (Eventos Capacitación)
  n: string;  // nombre del asistente
  c: string;  // cédula
  exp: number; // expiry timestamp (ms)
}

/** Genera un token firmado con HMAC-SHA256 válido por `horasValido` horas */
export function generateSigningToken(payload: Omit<TokenPayload, "exp">, horasValido = 72): string {
  const data: TokenPayload = { ...payload, exp: Date.now() + horasValido * 3_600_000 };
  const payloadB64 = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", AES_SECRET)
    .update(payloadB64)
    .digest("base64url")
    .substring(0, 20);
  return `${payloadB64}.${sig}`;
}

/** Valida el token. Retorna el payload o null si inválido/expirado. */
export function verifySigningToken(token: string): TokenPayload | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return null;
    const payloadB64 = token.substring(0, dotIdx);
    const sig = token.substring(dotIdx + 1);

    const expectedSig = crypto
      .createHmac("sha256", AES_SECRET)
      .update(payloadB64)
      .digest("base64url")
      .substring(0, 20);

    if (sig !== expectedSig) return null;

    const data: TokenPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (data.exp < Date.now()) return null;

    return data;
  } catch {
    return null;
  }
}
