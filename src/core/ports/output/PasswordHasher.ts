/**
 * Port de salida para hashing de contraseñas.
 * Abstrae la librería concreta (bcrypt, argon2, etc.) fuera del core.
 */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  compare(plainPassword: string, hashedPassword: string): Promise<boolean>;
}
