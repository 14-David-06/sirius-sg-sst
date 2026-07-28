/**
 * Servicio de dominio para verificar acceso a aplicaciones y niveles de permiso.
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

// ══════════════════════════════════════════════════════════
// Niveles de acceso (RBAC)
// ══════════════════════════════════════════════════════════

/**
 * Órdenes jerárquicos de la tabla "Niveles_Acceso" en Sirius Nomina Core.
 * Menor número = más privilegios. La fuente de verdad es el campo
 * "Nivel_Sistema_Nuevo" de cada persona en la tabla Personal.
 */
export const NIVELES_ACCESO = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  AVANZADO: 3,
  USUARIO: 4,
  LECTURA: 5,
} as const;

/**
 * Orden asignado cuando una persona no tiene nivel configurado.
 * Se falla en cerrado: sin nivel explícito solo se permite lectura.
 */
export const ORDEN_SIN_NIVEL = NIVELES_ACCESO.LECTURA;

/**
 * Verifica si un orden jerárquico alcanza el nivel mínimo requerido.
 * Al ser jerárquico, un orden menor (más privilegios) siempre cumple.
 */
export function tieneNivelMinimo(
  ordenNivel: number,
  ordenRequerido: number
): boolean {
  if (!Number.isFinite(ordenNivel) || ordenNivel <= 0) return false;
  return ordenNivel <= ordenRequerido;
}

/** Acceso total: gestión de usuarios y configuración global. */
export function esSuperAdmin(ordenNivel: number): boolean {
  return tieneNivelMinimo(ordenNivel, NIVELES_ACCESO.SUPER_ADMIN);
}

/** Administración funcional (incluye Super Admin). */
export function esAdmin(ordenNivel: number): boolean {
  return tieneNivelMinimo(ordenNivel, NIVELES_ACCESO.ADMIN);
}
