/**
 * Configuración del MCP SGSST
 */

import { MCPConfig } from "./types.js";

/**
 * Carga la configuración desde variables de entorno
 */
export function loadConfig(): MCPConfig {
  const apiUrl = process.env.SGSST_API_URL || "http://localhost:3000";
  const apiTimeout = parseInt(process.env.SGSST_API_TIMEOUT || "30000", 10);
  const nominaCoreUrl = process.env.NOMINA_CORE_API_URL;
  const nominaCoreApiKey = process.env.NOMINA_CORE_API_KEY;
  const logLevel = (process.env.LOG_LEVEL || "info") as MCPConfig["logLevel"];

  return {
    apiUrl,
    apiTimeout,
    nominaCoreUrl,
    nominaCoreApiKey,
    logLevel,
  };
}

/**
 * Valida que la configuración sea correcta
 */
export function validateConfig(config: MCPConfig): void {
  if (!config.apiUrl) {
    throw new Error("SGSST_API_URL es requerida");
  }

  if (config.apiTimeout < 1000) {
    throw new Error("SGSST_API_TIMEOUT debe ser al menos 1000ms");
  }

  // Validar URL de Nómina Core si está configurada
  if (config.nominaCoreUrl && !config.nominaCoreApiKey) {
    console.warn("NOMINA_CORE_API_URL configurada pero falta NOMINA_CORE_API_KEY");
  }
}

/**
 * Logger simple
 */
export class Logger {
  private level: MCPConfig["logLevel"];

  constructor(level: MCPConfig["logLevel"] = "info") {
    this.level = level;
  }

  private shouldLog(level: string): boolean {
    const levels = ["debug", "info", "warn", "error"];
    const currentIndex = levels.indexOf(this.level);
    const requestedIndex = levels.indexOf(level);
    return requestedIndex >= currentIndex;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}
