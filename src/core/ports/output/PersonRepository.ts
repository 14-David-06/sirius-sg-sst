import type { User } from "@/core/domain/entities/User";

/**
 * Port de salida para el repositorio de personal.
 * Define el contrato que cualquier implementación (Airtable, PostgreSQL, etc.)
 * debe cumplir. El core depende de esta interfaz, nunca de la implementación.
 */
export interface PersonRepository {
  findByDocumento(
    numeroDocumento: string
  ): Promise<{ user: User; hashedPassword: string } | null>;

  getSgSstAppRecordIds(): Promise<string[]>;

  updatePassword(recordId: string, hashedPassword: string): Promise<void>;
}
