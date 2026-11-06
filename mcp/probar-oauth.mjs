#!/usr/bin/env node
/**
 * Prueba de punta a punta del flujo OAuth del conector remoto.
 *
 * Recorre lo que hace claude.ai al agregar el conector —descubrimiento,
 * registro dinámico, autorización, canje del código con PKCE, renovación,
 * llamada a /api/mcp— y los caminos que tienen que fallar: un redirect_uri que
 * no se registró, PKCE ausente o equivocado, un token de otro recurso, un token
 * firmado con otra clave. También comprueba que /api ya no responde sin sesión.
 *
 * El único paso que no cubre es la contraseña: el código de autorización se
 * firma aquí con la misma clave derivada que usa la pantalla, así que todo lo
 * que viene después del login sí queda probado. Por eso necesita `JWT_SECRET`
 * en el `.env.local`, igual al del servidor que se prueba.
 *
 *   npm run dev                         (en otra terminal)
 *   npm run mcp:probar-oauth            (contra http://localhost:3000)
 *   node mcp/probar-oauth.mjs https://sirius-sg-sst.vercel.app
 *
 * Con `SGSST_MCP_DOCUMENTO` en el `.env.local`, el paso 8 entra con ese
 * documento y lista las herramientas; sin él usa un documento inexistente y
 * espera el rechazo de identidad.
 */

import { createHash, hkdfSync, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

import { leer } from "./entorno.mjs";

const B = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const SECRETO = leer("JWT_SECRET");
const DOCUMENTO = leer("SGSST_MCP_DOCUMENTO");
const INEXISTENTE = "10000000001";

if (!SECRETO) {
  console.error("Falta JWT_SECRET en .env.local: sin él no se puede firmar el código de prueba.");
  process.exit(1);
}

const clave = (uso) => Buffer.from(hkdfSync("sha256", SECRETO, "sirius-sgsst-mcp-oauth", uso, 32));
const firmar = (uso, datos, segundos = 60, llave = clave(uso)) =>
  jwt.sign({ ...datos, uso }, llave, { algorithm: "HS256", expiresIn: segundos });

function ok(etiqueta, condicion, extra = "") {
  console.log(`${condicion ? "PASA " : "FALLA"}  ${etiqueta}${extra ? " — " + extra : ""}`);
  if (!condicion) process.exitCode = 1;
}

const formulario = (datos) => ({
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(datos),
});

console.log(`\nFlujo OAuth contra ${B}\n`);

/* 0. La API ya no responde sin sesión, y las rutas públicas siguen abiertas */
const cerrada = await fetch(`${B}/api/capacitaciones`);
ok("/api/capacitaciones sin sesión → 401", cerrada.status === 401, `HTTP ${cerrada.status}`);
const publica = await fetch(`${B}/api/entregas-epp/token/validar?t=no-existe`);
ok("ruta pública de firma sigue abierta", publica.status !== 401, `HTTP ${publica.status}`);

/* 1. Descubrimiento: 401 con WWW-Authenticate y metadatos */
const sinToken = await fetch(`${B}/api/mcp`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
});
const cabecera = sinToken.headers.get("www-authenticate") ?? "";
ok("/api/mcp sin token → 401 con resource_metadata", sinToken.status === 401 && cabecera.includes("resource_metadata"));

const recurso = await (await fetch(`${B}/.well-known/oauth-protected-resource/api/mcp`)).json().catch(() => ({}));
ok("metadatos del recurso", recurso.resource === `${B}/api/mcp`, recurso.resource);

const autorizacion = await (await fetch(`${B}/.well-known/oauth-authorization-server`)).json().catch(() => ({}));
ok("metadatos del servidor de autorización", autorizacion.issuer === B && Boolean(autorizacion.registration_endpoint));

/* 2. Registro dinámico */
const redirectUri = "https://claude.ai/api/mcp/auth_callback";
const reg = await fetch(`${B}/api/oauth/register`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ client_name: "Claude", redirect_uris: [redirectUri] }),
});
const cliente = await reg.json();
ok("register devuelve client_id", reg.status === 201 && Boolean(cliente.client_id));
const cid = encodeURIComponent(cliente.client_id);

/* 3. redirect_uri no registrado → error en pantalla, sin redirigir */
const malo = await fetch(
  `${B}/api/oauth/authorize?response_type=code&client_id=${cid}&redirect_uri=https://evil.example/cb&code_challenge=x&code_challenge_method=S256`,
  { redirect: "manual" },
);
ok("redirect_uri ajeno se rechaza en pantalla", malo.status === 400, `HTTP ${malo.status}`);

/* 4. Solicitud válida → 302 a /autorizar */
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const bueno = await fetch(
  `${B}/api/oauth/authorize?response_type=code&client_id=${cid}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${challenge}&code_challenge_method=S256&state=abc123`,
  { redirect: "manual" },
);
const destino = bueno.headers.get("location") ?? "";
ok("solicitud válida va a /autorizar", bueno.status === 302 && destino.includes("/autorizar"));

const pantalla = await fetch(destino.startsWith("http") ? destino : `${B}${destino}`);
ok("la pantalla /autorizar carga", pantalla.status === 200, `HTTP ${pantalla.status}`);

/* 5. Sin PKCE → error al redirect_uri del cliente */
const sinPkce = await fetch(
  `${B}/api/oauth/authorize?response_type=code&client_id=${cid}&redirect_uri=${encodeURIComponent(redirectUri)}`,
  { redirect: "manual" },
);
ok("sin code_challenge se reporta al cliente", (sinPkce.headers.get("location") ?? "").includes("error=invalid_request"));

/* 6. Credenciales equivocadas → mensaje único (contraseña aleatoria) */
const credencialesMalas = await fetch(`${B}/api/oauth/authorize`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    client_id: cliente.client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    numeroDocumento: INEXISTENTE,
    password: randomBytes(12).toString("hex"),
  }),
});
const credencialesJson = await credencialesMalas.json().catch(() => ({}));
ok("credenciales malas → 401 con mensaje único", credencialesMalas.status === 401, credencialesJson.error);

/* 7. Canje de código */
const doc = DOCUMENTO ?? INEXISTENTE;
const codigo = firmar("codigo", {
  doc,
  cid: cliente.client_id,
  ru: redirectUri,
  ch: challenge,
  sc: ["sgsst.leer"],
  res: `${B}/api/mcp`,
});

const pkceMal = await fetch(`${B}/api/oauth/token`, formulario({
  grant_type: "authorization_code",
  code: codigo,
  code_verifier: randomBytes(32).toString("base64url"),
  client_id: cliente.client_id,
}));
ok("verifier equivocado se rechaza", (await pkceMal.json()).error === "invalid_grant");

const canje = await fetch(`${B}/api/oauth/token`, formulario({
  grant_type: "authorization_code",
  code: codigo,
  code_verifier: verifier,
  client_id: cliente.client_id,
  redirect_uri: redirectUri,
}));
const tokens = await canje.json();
ok("canje devuelve access_token y refresh_token", canje.status === 200 && Boolean(tokens.access_token && tokens.refresh_token), `scope=${tokens.scope}`);

const renov = await fetch(`${B}/api/oauth/token`, formulario({
  grant_type: "refresh_token",
  refresh_token: tokens.refresh_token,
  client_id: cliente.client_id,
}));
ok("refresh_token renueva", renov.status === 200 && Boolean((await renov.json()).access_token));

const amplia = await fetch(`${B}/api/oauth/token`, formulario({
  grant_type: "refresh_token",
  refresh_token: tokens.refresh_token,
  client_id: cliente.client_id,
  scope: "sgsst.leer sgsst.escribir",
}));
ok("no se puede ampliar el scope al renovar", (await amplia.json()).error === "invalid_scope");

/* 8. /api/mcp con el token */
const llamar = (token, metodo, params = {}) =>
  fetch(`${B}/api/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: metodo, params }),
  });

if (DOCUMENTO) {
  const lista = await llamar(tokens.access_token, "tools/list");
  const json = await lista.json().catch(() => ({}));
  const nombres = (json.result?.tools ?? []).map((t) => t.name);
  ok(
    "con scope de consulta lista herramientas y no ofrece las que registran",
    lista.status === 200 && nombres.length > 0 && !nombres.some((n) => /registrar|actualizar/.test(n)),
    `${nombres.length} herramientas`,
  );

  const quien = await llamar(tokens.access_token, "tools/call", { name: "sgsst_quien_soy", arguments: {} });
  const quienJson = await quien.json().catch(() => ({}));
  ok(
    "sgsst_quien_soy responde con la sesión",
    quien.status === 200 && !quienJson.result?.isError,
    quienJson.result?.content?.[0]?.text?.replace(/\s+/g, " ").slice(0, 90),
  );
} else {
  const mcp = await llamar(tokens.access_token, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "prueba", version: "1" },
  });
  const mensaje = (await mcp.json().catch(() => ({})))?.error?.message ?? "";
  ok("token válido llega hasta la identidad (documento inexistente → 401)", mcp.status === 401 && /no está activo/.test(mensaje), mensaje);
}

/* 9. Token de otro recurso y token con firma ajena */
const otroRecurso = firmar("acceso", { doc, cid: cliente.client_id, sc: ["sgsst.leer"], res: "https://otro.example/api/mcp" });
ok("token de otro recurso se rechaza", (await llamar(otroRecurso, "initialize")).status === 401);

const falso = firmar("acceso", { doc, cid: "x", sc: [] }, 60, Buffer.alloc(32));
ok("token con firma ajena se rechaza", (await llamar(falso, "initialize")).status === 401);

/* 10. Un JWT de sesión del dashboard no sirve como token del conector */
const sesion = jwt.sign({ numeroDocumento: doc }, SECRETO, {
  issuer: "sirius-sgsst",
  audience: "sirius-sgsst-api",
  expiresIn: 60,
});
ok("JWT de sesión no sirve en /api/mcp", (await llamar(sesion, "initialize")).status === 401);

console.log(process.exitCode ? "\nHay fallas.\n" : "\nTodo pasa.\n");
