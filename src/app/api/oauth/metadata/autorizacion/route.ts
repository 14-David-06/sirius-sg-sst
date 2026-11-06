import { json, OPTIONS as preflight } from "@/lib/mcp/cors";
import { origenDe, SCOPES } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { preflight as OPTIONS };

/**
 * Metadatos del servidor de autorización (RFC 8414).
 *
 * Se sirven en `/.well-known/oauth-authorization-server` por un rewrite de
 * `next.config.ts`: el App Router no enruta carpetas que empiezan con punto.
 * El origen sale de la petición, así que el mismo código sirve en local, en
 * preview y en producción.
 */
export function GET(request: Request) {
  const origen = origenDe(request);

  return json({
    issuer: origen,
    authorization_endpoint: `${origen}/api/oauth/authorize`,
    token_endpoint: `${origen}/api/oauth/token`,
    registration_endpoint: `${origen}/api/oauth/register`,
    scopes_supported: SCOPES,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    authorization_response_iss_parameter_supported: true,
  });
}
