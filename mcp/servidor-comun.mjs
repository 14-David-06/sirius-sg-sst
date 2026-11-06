/**
 * El servidor MCP de SG-SST, sin transporte.
 *
 * Aquí vive lo que comparten las dos formas de conectarse —el proceso stdio
 * local (`mcp/servidor.mjs`) y el endpoint remoto (`/api/mcp`)—: las mismas
 * herramientas y las mismas instrucciones. Cambiar de transporte no cambia lo
 * que Claude puede hacer.
 *
 * `api` es el cliente de SG-SST ya autenticado; de dónde salió su sesión es
 * asunto de quien llama.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import * as accidentes from "./modulos/accidentes.mjs";
import * as capacitaciones from "./modulos/capacitaciones.mjs";
import * as epp from "./modulos/epp.mjs";
import * as general from "./modulos/general.mjs";
import * as inspecciones from "./modulos/inspecciones.mjs";
import * as medicina from "./modulos/medicina.mjs";
import * as organizacion from "./modulos/organizacion.mjs";

const MODULOS = [general, accidentes, medicina, inspecciones, epp, capacitaciones, organizacion];

const INSTRUCCIONES =
  "Este servidor da acceso a Sirius SG-SST, el sistema de gestión de seguridad y salud en el " +
  "trabajo de Sirius Regenerative: accidentes e incidentes, reportes de actos y condiciones " +
  "inseguras, acciones correctivas, medicina laboral, inspecciones, inventario y entregas de " +
  "EPP, capacitaciones, comités (COPASST y COCOLAB), políticas, inducciones y el informe " +
  "mensual de gestión.\n\n" +
  "Cómo usarlo bien:\n" +
  "- `sgsst_informe_mensual` responde de una sola vez casi todo lo que suena a «cómo vamos este " +
  "mes»: los 18 indicadores legales, inspecciones y actividades de promoción y prevención.\n" +
  "- A los trabajadores se les puede nombrar por nombre, documento o ID de empleado; las " +
  "herramientas los resuelven contra Personal y avisan cuando hay ambigüedad en vez de adivinar.\n" +
  "- Los registros se pueden nombrar por su consecutivo (AT-2026-001, ACC-2026-004, REP-2026-010).\n" +
  "- Las fechas son `YYYY-MM-DD` y la zona de referencia es Bogotá.\n" +
  "- Medicina laboral trae datos de salud: responde solo lo que se pregunta.\n" +
  "- Antes de registrar algo, confirma con la persona el trabajador, la fecha y los datos: lo " +
  "registrado es soporte legal del SG-SST y lo ve el resto del equipo.";

export const VERSION = "1.0.0";

export function construirServidor({ api, soloLectura = false }) {
  const servidor = new McpServer(
    { name: "sirius-sgsst", version: VERSION },
    { instructions: INSTRUCCIONES },
  );

  for (const modulo of MODULOS) {
    modulo.lectura(servidor, api);
    if (!soloLectura) modulo.escritura?.(servidor, api);
  }

  return servidor;
}
