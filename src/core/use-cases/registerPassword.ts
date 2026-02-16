import type { PersonRepository, PasswordHasher, Logger } from "@/core/ports/output";
import { userHasSgSstAccess } from "@/core/domain/services/accessControl";
import type { AuthResponse } from "@/core/domain/entities/User";

interface RegisterPasswordDeps {
  personRepository: PersonRepository;
  passwordHasher: PasswordHasher;
  logger: Logger;
}

export function createRegisterPassword({
  personRepository,
  passwordHasher,
  logger,
}: RegisterPasswordDeps) {
  return async function registerPassword(
    numeroDocumento: string,
    newPassword: string
  ): Promise<AuthResponse> {
    if (!numeroDocumento || !newPassword) {
      return {
        success: false,
        message: "Número de documento y contraseña son requeridos.",
      };
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        message: "La contraseña debe tener al menos 8 caracteres.",
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

    // Verificar que realmente no tenga contraseña
    if (hashedPassword) {
      return {
        success: false,
        message:
          "El usuario ya tiene una contraseña configurada. Use el inicio de sesión normal.",
      };
    }

    // Hash y guardar la nueva contraseña
    const hashed = await passwordHasher.hash(newPassword);
    await personRepository.updatePassword(user.id, hashed);

    const { id: _id, ...userWithoutId } = user;

    return {
      success: true,
      message: "Contraseña creada exitosamente.",
      user: userWithoutId,
    };
  };
}
