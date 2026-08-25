// ══════════════════════════════════════════════════════════
// Validación de configuración Airtable
//
// Los objetos de config usan `process.env.X!`, lo que hace que una variable
// ausente se convierta en `undefined` sin que TypeScript avise. Al usarse como
// clave computada (`{ [F.CAMPO]: valor }`) se transforma en la cadena literal
// "undefined", y Airtable rechaza el request entero con un error opaco.
//
// Este módulo recorre las configuraciones y reporta qué falta, para detectarlo
// al arrancar en vez de en el primer request de un usuario.
// ══════════════════════════════════════════════════════════
import { airtableConfig } from "./airtable";
import { airtableInsumosConfig } from "./airtableInsumos";
import { airtableSGSSTConfig } from "./airtableSGSST";

export interface ProblemaConfig {
  /** Config raíz: "SG-SST", "Personal", "Insumos SST". */
  base: string;
  /** Ruta dentro del objeto: "medExamenesFields.CONSECUTIVO". */
  ruta: string;
  tipo: "faltante" | "placeholder";
}

export interface ResultadoValidacion {
  valido: boolean;
  problemas: ProblemaConfig[];
  totalRevisado: number;
}

/** Valores que indican una variable declarada pero sin configurar de verdad. */
const PLACEHOLDERS = [
  "fldPENDIENTE",
  "tblPENDIENTE",
  "PENDIENTE",
  "undefined",
  "",
];

function esPlaceholder(valor: string): boolean {
  return PLACEHOLDERS.some(
    (p) => valor === p || (p !== "" && valor.startsWith(p))
  );
}

function revisarObjeto(
  base: string,
  objeto: Record<string, unknown>,
  problemas: ProblemaConfig[],
  prefijo = ""
): number {
  let revisados = 0;

  for (const [clave, valor] of Object.entries(objeto)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;

    // No validamos baseUrl ni el token: no son IDs de Airtable.
    if (clave === "baseUrl") continue;

    if (valor === undefined || valor === null) {
      problemas.push({ base, ruta, tipo: "faltante" });
      revisados++;
      continue;
    }

    if (typeof valor === "string") {
      revisados++;
      if (esPlaceholder(valor)) {
        problemas.push({ base, ruta, tipo: "placeholder" });
      }
      continue;
    }

    if (typeof valor === "object" && !Array.isArray(valor)) {
      revisados += revisarObjeto(
        base,
        valor as Record<string, unknown>,
        problemas,
        ruta
      );
    }
  }

  return revisados;
}

/**
 * Revisa las tres configuraciones de Airtable.
 *
 * No lanza: devuelve el reporte para que quien llame decida si aborta el
 * arranque, loguea una advertencia o lo expone en un endpoint de diagnóstico.
 */
export function validateConfig(): ResultadoValidacion {
  const problemas: ProblemaConfig[] = [];
  let totalRevisado = 0;

  totalRevisado += revisarObjeto(
    "SG-SST",
    airtableSGSSTConfig as unknown as Record<string, unknown>,
    problemas
  );
  totalRevisado += revisarObjeto(
    "Personal",
    airtableConfig as unknown as Record<string, unknown>,
    problemas
  );
  totalRevisado += revisarObjeto(
    "Insumos SST",
    airtableInsumosConfig as unknown as Record<string, unknown>,
    problemas
  );

  return {
    valido: problemas.length === 0,
    problemas,
    totalRevisado,
  };
}

/** Agrupa los problemas por base y por tabla, para un reporte legible. */
export function agruparProblemas(
  problemas: ProblemaConfig[]
): Record<string, Record<string, ProblemaConfig[]>> {
  const out: Record<string, Record<string, ProblemaConfig[]>> = {};

  for (const p of problemas) {
    const tabla = p.ruta.includes(".") ? p.ruta.split(".")[0] : "(raíz)";
    out[p.base] ??= {};
    out[p.base][tabla] ??= [];
    out[p.base][tabla].push(p);
  }

  return out;
}

/** Reporte en texto plano, para consola o para un endpoint de diagnóstico. */
export function formatearReporte(resultado: ResultadoValidacion): string {
  if (resultado.valido) {
    return `Configuración Airtable correcta — ${resultado.totalRevisado} IDs revisados.`;
  }

  const lineas: string[] = [
    `Configuración Airtable incompleta — ${resultado.problemas.length} de ${resultado.totalRevisado} IDs con problema:`,
    "",
  ];

  const agrupado = agruparProblemas(resultado.problemas);

  for (const [base, tablas] of Object.entries(agrupado)) {
    lineas.push(`Base ${base}:`);
    for (const [tabla, items] of Object.entries(tablas)) {
      lineas.push(`  ${tabla}`);
      for (const item of items) {
        const motivo =
          item.tipo === "faltante"
            ? "variable de entorno ausente"
            : "valor placeholder sin reemplazar";
        lineas.push(`    - ${item.ruta}: ${motivo}`);
      }
    }
    lineas.push("");
  }

  return lineas.join("\n");
}
