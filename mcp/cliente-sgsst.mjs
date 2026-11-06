/**
 * El puente con SG-SST: HTTP contra sus propias rutas de API.
 *
 * No habla con Airtable directamente, y es a propósito. Las reglas —qué campos
 * son obligatorios, qué catálogo admite cada select, quién puede qué— viven en
 * las rutas de `src/app/api` y en `src/proxy.ts`. Un conector que fuera por su
 * cuenta a Airtable tendría que repetirlas y quedaría atrás el día que cambien.
 *
 * Hay dos formas de conseguir la sesión, y de ahí las dos fábricas:
 *
 *   - `clienteConLogin` entra con documento y contraseña. Es la del servidor
 *     stdio, que corre en la máquina de una persona.
 *   - `clienteConToken` recibe el JWT ya firmado. Es la del endpoint remoto
 *     `/api/mcp`, que sabe quién llama porque lo dice el token de OAuth.
 *
 * En los dos casos la sesión es la de esa persona: ninguna herramienta puede
 * nada que ella no pueda entrando al dashboard.
 */

/** Lo que tarda como máximo una llamada antes de rendirse. */
const TIEMPO_MAXIMO_MS = 50_000;

export class ErrorSgsst extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.name = "ErrorSgsst";
    this.status = status;
  }
}

async function cuerpo(respuesta) {
  const texto = await respuesta.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return { message: texto.slice(0, 300) };
  }
}

/** Las rutas de SG-SST explican el rechazo en `message` o en `error`. */
function motivo(contenido, status) {
  const texto = contenido?.message ?? contenido?.error ?? contenido?.detalle;
  return typeof texto === "string" && texto.trim()
    ? texto
    : `SG-SST respondió HTTP ${status}.`;
}

/**
 * Lo común a las dos fábricas: llamar con un JWT y, si ya no vale, dejar que
 * quien lo consiguió lo renueve y reintentar una sola vez. Un segundo 401 ya
 * es un problema de credenciales, no de vencimiento.
 */
function armar(url, conseguirToken) {
  const base = url.replace(/\/+$/, "");
  let token = null;

  async function pedir(metodo, ruta, datos, reintentar = true) {
    token ??= await conseguirToken();

    let respuesta;
    try {
      respuesta = await fetch(`${base}${ruta}`, {
        method: metodo,
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/json",
          ...(datos === undefined ? {} : { "content-type": "application/json" }),
        },
        body: datos === undefined ? undefined : JSON.stringify(datos),
        redirect: "manual",
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      });
    } catch (error) {
      const vencido = error?.name === "TimeoutError" || error?.name === "AbortError";
      throw new ErrorSgsst(
        vencido
          ? `SG-SST tardó más de ${TIEMPO_MAXIMO_MS / 1000} s en responder ${ruta}.`
          : `No pudimos conectar con SG-SST (${base}): ${error?.message ?? error}`,
        504,
      );
    }

    if (respuesta.status === 401 && reintentar) {
      token = null;
      return pedir(metodo, ruta, datos, false);
    }

    const contenido = await cuerpo(respuesta);

    // Algunas rutas responden 200 con `success: false`; también es un rechazo.
    if (!respuesta.ok || contenido?.success === false) {
      throw new ErrorSgsst(motivo(contenido, respuesta.status), respuesta.status);
    }

    return contenido ?? {};
  }

  return {
    url: base,
    pedir,
    obtener: (ruta) => pedir("GET", ruta, undefined),
    crear: (ruta, datos) => pedir("POST", ruta, datos),
    actualizar: (ruta, datos) => pedir("PUT", ruta, datos),
  };
}

/**
 * Cliente que se autentica con documento y contraseña. El JWT vive en memoria
 * del proceso; si vence, el 401 lo renueva.
 *
 * `credenciales` es una función para que la falta de una variable de entorno
 * estalle en la primera llamada a una herramienta —donde Claude puede leer el
 * mensaje— y no al arrancar el proceso.
 */
export function clienteConLogin({ url, credenciales }) {
  const base = url.replace(/\/+$/, "");

  return armar(base, async () => {
    const { numeroDocumento, password } = credenciales();
    const respuesta = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ numeroDocumento, password }),
      redirect: "manual",
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });

    const datos = await cuerpo(respuesta);
    if (!respuesta.ok || !datos?.token) {
      throw new ErrorSgsst(
        `No pudimos iniciar sesión en SG-SST (${base}): ${motivo(datos, respuesta.status)}`,
        respuesta.status,
      );
    }
    return datos.token;
  });
}

/**
 * Cliente que ya tiene la sesión firmada. Un 401 aquí no se recupera
 * renovando —no hay contraseña que reintentar—: el segundo intento falla con el
 * mensaje de SG-SST, que es lo correcto.
 */
export function clienteConToken({ url, token }) {
  return armar(url, () => token);
}
