#!/usr/bin/env node
/**
 * El conector MCP de SG-SST en su forma local: un proceso por stdio.
 *
 * Lo arranca el cliente (Claude Code, Claude Desktop) y muere con él. Entra a
 * SG-SST con el documento y la contraseña del `.env.local`, así que su techo es
 * el nivel de acceso de esa persona.
 *
 * Para el equipo, desde claude.ai o el celular, está el endpoint remoto
 * `/api/mcp`, que expone estas mismas herramientas con OAuth. Este proceso es
 * el camino corto para desarrollo contra `localhost`.
 *
 * Configuración, en `.env.local` de la raíz del repo:
 *
 *   SGSST_MCP_URL=http://localhost:3000     (o la URL de producción)
 *   SGSST_MCP_DOCUMENTO=...
 *   SGSST_MCP_PASSWORD=...
 *   SGSST_MCP_SOLO_LECTURA=1                (opcional: quita las herramientas que registran)
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { clienteConLogin } from "./cliente-sgsst.mjs";
import { config } from "./entorno.mjs";
import { construirServidor } from "./servidor-comun.mjs";

const servidor = construirServidor({
  api: clienteConLogin({
    url: config.url,
    credenciales: () => ({ numeroDocumento: config.numeroDocumento, password: config.password }),
  }),
  soloLectura: config.soloLectura,
});

// stdout es el canal del protocolo: cualquier cosa que se imprima ahí lo rompe.
console.error(
  `[sirius-sgsst] listo contra ${config.url}` + (config.soloLectura ? " (solo lectura)" : ""),
);

await servidor.connect(new StdioServerTransport());
