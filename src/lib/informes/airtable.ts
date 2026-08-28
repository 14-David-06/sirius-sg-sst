// ══════════════════════════════════════════════════════════
// Acceso a Airtable — Informe mensual de gestión SST
//
// El informe solo lee, y siempre acotado a un periodo. Este módulo concentra
// la paginación y el filtro por rango de fechas para que los consolidadores
// no repitan la mecánica.
// ══════════════════════════════════════════════════════════
import {
  getSGSSTHeaders,
  getSGSSTUrl,
} from "@/infrastructure/config/airtableSGSST";

export interface RegistroAirtable {
  id: string;
  fields: Record<string, unknown>;
}

interface RespuestaAirtable {
  records: RegistroAirtable[];
  offset?: string;
}

/** Escapa comillas simples para no romper la fórmula de Airtable. */
export function escaparFormula(valor: string): string {
  return valor.replace(/'/g, "\\'");
}

export function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function textoONulo(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function numero(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function enlaces(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

/**
 * Trae todos los registros de una tabla, siguiendo la paginación de Airtable.
 *
 * `filterByFormula` se evalúa en Airtable, no en memoria: el informe consulta
 * más de veinte tablas y traerlas completas para filtrar después es lo que
 * hace que la exportación de inspecciones-áreas tarde tanto hoy.
 */
export async function traerRegistros(
  tableId: string,
  opciones: {
    filtro?: string;
    campoOrden?: string;
    direccionOrden?: "asc" | "desc";
    /** Corta la lectura tras N registros. Sin valor, trae todo el periodo. */
    maximo?: number;
  } = {}
): Promise<RegistroAirtable[]> {
  const { filtro, campoOrden, direccionOrden = "desc", maximo } = opciones;

  const registros: RegistroAirtable[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({
      returnFieldsByFieldId: "true",
      pageSize: "100",
    });
    if (filtro) params.set("filterByFormula", filtro);
    if (campoOrden) {
      params.set("sort[0][field]", campoOrden);
      params.set("sort[0][direction]", direccionOrden);
    }
    if (offset) params.set("offset", offset);

    const res = await fetch(`${getSGSSTUrl(tableId)}?${params}`, {
      headers: getSGSSTHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const detalle = await res.text();
      throw new Error(`Airtable ${res.status} en la tabla ${tableId}: ${detalle}`);
    }

    const data = (await res.json()) as RespuestaAirtable;
    registros.push(...data.records);
    offset = data.offset;
  } while (offset && (maximo === undefined || registros.length < maximo));

  return maximo === undefined ? registros : registros.slice(0, maximo);
}

/**
 * Fórmula de rango cerrado sobre un campo de fecha.
 *
 * Airtable compara texto ISO correctamente para `YYYY-MM-DD`, que es el formato
 * en el que todo el proyecto guarda las fechas.
 */
export function filtroPeriodo(
  campoFecha: string,
  desde: string,
  hasta: string
): string {
  return (
    `AND({${campoFecha}} >= '${escaparFormula(desde)}', ` +
    `{${campoFecha}} <= '${escaparFormula(hasta)}')`
  );
}

/**
 * Ejecuta una lectura que el informe puede tolerar vacía.
 *
 * Un módulo sin configurar no debe tumbar el informe completo: se registra el
 * fallo, se devuelve la lista vacía y el consolidador lo reporta como sección
 * incompleta en vez de fingir que no hubo actividad.
 */
export async function traerOpcional(
  etiqueta: string,
  fn: () => Promise<RegistroAirtable[]>
): Promise<{ registros: RegistroAirtable[]; fallo: string | null }> {
  try {
    return { registros: await fn(), fallo: null };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error desconocido";
    console.error(`[informe-mensual] ${etiqueta}:`, mensaje);
    return { registros: [], fallo: `${etiqueta}: ${mensaje}` };
  }
}
