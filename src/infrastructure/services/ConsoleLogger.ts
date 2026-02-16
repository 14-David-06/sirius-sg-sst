import type { Logger } from "@/core/ports/output";

/**
 * Implementación de Logger usando console.
 * Añade prefijo estándar y puede desactivarse en producción.
 */
export class ConsoleLogger implements Logger {
  private prefix: string;

  constructor(prefix = "[SG-SST]") {
    this.prefix = prefix;
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`${this.prefix} ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`${this.prefix} ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`${this.prefix} ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`${this.prefix} ${message}`, ...args);
    }
  }
}
