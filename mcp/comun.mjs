/**
 * Utilidades que comparten las herramientas: resolver referencias, armar
 * consultas y recortar respuestas.
 *
 * Los resolvedores reciben el cliente de SG-SST (`api`) como primer argumento
 * en vez de importarlo: así las mismas herramientas sirven al servidor stdio y
 * al endpoint remoto, cada uno con su propia sesión.
 */

import { z } from "zod";

export const SOLO_LECTURA = { readOnlyHint: true, openWorldHint: false };
export const ESCRITURA = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

/** `YYYY-MM-DD`, que es lo único que aceptan las rutas de SG-SST. */
export const FECHA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato YYYY-MM-DD.");

export const LIMITE = z
  .number()
  .int()
  .min(1)
  .max(500)
  .optional()
  .describe("Máximo de registros en la respuesta (por defecto 50).");

/** Sin acentos, sin mayúsculas, sin espacios de más. */
export function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function contiene(texto, buscado) {
  return normalizar(texto).includes(normalizar(buscado));
}

/** Quita las claves nulas o vacías: la respuesta se lee sin ruido. */
export function limpiar(objeto) {
  const salida = {};
  for (const [clave, valor] of Object.entries(objeto)) {
    if (valor === null || valor === undefined || valor === "") continue;
    if (Array.isArray(valor) && valor.length === 0) continue;
    salida[clave] = valor;
  }
  return salida;
}

/** El día de hoy en Bogotá, la zona en la que opera SG-SST. */
export function hoy() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Primer y último día de un mes; sin argumentos, el mes en curso en Bogotá. */
export function rangoMes(mes, anio) {
  const [a, m] = hoy().split("-").map(Number);
  const anioFinal = anio ?? a;
  const mesFinal = mes ?? m;
  const ultimo = new Date(Date.UTC(anioFinal, mesFinal, 0)).getUTCDate();
  const mm = String(mesFinal).padStart(2, "0");
  return {
    desde: `${anioFinal}-${mm}-01`,
    hasta: `${anioFinal}-${mm}-${String(ultimo).padStart(2, "0")}`,
  };
}

/** `?a=1&b=2` sin los parámetros vacíos; "" si no queda ninguno. */
export function consulta(parametros) {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === null || valor === "") continue;
    params.set(clave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

/**
 * Toda respuesta sale como JSON en un bloque de texto: es lo que cualquier
 * cliente MCP puede mostrar y, a diferencia de una tabla en prosa, conserva los
 * identificadores que hacen falta para la llamada siguiente.
 */
export function respuesta(datos) {
  return { content: [{ type: "text", text: JSON.stringify(datos, null, 1) }] };
}

/** Recorta una lista y dice cuántos había, para que nadie lea 50 como "todos". */
export function recortar(lista, limite = 50) {
  return {
    total: lista.length,
    ...(lista.length > limite ? { mostrados: limite, aviso: "Lista recortada: usa filtros o sube `limite`." } : {}),
    registros: lista.slice(0, limite),
  };
}

/**
 * Lo que interesa de una persona en una respuesta. Ni la foto ni el número de
 * documento: se puede buscar por documento, pero no hace falta repetirlo.
 */
export function resumirPersona(persona) {
  return limpiar({
    idEmpleado: persona.idEmpleado,
    nombreCompleto: persona.nombreCompleto,
    cargo: persona.tipoPersonal,
  });
}

/**
 * Una persona activa de Personal, por nombre, documento o ID de empleado
 * (`SIRIUS-PER-0016`).
 *
 * Ante varios candidatos no elige: los devuelve en el error para que la
 * conversación lo aclare. Registrar un accidente o una entrega de EPP a nombre
 * de otra persona es peor que preguntar.
 */
export async function resolverTrabajador(api, referencia) {
  const { data: personal = [] } = await api.obtener("/api/personal");
  const buscado = normalizar(referencia);

  const exacto = personal.find(
    (persona) =>
      normalizar(persona.idEmpleado) === buscado ||
      normalizar(persona.numeroDocumento) === buscado ||
      normalizar(persona.nombreCompleto) === buscado,
  );
  if (exacto) return exacto;

  // Todas las palabras dichas tienen que estar en el nombre: «Laura Pérez»
  // encuentra a «Laura Camila Pérez Gómez».
  const palabras = buscado.split(" ").filter(Boolean);
  const parciales = personal.filter((persona) =>
    palabras.every((palabra) => normalizar(persona.nombreCompleto).includes(palabra)),
  );
  if (parciales.length === 1) return parciales[0];

  if (parciales.length === 0) {
    throw new Error(
      `No hay nadie activo en Personal que coincida con «${referencia}». ` +
        "Usa sgsst_buscar_trabajador para ver los nombres.",
    );
  }

  const lista = parciales
    .slice(0, 10)
    .map((persona) => `${persona.idEmpleado} — ${persona.nombreCompleto}`)
    .join("; ");
  throw new Error(
    `«${referencia}» coincide con ${parciales.length} personas: ${lista}. Precisa cuál.`,
  );
}

/**
 * Busca en una lista por record id o por el consecutivo legible
 * (`AT-2026-001`, `ACC-2026-004`…), que es como la gente nombra los registros.
 */
export function porReferencia(registros, referencia, campoConsecutivo) {
  const buscado = normalizar(referencia);
  return (
    registros.find(
      (registro) =>
        registro.recordId === referencia ||
        registro.id === referencia ||
        normalizar(registro[campoConsecutivo]) === buscado,
    ) ?? null
  );
}
