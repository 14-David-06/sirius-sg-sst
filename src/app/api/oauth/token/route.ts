import { json, OPTIONS as preflight } from "@/lib/mcp/cors";
import {
  calcularChallenge,
  firmarAcceso,
  firmarRefresco,
  leerCodigo,
  leerRefresco,
  recursoDe,
  VIDA_ACCESO_SEGUNDOS,
  type DatosToken,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";

export { preflight as OPTIONS };

/**
 * Canje de código por token, y renovación.
 *
 * No hay autenticación de cliente porque un cliente MCP no tiene dónde guardar
 * un secreto: son clientes públicos. Lo que ata el token a quien pidió el
 * código es PKCE, y por eso el `code_verifier` no es opcional.
 */
export async function POST(request: Request) {
  const params = await leerParametros(request);
  if (!params) return error("invalid_request", "No pudimos leer los parámetros.");

  const tipo = params.get("grant_type");
  if (tipo === "authorization_code") return canjearCodigo(request, params);
  if (tipo === "refresh_token") return renovar(request, params);

  return error("unsupported_grant_type", "Solo se admiten authorization_code y refresh_token.");
}

async function canjearCodigo(request: Request, params: URLSearchParams) {
  const codigo = params.get("code");
  const verifier = params.get("code_verifier");
  const clientId = params.get("client_id");

  if (!codigo || !verifier || !clientId) {
    return error("invalid_request", "Faltan code, code_verifier o client_id.");
  }

  const datos = leerCodigo(codigo);
  if (!datos) {
    // Vencido (viven 60 segundos), manipulado, o firmado con otro secreto.
    return error("invalid_grant", "El código no es válido o ya expiró.");
  }

  if (datos.clientId !== clientId) {
    return error("invalid_grant", "El código fue emitido para otro cliente.");
  }

  // Si el cliente manda el redirect_uri en el canje, tiene que ser el mismo.
  const redirectUri = params.get("redirect_uri");
  if (redirectUri && redirectUri !== datos.redirectUri) {
    return error("invalid_grant", "El redirect_uri no coincide con el del código.");
  }

  // PKCE: lo único que demuestra que quien canjea es quien pidió.
  if ((await calcularChallenge(verifier)) !== datos.codeChallenge) {
    return error("invalid_grant", "El code_verifier no corresponde al desafío.");
  }

  return emitir(request, {
    numeroDocumento: datos.numeroDocumento,
    clientId: datos.clientId,
    scopes: datos.scopes,
    resource: datos.resource,
  });
}

async function renovar(request: Request, params: URLSearchParams) {
  const token = params.get("refresh_token");
  const clientId = params.get("client_id");

  if (!token) return error("invalid_request", "Falta refresh_token.");

  const datos = leerRefresco(token);
  if (!datos) return error("invalid_grant", "El refresh_token no es válido o ya expiró.");
  if (clientId && datos.clientId !== clientId) {
    return error("invalid_grant", "El refresh_token es de otro cliente.");
  }

  // Renovar no puede ampliar lo concedido.
  const pedidos = (params.get("scope") ?? "").split(/\s+/).filter(Boolean);
  const fuera = pedidos.find((scope) => !datos.scopes.includes(scope));
  if (fuera) return error("invalid_scope", `«${fuera}» no estaba entre lo autorizado.`);

  return emitir(request, { ...datos, scopes: pedidos.length > 0 ? pedidos : datos.scopes });
}

/**
 * Emite el par de tokens. El de refresco se rota en cada uso, como recomienda
 * OAuth 2.1 para clientes públicos; el anterior sigue valiendo hasta vencer
 * —sin almacén no se puede tachar—, pero el que queda en el cliente es el último.
 */
function emitir(request: Request, datos: DatosToken) {
  const conRecurso = { ...datos, resource: datos.resource || recursoDe(request) };

  return json({
    access_token: firmarAcceso(conRecurso),
    token_type: "Bearer",
    expires_in: VIDA_ACCESO_SEGUNDOS,
    refresh_token: firmarRefresco(conRecurso),
    scope: conRecurso.scopes.join(" "),
  });
}

/**
 * La especificación pide form-urlencoded, pero algún cliente manda JSON;
 * aceptar los dos ahorra un fallo que desde fuera se ve como "no autoriza".
 */
async function leerParametros(request: Request): Promise<URLSearchParams | null> {
  const tipo = request.headers.get("content-type") ?? "";

  try {
    if (tipo.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      const params = new URLSearchParams();
      for (const [clave, valor] of Object.entries(body)) {
        if (typeof valor === "string") params.set(clave, valor);
      }
      return params;
    }

    return new URLSearchParams(await request.text());
  } catch {
    return null;
  }
}

function error(codigo: string, descripcion: string): Response {
  return json({ error: codigo, error_description: descripcion }, { status: 400 });
}
