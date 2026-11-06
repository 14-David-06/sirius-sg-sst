/**
 * Utilidades de validación
 */

import { HttpClient } from "./http-client.js";
import { ValidacionNominaCore, Empleado } from "../types.js";

/**
 * Valida un empleado contra Nómina Core
 */
export async function validarEmpleadoNominaCore(
  numeroDocumento: string,
  nominaCoreUrl?: string,
  nominaCoreApiKey?: string
): Promise<ValidacionNominaCore> {
  if (!nominaCoreUrl || !nominaCoreApiKey) {
    return {
      esValido: false,
      mensaje: "Validación con Nómina Core no configurada",
    };
  }

  try {
    const url = `${nominaCoreUrl}/api/empleados/validar/${numeroDocumento}`;
    const response = await fetch(url, {
      headers: {
        "X-API-Key": nominaCoreApiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        esValido: false,
        mensaje: `Error al validar con Nómina Core: ${response.statusText}`,
      };
    }

    const data = (await response.json()) as { success?: boolean; empleado?: unknown; mensaje?: string };

    if (data.success && data.empleado) {
      return {
        esValido: true,
        empleado: data.empleado as Empleado,
      };
    }

    return {
      esValido: false,
      mensaje: data.mensaje || "Empleado no encontrado en Nómina Core",
    };
  } catch (error) {
    return {
      esValido: false,
      mensaje: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Valida formato de email
 */
export function validarEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de número de documento colombiano
 */
export function validarNumeroDocumento(numeroDocumento: string): boolean {
  // Acepta números entre 6 y 15 dígitos
  const docRegex = /^\d{6,15}$/;
  return docRegex.test(numeroDocumento);
}

/**
 * Valida formato de fecha (YYYY-MM-DD)
 */
export function validarFecha(fecha: string): boolean {
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fecha)) return false;

  const date = new Date(fecha);
  return !isNaN(date.getTime());
}

/**
 * Valida que una fecha esté en el futuro
 */
export function validarFechaFutura(fecha: string): boolean {
  if (!validarFecha(fecha)) return false;
  const date = new Date(fecha);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date > now;
}

/**
 * Valida que una fecha esté en el pasado
 */
export function validarFechaPasada(fecha: string): boolean {
  if (!validarFecha(fecha)) return false;
  const date = new Date(fecha);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date <= now;
}

/**
 * Valida rango de fechas
 */
export function validarRangoFechas(desde: string, hasta: string): boolean {
  if (!validarFecha(desde) || !validarFecha(hasta)) return false;
  const dateDesde = new Date(desde);
  const dateHasta = new Date(hasta);
  return dateDesde <= dateHasta;
}

/**
 * Valida que los parámetros requeridos estén presentes
 */
export function validarParametrosRequeridos(
  params: Record<string, unknown>,
  required: string[]
): { valido: boolean; faltantes: string[] } {
  const faltantes = required.filter(
    (param) => params[param] === undefined || params[param] === null || params[param] === ""
  );

  return {
    valido: faltantes.length === 0,
    faltantes,
  };
}

/**
 * Sanitiza un string para prevenir inyecciones
 */
export function sanitizarString(str: string): string {
  return str
    .trim()
    .replace(/[<>\"']/g, "")
    .slice(0, 500); // Máximo 500 caracteres
}

/**
 * Valida número positivo
 */
export function validarNumeroPositivo(num: number): boolean {
  return typeof num === "number" && num > 0 && !isNaN(num);
}

/**
 * Valida que un valor esté en un conjunto permitido
 */
export function validarEnum<T extends string>(
  value: string,
  allowedValues: readonly T[]
): value is T {
  return (allowedValues as readonly string[]).includes(value);
}
