import type { PersonRepository, PasswordHasher, Logger } from "@/core/ports/output";
import { userHasSgSstAccess } from "@/core/domain/services/accessControl";
import type { AuthResponse } from "@/core/domain/entities/User";

interface AuthenticateUserDeps {
  personRepository: PersonRepository;
  passwordHasher: PasswordHasher;
  logger: Logger;
}

export function createAuthenticateUser({
  personRepository,
  passwordHasher,
  logger,
}: AuthenticateUserDeps) {
  return async function authenticateUser(
    numeroDocumento: string,
    password: string
  ): Promise<AuthResponse> {
    if (!numeroDocumento || !password) {
      return {
        success: false,
        message: "Número de documento y contraseña son requeridos.",
      };
    }

    const result = await personRepository.findByDocumento(numeroDocumento);

    if (!result) {
      return {
        success: false,
        message: "No se encontró un usuario con ese número de documento.",
      };
    }

    const { user, hashedPassword } = result;

    if (!hashedPassword) {
      return {
        success: false,
        message: "El usuario no tiene una contraseña configurada.",
      };
    }

    // Verificar que el usuario esté activo
    if (user.estadoActividad !== "Activo") {
      return {
        success: false,
        message: `El usuario se encuentra en estado: ${user.estadoActividad}. Contacte al administrador.`,
      };
    }

    // Verificar acceso a la app SG-SST
    const sgSstAppIds = await personRepository.getSgSstAppRecordIds();
    logger.debug("Accesos del usuario:", user.accesosIds);
    logger.debug("SG-SST IDs requeridos:", sgSstAppIds);

    if (!userHasSgSstAccess(user.accesosIds, sgSstAppIds)) {
      return {
        success: false,
        message:
          "No tiene acceso autorizado a esta aplicación. Contacte al administrador.",
      };
    }

    const isPasswordValid = await passwordHasher.compare(
      password,
      hashedPassword
    );

    if (!isPasswordValid) {
      return {
        success: false,
        message: "Contraseña incorrecta.",
      };
    }

    const { id: _id, ...userWithoutId } = user;

    return {
      success: true,
      message: "Autenticación exitosa.",
      user: userWithoutId,
    };
  };
}
