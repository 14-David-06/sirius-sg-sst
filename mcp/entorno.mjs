/**
 * La configuración del conector local (stdio), leída del mismo `.env.local`
 * que usa la app.
 *
 * Se lee del archivo y no solo de `process.env` porque quien arranca el
 * servidor MCP es Claude, no una terminal: no hay shell donde exportar nada.
 * El entorno del proceso manda sobre el archivo.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Parser mínimo de dotenv: `CLAVE=valor`, comillas opcionales, `#` comenta. */
function leerArchivo(ruta) {
  let contenido;
  try {
    contenido = readFileSync(ruta, "utf8");
  } catch {
    return {};
  }

  const valores = {};
  for (const linea of contenido.split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;

    const corte = limpia.indexOf("=");
    if (corte < 1) continue;

    let valor = limpia.slice(corte + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    valores[limpia.slice(0, corte).trim()] = valor;
  }
  return valores;
}

const archivo = {
  ...leerArchivo(resolve(RAIZ, ".env")),
  ...leerArchivo(resolve(RAIZ, ".env.local")),
};

export function leer(nombre) {
  const valor = process.env[nombre] ?? archivo[nombre];
  return valor?.trim() ? valor.trim() : null;
}

function obligatorio(nombre, ayuda) {
  const valor = leer(nombre);
  if (!valor) throw new Error(`Falta ${nombre} en .env.local (o en el entorno). ${ayuda}`);
  return valor;
}

export const config = {
  /** Sin barra final, para que las rutas se peguen sin duplicarla. */
  get url() {
    return (leer("SGSST_MCP_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  },
  get numeroDocumento() {
    return obligatorio(
      "SGSST_MCP_DOCUMENTO",
      "Es el número de documento con el que entras a SG-SST; el conector hereda tu nivel de acceso.",
    );
  },
  get password() {
    return obligatorio("SGSST_MCP_PASSWORD", "Es tu contraseña de SG-SST.");
  },
  /** Con 1 o true el conector no expone ninguna herramienta que registre. */
  get soloLectura() {
    const valor = leer("SGSST_MCP_SOLO_LECTURA");
    return valor === "1" || valor?.toLowerCase() === "true";
  },
};
