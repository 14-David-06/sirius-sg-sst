/**
 * Límite de intentos para las pantallas que prueban contraseñas.
 *
 * Hoy lo usa la autorización del conector MCP (`/api/oauth/authorize`). Se
 * limita en dos dimensiones y basta que una se pase:
 *
 *  - Por documento: protege una cuenta concreta de que le adivinen la clave.
 *  - Por IP: protege el padrón completo. Sin esta, probar mil documentos
 *    distintos no encuentra límite, porque cada uno arranca su contador.
 *
 * El almacén es Redis por HTTP (Upstash o compatible) cuando está configurado
 * (`UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`), y un Map en memoria
 * cuando no. En memoria alcanza para una instancia: en Vercel cada lambda tiene
 * el suyo, así que el tope real se multiplica por el número de instancias.
 *
 * Copia del de Sirius CRM (`src/lib/rate-limit.ts`).
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.trim();
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

function limitePersistente(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

type Regla = { max: number; ventanaSegundos: number };

/** Intentos contra una cuenta concreta. */
const POR_DOCUMENTO: Regla = { max: 8, ventanaSegundos: 10 * 60 };

/**
 * Intentos desde una misma IP contra cualquier documento. Más holgado porque
 * una oficina entera puede salir por la misma IP, pero lo bastante bajo para
 * que recorrer el padrón no sea práctico.
 */
const POR_IP: Regla = { max: 30, ventanaSegundos: 10 * 60 };

const enMemoria = new Map<string, { cuenta: number; expiraEn: number }>();

function contarEnMemoria(clave: string, ventanaSegundos: number): number {
  const ahora = Date.now();
  const entrada = enMemoria.get(clave);

  if (!entrada || entrada.expiraEn < ahora) {
    enMemoria.set(clave, { cuenta: 1, expiraEn: ahora + ventanaSegundos * 1000 });
    return 1;
  }

  entrada.cuenta += 1;
  return entrada.cuenta;
}

/**
 * INCR + EXPIRE en una llamada. `NX` para no reiniciar la ventana en cada
 * intento: si no, quien insiste sin parar la extiende para siempre.
 */
async function contarEnRedis(clave: string, ventanaSegundos: number): Promise<number> {
  const respuesta = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", clave],
      ["EXPIRE", clave, String(ventanaSegundos), "NX"],
    ]),
    cache: "no-store",
  });

  if (!respuesta.ok) throw new Error(`Redis ${respuesta.status}`);

  const datos = (await respuesta.json()) as { result?: unknown }[];
  const cuenta = Number(datos[0]?.result);
  if (!Number.isFinite(cuenta)) throw new Error("Redis devolvió una cuenta ilegible");

  return cuenta;
}

let avisoDado = false;

/**
 * Suma un intento y devuelve la cuenta. Si Redis falla se cae al Map en vez
 * de dejar pasar todo: un límite por instancia protege menos, pero protege.
 */
async function contar(clave: string, regla: Regla): Promise<number> {
  if (!limitePersistente()) {
    if (!avisoDado && process.env.NODE_ENV === "production") {
      avisoDado = true;
      console.warn(
        "[limiteIntentos] Sin Redis: en producción el tope real es por instancia. " +
          "Configura UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.",
      );
    }
    return contarEnMemoria(clave, regla.ventanaSegundos);
  }

  try {
    return await contarEnRedis(clave, regla.ventanaSegundos);
  } catch (error) {
    console.error("[limiteIntentos] Redis falló, uso memoria:", error);
    return contarEnMemoria(clave, regla.ventanaSegundos);
  }
}

/** La IP del cliente según la cabecera que pone el proxy de despliegue. */
export function ipDe(request: Request): string {
  const cabecera =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
  return cabecera.split(",")[0]?.trim() || "ip-desconocida";
}

/**
 * Suma un intento en las dos dimensiones. True si hay que rechazar.
 * `accion` separa los contadores de flujos distintos.
 */
export async function excedeIntentos(
  accion: string,
  numeroDocumento: string,
  ip: string,
): Promise<boolean> {
  const [porDocumento, porIp] = await Promise.all([
    contar(`intentos:${accion}:doc:${numeroDocumento}`, POR_DOCUMENTO),
    contar(`intentos:${accion}:ip:${ip}`, POR_IP),
  ]);

  return porDocumento > POR_DOCUMENTO.max || porIp > POR_IP.max;
}

/** Borra el contador de un documento tras un ingreso correcto. */
export async function olvidarIntentos(accion: string, numeroDocumento: string): Promise<void> {
  const clave = `intentos:${accion}:doc:${numeroDocumento}`;
  enMemoria.delete(clave);

  if (!limitePersistente()) return;

  try {
    await fetch(`${REDIS_URL}/del/${encodeURIComponent(clave)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      cache: "no-store",
    });
  } catch (error) {
    // No es grave: el contador expira solo al cerrarse la ventana.
    console.error("[limiteIntentos] No se pudo borrar el contador:", error);
  }
}
