import type { Informe, GenerarInformeDTO } from "../entities";

/**
 * Repositorio de Informes
 * Define las operaciones sobre informes PDF
 */
export interface IInformeRepository {
  /**
   * Guardar registro de informe generado
   */
  guardar(dto: GenerarInformeDTO, urlPdf: string, totalRespuestas: number): Promise<Informe>;

  /**
   * Obtener informe por ID
   */
  obtenerPorId(id: string): Promise<Informe | null>;

  /**
   * Listar informes de una campaña
   */
  listarPorCampana(campanaId: string): Promise<Informe[]>;
}
