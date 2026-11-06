import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { resolverUsuarioActivo } from "@/infrastructure/container";
import { generateJWT } from "@/lib/jwt";
import { conCors, OPTIONS as preflight } from "@/lib/mcp/cors";
import { leerAcceso, origenDe, recursoDe, SCOPE_ESCRIBIR } from "@/lib/mcp/oauth";
import { clienteConToken } from "@mcp/cliente-sgsst.mjs";
import { construirServidor } from "@mcp/servidor-comun.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Una herramienta puede encadenar varias lecturas a la API (y cada una, varias
// a Airtable); los 10 s por defecto de Vercel no alcanzan para el informe.
export const maxDuration = 60;

export { preflight as OPTIONS };

/**
 * El conector MCP remoto: las mismas herramientas del servidor stdio
 * (`mcp/servidor.mjs`), servidas por HTTP para agregarlas en claude.ai y usarlas
 * desde el celular sin instalar nada.
 *
 * ## Quién es quien llama
 *
 * El token de OAuth trae el documento de la persona que autorizó. Con él se
 * relee su ficha de Airtable *en cada petición* —activa, con acceso a SG-SST,
 * con su nivel de hoy— y se firma un JWT de sesión igual al que emite el login.
 * Las herramientas usan ese JWT contra las mismas rutas de `/api/*` que usa el
 * dashboard.
 *
 * Dar la vuelta por HTTP en lugar de llamar a `src/lib` directamente es
 * deliberado: las validaciones y los permisos viven en las rutas (y en
 * `src/proxy.ts`). Un camino "interno" tendría que reimplementarlos y podría
 * quedarse atrás del que sí se revisa.
 *
 * ## Sin estado
 *
 * Sin sesión de transporte: cada petición arma su servidor y lo cierra. En
 * Vercel dos peticiones seguidas caen en lambdas distintas.
 */

/**
 * Un 401 que le dice al cliente dónde autenticarse. La cabecera
 * `WWW-Authenticate` con `resource_metadata` (RFC 9728) es lo que arranca el
 * flujo de OAuth en claude.ai.
 */
function noAutorizado(request: Request, detalle: string): Response {
  const metadatos = `${origenDe(request)}/.well-known/oauth-protected-resource/api/mcp`;

  return conCors(
    Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: detalle }, id: null },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata="${metadatos}", error="invalid_token", error_description="${detalle}"`,
        },
      },
    ),
  );
}

type Identidad = { jwt: string; puedeEscribir: boolean };

async function autenticar(request: Request): Promise<Identidad | { error: Response }> {
  const [esquema, token] = (request.headers.get("authorization") ?? "").split(" ");
  if (esquema?.toLowerCase() !== "bearer" || !token) {
    return { error: noAutorizado(request, "Falta el token de acceso.") };
  }

  const datos = leerAcceso(token);
  if (!datos) {
    return { error: noAutorizado(request, "El token no es válido o ya expiró.") };
  }

  // RFC 8707: un token emitido para otro recurso no vale aquí.
  if (datos.resource && datos.resource !== recursoDe(request)) {
    return { error: noAutorizado(request, "El token fue emitido para otro recurso.") };
  }

  let resultado;
  try {
    resultado = await resolverUsuarioActivo(datos.numeroDocumento);
  } catch (error) {
    console.error("[mcp] No se pudo releer la identidad:", error);
    return {
      error: conCors(
        Response.json(
          { error: "No pudimos verificar tu usuario en este momento." },
          { status: 502 },
        ),
      ),
    };
  }

  // La revocación real: inactivar a la persona o quitarle el acceso a SG-SST
  // en Nómina Core corta el conector en la siguiente llamada.
  if (!resultado.activo) {
    return { error: noAutorizado(request, "Tu usuario ya no está activo en SG-SST.") };
  }

  const u = resultado.user;
  return {
    // El nivel sale de Airtable ahora, no de lo que dijera el token.
    jwt: generateJWT({
      idEmpleado: u.idEmpleado,
      nombreCompleto: u.nombreCompleto,
      correoElectronico: u.correoElectronico,
      numeroDocumento: u.numeroDocumento,
      tipoPersonal: u.tipoPersonal,
      rol: u.rol,
      nivelAcceso: u.nivelAcceso,
      ordenNivel: u.ordenNivel,
    }),
    puedeEscribir: datos.scopes.includes(SCOPE_ESCRIBIR),
  };
}

async function atender(request: Request): Promise<Response> {
  const identidad = await autenticar(request);
  if ("error" in identidad) return identidad.error;

  const servidor = construirServidor({
    api: clienteConToken({ url: origenDe(request), token: identidad.jwt }),
    // Sin el scope de registro las herramientas que escriben ni se anuncian:
    // es más claro que ofrecerlas y fallar al usarlas.
    soloLectura: !identidad.puedeEscribir,
  });

  const transporte = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // JSON en vez de SSE: la respuesta sale completa y la función termina.
    enableJsonResponse: true,
  });

  try {
    await servidor.connect(transporte);
    const respuesta = await transporte.handleRequest(request);

    // El cuerpo se copia antes de cerrar: `close()` con el stream a medio leer
    // dejaría la respuesta truncada.
    const cuerpo = await respuesta.arrayBuffer();
    return conCors(new Response(cuerpo, { status: respuesta.status, headers: respuesta.headers }));
  } finally {
    await transporte.close().catch(() => {});
    await servidor.close().catch(() => {});
  }
}

export const POST = atender;
export const GET = atender;
export const DELETE = atender;
