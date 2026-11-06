import { json, OPTIONS as preflight } from "@/lib/mcp/cors";
import { origenDe, recursoDe, SCOPES } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { preflight as OPTIONS };

/**
 * Metadatos del recurso protegido (RFC 9728): le dicen al cliente que
 * `/api/mcp` se autoriza con el servidor de OAuth de este mismo origen.
 *
 * Es lo primero que lee claude.ai tras el 401 de `/api/mcp`, siguiendo el
 * `resource_metadata` de la cabecera `WWW-Authenticate`. Se sirve en
 * `/.well-known/oauth-protected-resource` por un rewrite de `next.config.ts`.
 */
export function GET(request: Request) {
  return json({
    resource: recursoDe(request),
    authorization_servers: [origenDe(request)],
    scopes_supported: SCOPES,
    bearer_methods_supported: ["header"],
    resource_name: "Sirius SG-SST",
  });
}
