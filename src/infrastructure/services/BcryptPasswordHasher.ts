import bcrypt from "bcryptjs";
import type { PasswordHasher } from "@/core/ports/output";

const SALT_ROUNDS = 12;

/**
 * Implementación de PasswordHasher usando bcryptjs.
 */
export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  async compare(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
