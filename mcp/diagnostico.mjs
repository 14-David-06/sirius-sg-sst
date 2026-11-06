#!/usr/bin/env node
/**
 * Diagnóstico del conector, sin pasar por Claude.
 *
 *   npm run mcp:diagnostico            solo arma el servidor y lista las herramientas
 *   npm run mcp:diagnostico -- --red   además entra a SG-SST con las credenciales del
 *                                      .env.local y llama algunas herramientas de consulta
 *
 * Lo primero no necesita red ni credenciales: comprueba que todas las
 * herramientas se registran (un esquema mal escrito tumba el servidor entero al
 * arrancar). Lo segundo prueba la cadena completa contra `SGSST_MCP_URL`.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { clienteConLogin } from "./cliente-sgsst.mjs";
import { config } from "./entorno.mjs";
import { construirServidor } from "./servidor-comun.mjs";

const conRed = process.argv.includes("--red");

async function conectar(api, soloLectura) {
  const servidor = construirServidor({ api, soloLectura });
  const [lado1, lado2] = InMemoryTransport.createLinkedPair();
  const cliente = new Client({ name: "diagnostico", version: "1.0.0" });
  await Promise.all([servidor.connect(lado1), cliente.connect(lado2)]);
  return cliente;
}

const sinRed = {
  obtener: async () => ({}),
  crear: async () => ({}),
  actualizar: async () => ({}),
};

const lectura = await conectar(sinRed, true);
const completo = await conectar(sinRed, false);
const { tools: soloConsulta } = await lectura.listTools();
const { tools: todas } = await completo.listTools();

console.log(`\nHerramientas: ${todas.length} (${soloConsulta.length} de consulta)\n`);
for (const t of todas) {
  console.log(`  ${t.annotations?.readOnlyHint ? "consulta " : "REGISTRA "} ${t.name}`);
}

await lectura.close();
await completo.close();

if (!conRed) {
  console.log("\nAgrega --red para probar contra", config.url);
  process.exit(0);
}

console.log(`\nContra ${config.url}\n`);
const cliente = await conectar(
  clienteConLogin({
    url: config.url,
    credenciales: () => ({ numeroDocumento: config.numeroDocumento, password: config.password }),
  }),
  true,
);

const pruebas = [
  ["sgsst_quien_soy", {}],
  ["sgsst_buscar_trabajador", { limite: 3 }],
  ["sgsst_listar_accidentes", { limite: 3 }],
  ["sgsst_inventario_epp", { soloBajoMinimo: true, limite: 3 }],
  ["sgsst_listar_inspecciones", { tipo: "areas", limite: 3 }],
  ["sgsst_estado_inducciones", { limite: 3 }],
];

let fallas = 0;
for (const [nombre, args] of pruebas) {
  const inicio = Date.now();
  const resultado = await cliente.callTool({ name: nombre, arguments: args });
  const texto = resultado.content?.[0]?.text ?? "";
  const ms = Date.now() - inicio;
  if (resultado.isError) fallas += 1;
  console.log(`${resultado.isError ? "FALLA" : "PASA "}  ${nombre} (${ms} ms)  ${texto.slice(0, 140).replace(/\s+/g, " ")}`);
}

await cliente.close();
process.exit(fallas > 0 ? 1 : 0);
