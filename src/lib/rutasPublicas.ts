/**
 * Las únicas rutas de `/api` que responden sin sesión.
 *
 * `src/proxy.ts` exige un JWT válido en todo `/api/*` salvo lo que esté aquí.
 * Cada entrada sale de una pantalla pública que la llama de verdad —firma de
 * asistencia, firma de EPP, evaluación, inducción, encuesta sociodemográfica—
 * o de un flujo que se autentica por su cuenta (OAuth y el conector MCP).
 *
 * Reglas para tocar esta lista:
 *
 *   - Ruta y método, nunca un prefijo suelto. `/api/politicas/:id` abierto por
 *     GET abriría también `/api/politicas/estadisticas`, porque las rutas
 *     estáticas comparten forma con la dinámica; por eso ahí el id va atado al
 *     formato de record id de Airtable.
 *   - Si una pantalla pública nueva llama a `/api`, su ruta se agrega aquí con
 *     el método exacto. Sin eso responde 401 y la pantalla falla.
 *   - Una ruta pública no puede confiar en nadie: tiene que validar el token
 *     del enlace (o el que corresponda) dentro del handler.
 */

type Regla = {
  patron: RegExp;
  /** Métodos admitidos sin sesión. `*` = todos (la ruta se autentica sola). */
  metodos: readonly string[] | "*";
};

/** Un segmento de ruta cualquiera (token, id). */
const SEG = "[^/]+";
/** Record id de Airtable: `rec` + 14 caracteres alfanuméricos. */
const REC = "rec[A-Za-z0-9]{14}";

const ruta = (camino: string) => new RegExp(`^${camino}/?$`);

export const RUTAS_PUBLICAS: readonly Regla[] = [
  // Login de tres pasos (pantalla /login)
  { patron: ruta("/api/auth/(?:login|verify|register)"), metodos: ["POST"] },

  // OAuth del conector remoto y el endpoint MCP: se autentican con su propio
  // token Bearer, que no es un JWT de sesión.
  { patron: ruta("/api/oauth/(?:authorize|token|register)"), metodos: "*" },
  { patron: ruta("/api/oauth/metadata/(?:autorizacion|recurso)"), metodos: "*" },
  { patron: ruta("/api/mcp"), metodos: "*" },

  // /firmar/capacitacion y /evaluar/capacitacion
  { patron: ruta("/api/registros-asistencia/firmar-publico"), metodos: ["GET", "POST"] },
  // EvaluacionFlow (dentro de las dos pantallas anteriores)
  { patron: ruta("/api/evaluaciones/pendientes"), metodos: ["GET"] },
  { patron: ruta(`/api/evaluaciones/plantilla/${SEG}`), metodos: ["GET"] },
  { patron: ruta("/api/evaluaciones/responder"), metodos: ["POST"] },

  // /firmar/epp
  { patron: ruta("/api/entregas-epp/token/validar"), metodos: ["GET"] },
  { patron: ruta("/api/entregas-epp/firmar-publico"), metodos: ["POST"] },

  // /firmar/inspeccion-equipos
  { patron: ruta("/api/inspecciones-equipos/token/validar"), metodos: ["GET"] },
  { patron: ruta("/api/inspecciones-equipos/firmar-publico"), metodos: ["POST"] },

  // /firmar/politica
  { patron: ruta("/api/politicas/token"), metodos: ["GET"] },
  { patron: ruta(`/api/politicas/${REC}`), metodos: ["GET"] },
  { patron: ruta("/api/politicas/firmar"), metodos: ["POST"] },

  // /inducciones/firma/[token] y EvaluacionInduccion
  { patron: ruta(`/api/inducciones/token/${SEG}`), metodos: ["GET"] },
  { patron: ruta(`/api/inducciones/firma/${SEG}`), metodos: ["POST"] },
  { patron: ruta("/api/inducciones/constancia"), metodos: ["POST"] },
  { patron: ruta("/api/inducciones/documento-unificado"), metodos: ["POST"] },
  { patron: ruta("/api/inducciones/evaluacion"), metodos: ["GET", "POST"] },

  // /encuesta/socio/[token]
  { patron: ruta(`/api/socio/tokens/validar/${SEG}`), metodos: ["GET"] },
  { patron: ruta(`/api/socio/respuestas/${SEG}`), metodos: ["POST"] },
];

/** True si la ruta responde sin sesión para ese método. */
export function esRutaPublica(pathname: string, metodo: string): boolean {
  // HEAD es un GET sin cuerpo; el preflight de CORS nunca lleva credenciales.
  const verbo = metodo.toUpperCase() === "HEAD" ? "GET" : metodo.toUpperCase();
  if (verbo === "OPTIONS") return true;

  return RUTAS_PUBLICAS.some(
    ({ patron, metodos }) =>
      patron.test(pathname) && (metodos === "*" || metodos.includes(verbo)),
  );
}
