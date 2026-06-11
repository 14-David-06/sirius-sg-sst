import type { Respuesta, GuardarRespuestaDTO, EstadisticasCampana, PiramidePoblacional } from "../entities";

/**
 * Repositorio de Respuestas
 * Define las operaciones sobre respuestas de encuestas
 */
export interface IRespuestaRepository {
  /**
   * Guardar respuesta de encuesta
   * @throws Error si el token ya fue usado o campaña cerrada
   */
  guardar(dto: GuardarRespuestaDTO): Promise<Respuesta>;

  /**
   * Obtener respuesta por ID
   */
  obtenerPorId(id: string): Promise<Respuesta | null>;

  /**
   * Listar respuestas de una campaña
   */
  listarPorCampana(campanaId: string): Promise<Respuesta[]>;

  /**
   * Obtener estadísticas de una campaña
   */
  obtenerEstadisticas(campanaId: string): Promise<EstadisticasCampana>;

  /**
   * Obtener datos para pirámide poblacional
   */
  obtenerPiramidePoblacional(campanaId: string): Promise<PiramidePoblacional>;

  /**
   * Verificar si existe respuesta para un token
   */
  existeRespuestaParaToken(tokenId: string): Promise<boolean>;
}
