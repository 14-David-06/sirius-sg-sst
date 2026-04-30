// ══════════════════════════════════════════════════════════
// Helper de firma AES-256-CBC — compartido SG-SST
// Mismo formato que se usa en /api/inspecciones-areas:
//   payload  ──encrypt──►  "iv_base64:encrypted_base64"
// La clave deriva de SHA-256(AES_SIGNATURE_SECRET).
// ══════════════════════════════════════════════════════════
import crypto from "crypto";

const AES_SECRET = process.env.AES_SIGNATURE_SECRET || "";

function ensureSecret(): void {
  if (!AES_SECRET) {
    throw new Error(
      "AES_SIGNATURE_SECRET no configurada — imposible cifrar/descifrar firmas"
    );
  }
}

/**
 * Cifra un string en formato `ivBase64:cipherBase64`.
 */
export function encryptAES(plaintext: string): string {
  ensureSecret();
  const key = crypto.createHash("sha256").update(AES_SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

/**
 * Descifra un string previamente generado por `encryptAES`.
 */
export function decryptAES(encryptedStr: string): string {
  ensureSecret();
  const [ivB64, encB64] = encryptedStr.split(":");
  if (!ivB64 || !encB64) throw new Error("Formato de cifrado inválido");
  const key = crypto.createHash("sha256").update(AES_SECRET).digest();
  const iv = Buffer.from(ivB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encB64, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Payload estándar cifrado para una firma de acta de comité.
 */
export interface FirmaActaPayload {
  signature: string;       // Data URL del canvas (PNG base64)
  nombre: string;
  cedula: string;
  cargo: string;
  rol: string;             // "presidente" | "secretaria" | etc.
  comite: "COPASST" | "COCOLAB";
  actaId: string;
  timestamp: string;       // ISO
}

export function encryptFirmaActa(payload: FirmaActaPayload): string {
  return encryptAES(JSON.stringify(payload));
}

export function decryptFirmaActa(encrypted: string): FirmaActaPayload {
  return JSON.parse(decryptAES(encrypted)) as FirmaActaPayload;
}

export function isAESReady(): boolean {
  return AES_SECRET.length > 0;
}
