/**
 * Composition Root — aquí se conectan las implementaciones concretas con los ports.
 * Este es el ÚNICO lugar donde infrastructure conoce a core y viceversa.
 * Los API routes solo importan de aquí, nunca directamente de infrastructure.
 */
import { AirtablePersonalRepository } from "@/infrastructure/repositories/airtablePersonalRepository";
import { BcryptPasswordHasher } from "@/infrastructure/services/BcryptPasswordHasher";
import { ConsoleLogger } from "@/infrastructure/services/ConsoleLogger";
import { createVerifyUser } from "@/core/use-cases/verifyUser";
import { createAuthenticateUser } from "@/core/use-cases/authenticateUser";
import { createRegisterPassword } from "@/core/use-cases/registerPassword";

// ── Infraestructura (instancias singleton) ──────────────────────────────
const logger = new ConsoleLogger("[SG-SST]");
const personRepository = new AirtablePersonalRepository(logger);
const passwordHasher = new BcryptPasswordHasher();

// ── Casos de uso (funciones listas para usar) ───────────────────────────
export const verifyUser = createVerifyUser({ personRepository, logger });
export const authenticateUser = createAuthenticateUser({
  personRepository,
  passwordHasher,
  logger,
});
export const registerPassword = createRegisterPassword({
  personRepository,
  passwordHasher,
  logger,
});
