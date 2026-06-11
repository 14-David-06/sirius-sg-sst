import type { Token, TokenGenerado, TokenConPersonal } from "../entities";

/**
 * Repositorio de Tokens
 * Define las operaciones sobre tokens de encuesta
 */
export interface ITokenRepository {
  /**
   * Generar tokens para una lista de colaboradores
   */
  generar(campanaId: string, personalIds: string[]): Promise<TokenGenerado[]>;

  /**
   * Obtener token por UUID
   */
  obtenerPorToken(token: string): Promise<Token | null>;

  /**
   * Obtener token con información del colaborador
   */
  obtenerConPersonal(token: string): Promise<TokenConPersonal | null>;

  /**
   * Listar tokens de una campaña
   */
  listarPorCampana(campanaId: string): Promise<Token[]>;

  /**
   * Marcar token como usado
   */
  marcarUsado(tokenId: string): Promise<void>;

  /**
   * Verificar si un colaborador ya tiene token para una campaña
   */
  existeTokenParaColaborador(campanaId: string, personalId: string): Promise<boolean>;
}
