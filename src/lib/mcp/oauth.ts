/**
 * OAuth 2.1 para el conector MCP remoto.
 *
 * SG-SST es a la vez el servidor de autorización y el servidor de recursos:
 * quien se conecta desde claude.ai entra con su número de documento y su
 * contraseña de SG-SST, y el conector queda con SU sesión y SU nivel de
 * acceso. No hay cuenta de servicio compartida.
 *
 * Es el mismo diseño del conector de Sirius CRM.
 *
 * ## Por qué no hay base de datos
 *
 * Todo lo que OAuth necesita recordar —el cliente registrado, el código de
 * autorización, el token— va firmado dentro del propio valor. En Vercel cada
 * petición puede caer en una lambda distinta, así que lo guardado en memoria se
 * pierde, y montar Redis solo para esto sería infraestructura nueva. Un JWT
 * firmado es el mismo dato, sin servidor detrás.
 *
 * ## De dónde sale la clave
 *
 * De `JWT_SECRET`, derivada con HKDF y una etiqueta distinta por uso. No hay
 * una variable de entorno más que configurar y, a la vez, un token de acceso
 * del conector no sirve como sesión del dashboard ni al revés: son claves
 * distintas aunque nazcan del mismo secreto.
 *
 * ## Revocación
 *
 * Un token firmado no se puede "borrar". Lo que sí pasa es que la identidad se
 * vuelve a leer de Airtable en cada llamada a `/api/mcp`, así que:
 *
 *   - Inactivar a la persona en Sirius Nómina Core corta el acceso.
 *   - Quitarle el acceso a la app SG-SST, también.
 *   - Bajarle el nivel se refleja en la siguiente llamada.
 *   - Rotar `JWT_SECRET` invalida todos los tokens de golpe (y todas las
 *     sesiones del dashboard).
 *
 * Los tokens de acceso duran una hora para que esa ventana sea corta.
 */

import { hkdfSync } from "node:crypto";
import jwt from "jsonwebtoken";

/** Consultar se concede siempre; registrar es opcional y lo decide la persona. */
export const SCOPE_LEER = "sgsst.leer";
export const SCOPE_ESCRIBIR = "sgsst.escribir";
export const SCOPES = [SCOPE_LEER, SCOPE_ESCRIBIR] as const;

const VIDA = {
  /** Lo justo para ir del navegador al token endpoint. */
  codigo: 60,
  /** Corto a propósito: es la ventana en la que un token robado sirve. */
  acceso: 60 * 60,
  refresco: 60 * 60 * 24 * 30,
  /** El registro del cliente tiene que seguir sirviendo meses después. */
  cliente: 60 * 60 * 24 * 365 * 5,
} as const;

export const VIDA_ACCESO_SEGUNDOS = VIDA.acceso;

type Uso = "cliente" | "codigo" | "acceso" | "refresco";
type Datos = Record<string, unknown>;

/**
 * Una clave por uso, derivada del secreto de sesión. HKDF con `info` distinto
 * da claves independientes: firmar un código de autorización no permite
 * fabricar un token de acceso.
 */
function clave(uso: Uso): Buffer {
  const secreto = process.env.JWT_SECRET;
  if (!secreto) {
    throw new Error("JWT_SECRET no está definido: el conector MCP no puede firmar.");
  }
  return Buffer.from(hkdfSync("sha256", secreto, "sirius-sgsst-mcp-oauth", uso, 32));
}

function firmar(uso: Uso, datos: Datos, segundos: number): string {
  return jwt.sign({ ...datos, uso }, clave(uso), {
    algorithm: "HS256",
    expiresIn: segundos,
  });
}

/** Devuelve null en vez de lanzar: un token inválido es un 401, no un 500. */
function verificar(uso: Uso, token: string): Datos | null {
  try {
    const datos = jwt.verify(token, clave(uso), { algorithms: ["HS256"] });
    if (typeof datos !== "object" || datos === null) return null;
    // El `uso` va firmado dentro además de decidir la clave: un token de otro
    // tipo no pasa ni por accidente.
    return (datos as Datos).uso === uso ? (datos as Datos) : null;
  } catch {
    return null;
  }
}

const texto = (valor: unknown): valor is string => typeof valor === "string";
const lista = (valor: unknown): string[] =>
  Array.isArray(valor) ? valor.filter(texto) : [];

/* --------------------------- Cliente registrado --------------------------- */

/**
 * Un cliente MCP se registra solo (RFC 7591): claude.ai llama a
 * `/api/oauth/register` y recibe un `client_id`. Aquí ese `client_id` *es* el
 * registro, firmado, así que no hay nada que guardar ni que limpiar.
 */
export type ClienteRegistrado = {
  redirectUris: string[];
  nombre: string | null;
};

export function registrarCliente(cliente: ClienteRegistrado): string {
  return firmar("cliente", { ru: cliente.redirectUris, nom: cliente.nombre }, VIDA.cliente);
}

export function leerCliente(clientId: string): ClienteRegistrado | null {
  const datos = verificar("cliente", clientId);
  if (!datos || !Array.isArray(datos.ru)) return null;

  return {
    redirectUris: lista(datos.ru),
    nombre: texto(datos.nom) ? datos.nom : null,
  };
}

/* ------------------------- Código de autorización ------------------------- */

export type DatosCodigo = {
  /** Documento de quien autorizó; la identidad se relee en cada llamada. */
  numeroDocumento: string;
  clientId: string;
  redirectUri: string;
  /** PKCE S256, obligatorio. */
  codeChallenge: string;
  scopes: string[];
  /** RFC 8707: para qué recurso vale el token que salga de aquí. */
  resource: string;
};

export function firmarCodigo(datos: DatosCodigo): string {
  return firmar(
    "codigo",
    {
      doc: datos.numeroDocumento,
      cid: datos.clientId,
      ru: datos.redirectUri,
      ch: datos.codeChallenge,
      sc: datos.scopes,
      res: datos.resource,
    },
    VIDA.codigo,
  );
}

/**
 * Un código solo se puede canjear una vez, dice la especificación, y sin
 * almacenamiento no se puede tachar el usado. Lo que queda es reducir la
 * ventana: vive 60 segundos y solo sirve con el `code_verifier` de PKCE, que
 * nunca viajó por la red.
 */
export function leerCodigo(codigo: string): DatosCodigo | null {
  const datos = verificar("codigo", codigo);
  if (!datos) return null;

  const { doc, cid, ru, ch, sc, res } = datos;
  if (!texto(doc) || !texto(cid) || !texto(ru) || !texto(ch) || !texto(res)) {
    return null;
  }

  return {
    numeroDocumento: doc,
    clientId: cid,
    redirectUri: ru,
    codeChallenge: ch,
    scopes: lista(sc),
    resource: res,
  };
}

/* ------------------------------- Los tokens ------------------------------- */

export type DatosToken = {
  numeroDocumento: string;
  clientId: string;
  scopes: string[];
  resource: string;
};

/**
 * El token lleva el documento, no el nivel de acceso. Meter el nivel aquí lo
 * congelaría hasta que el token venciera.
 */
function firmarToken(uso: "acceso" | "refresco", datos: DatosToken): string {
  return firmar(
    uso,
    { doc: datos.numeroDocumento, cid: datos.clientId, sc: datos.scopes, res: datos.resource },
    VIDA[uso],
  );
}

function leerToken(uso: "acceso" | "refresco", token: string): DatosToken | null {
  const datos = verificar(uso, token);
  if (!datos || !texto(datos.doc) || !texto(datos.cid)) return null;

  return {
    numeroDocumento: datos.doc,
    clientId: datos.cid,
    scopes: lista(datos.sc),
    resource: texto(datos.res) ? datos.res : "",
  };
}

export const firmarAcceso = (datos: DatosToken) => firmarToken("acceso", datos);
export const firmarRefresco = (datos: DatosToken) => firmarToken("refresco", datos);
export const leerAcceso = (token: string) => leerToken("acceso", token);
export const leerRefresco = (token: string) => leerToken("refresco", token);

/* -------------------------------- Utilidades ------------------------------ */

/**
 * El origen público de SG-SST según la petición.
 *
 * Detrás del proxy de Vercel, `request.url` trae el host interno; el que el
 * cliente conoce —y el que tiene que aparecer en los metadatos de OAuth, donde
 * cualquier discrepancia rompe el flujo— viene en `x-forwarded-*`.
 */
export function origenDe(request: Request): string {
  const cabeceras = request.headers;
  const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host");
  if (!host) return new URL(request.url).origin;

  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocolo = cabeceras.get("x-forwarded-proto") ?? (local ? "http" : "https");

  return `${protocolo}://${host}`;
}

/** La URL del endpoint MCP, que es el "recurso" en términos de OAuth. */
export function recursoDe(request: Request): string {
  return `${origenDe(request)}/api/mcp`;
}

/** PKCE S256: SHA-256 del verifier en base64url. */
export async function calcularChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url");
}

/**
 * Si el `redirect_uri` es uno de los que el cliente registró. Comparación
 * exacta, como manda OAuth 2.1: aceptar prefijos es el agujero por el que se
 * filtra un código de autorización a otro sitio.
 */
export function redirectPermitido(cliente: ClienteRegistrado, redirectUri: string): boolean {
  return cliente.redirectUris.includes(redirectUri);
}
