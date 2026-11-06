/**
 * Cliente HTTP para interactuar con la API de SGSST
 */

import { ApiResponse, MCPConfig, SessionInfo } from "../types.js";

export class HttpClient {
  private baseUrl: string;
  private timeout: number;
  private session?: SessionInfo;

  constructor(config: MCPConfig, session?: SessionInfo) {
    this.baseUrl = config.apiUrl;
    this.timeout = config.apiTimeout;
    this.session = session;
  }

  /**
   * Actualiza la sesión del cliente
   */
  setSession(session: SessionInfo): void {
    this.session = session;
  }

  /**
   * Obtiene los headers por defecto
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.session?.token) {
      headers["Authorization"] = `Bearer ${this.session.token}`;
    }

    return headers;
  }

  /**
   * Realiza una petición HTTP
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await response.json()) as ApiResponse<T>;

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `Error ${response.status}: ${response.statusText}`,
        };
      }

      return data as ApiResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            error: `Timeout: La petición tardó más de ${this.timeout}ms`,
          };
        }

        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Error desconocido al realizar la petición",
      };
    }
  }

  /**
   * Realiza una petición GET
   */
  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>("GET", path);
  }

  /**
   * Realiza una petición POST
   */
  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("POST", path, body);
  }

  /**
   * Realiza una petición PUT
   */
  async put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", path, body);
  }

  /**
   * Realiza una petición DELETE
   */
  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", path);
  }

  /**
   * Construye query string desde un objeto
   */
  buildQueryString(params: Record<string, unknown>): string {
    const filtered = Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    );

    if (filtered.length === 0) return "";

    const queryString = filtered
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join("&");

    return `?${queryString}`;
  }
}
