/**
 * Servicio de dominio para verificar acceso a aplicaciones.
 * Contiene lógica de negocio pura sin dependencias de infraestructura.
 */

/**
 * Verifica si un usuario tiene acceso a la app SG-SST.
 * Compara los record IDs de accesos asignados al usuario
 * contra los record IDs de la aplicación.
 */
export function userHasSgSstAccess(
  userAccesosIds: string[],
  sgSstAppIds: string[]
): boolean {
  return userAccesosIds.some((id) => sgSstAppIds.includes(id));
}
