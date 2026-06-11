import type { Campana, CrearCampanaDTO, CerrarCampanaDTO } from "../entities";

/**
 * Repositorio de Campañas
 * Define las operaciones sobre campañas de perfil sociodemográfico
 */
export interface ICampanaRepository {
  /**
   * Crear una nueva campaña
   */
  crear(dto: CrearCampanaDTO): Promise<Campana>;

  /**
   * Obtener campaña por ID
   */
  obtenerPorId(id: string): Promise<Campana | null>;

  /**
   * Listar todas las campañas
   */
  listar(): Promise<Campana[]>;

  /**
   * Listar campañas activas
   */
  listarActivas(): Promise<Campana[]>;

  /**
   * Cerrar una campaña
   */
  cerrar(dto: CerrarCampanaDTO): Promise<Campana>;

  /**
   * Obtener estadísticas de una campaña (total colaboradores vs respuestas)
   */
  obtenerEstadisticas(campanaId: string): Promise<{
    totalTokens: number;
    totalRespuestas: number;
    porcentajeCompletado: number;
  }>;
}
