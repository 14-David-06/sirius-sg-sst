import type { PersonRepository, Logger } from "@/core/ports/output";
import { userHasSgSstAccess } from "@/core/domain/services/accessControl";
import type { VerifyResponse } from "@/core/domain/entities/User";

interface VerifyUserDeps {
  personRepository: PersonRepository;
  logger: Logger;
}

export function createVerifyUser({ personRepository, logger }: VerifyUserDeps) {
  return async function verifyUser(
    numeroDocumento: string
  ): Promise<VerifyResponse> {
    if (!numeroDocumento) {
      return {
        success: false,
        message: "El número de documento es requerido.",
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

    return {
      success: true,
      message: hashedPassword
        ? "Usuario verificado. Ingrese su contraseña."
        : "Usuario verificado. Debe crear una contraseña.",
      needsPassword: !hashedPassword,
      nombreCompleto: user.nombreCompleto,
    };
  };
}
