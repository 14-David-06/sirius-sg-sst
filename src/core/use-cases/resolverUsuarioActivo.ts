import type { PersonRepository } from "@/core/ports/output";
import { userHasSgSstAccess } from "@/core/domain/services/accessControl";
import type { User } from "@/core/domain/entities/User";

interface ResolverUsuarioActivoDeps {
  personRepository: PersonRepository;
}

export type UsuarioActivo =
  | { activo: true; user: Omit<User, "id"> }
  | { activo: false; motivo: string };

/**
 * Relee a una persona por su documento y confirma que hoy puede entrar a
 * SG-SST: que exista, que esté activa y que tenga acceso a la app.
 *
 * Son las mismas comprobaciones de `authenticateUser` menos la contraseña. Lo
 * usa el conector MCP en cada llamada: su token solo trae el documento, y así
 * inactivar a alguien o quitarle el acceso lo corta en la siguiente petición,
 * sin esperar a que el token venza.
 */
export function createResolverUsuarioActivo({ personRepository }: ResolverUsuarioActivoDeps) {
  return async function resolverUsuarioActivo(numeroDocumento: string): Promise<UsuarioActivo> {
    const resultado = await personRepository.findByDocumento(numeroDocumento);
    if (!resultado) {
      return { activo: false, motivo: "No existe una persona con ese documento." };
    }

    const { user } = resultado;
    if (user.estadoActividad !== "Activo") {
      return { activo: false, motivo: `La persona está en estado: ${user.estadoActividad}.` };
    }

    const sgSstAppIds = await personRepository.getSgSstAppRecordIds();
    if (!userHasSgSstAccess(user.accesosIds, sgSstAppIds)) {
      return { activo: false, motivo: "La persona ya no tiene acceso a SG-SST." };
    }

    const { id: _id, ...sinId } = user;
    return { activo: true, user: sinId };
  };
}
