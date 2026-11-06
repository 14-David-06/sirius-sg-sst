/**
 * Compara los catálogos que el conector MCP copia en `mcp/catalogos.mjs` con
 * los originales de la app. Si alguien agrega un mecanismo de accidente o un
 * tipo de examen y no actualiza la copia, Claude dejaría de ofrecerlo.
 *
 *   npm run check:mcp
 */
import * as accidentes from "../src/lib/accidentes/types";
import * as medicina from "../src/lib/medicina-laboral/types";
import * as copia from "../mcp/catalogos.mjs";

const PARES: [string, readonly string[]][] = [
  ["TIPOS_EVENTO", accidentes.TIPOS_EVENTO],
  ["MECANISMOS", accidentes.MECANISMOS],
  ["TIPOS_LESION", accidentes.TIPOS_LESION],
  ["PARTES_CUERPO", accidentes.PARTES_CUERPO],
  ["ESTADOS_ARL", accidentes.ESTADOS_ARL],
  ["ESTADOS_EVENTO", accidentes.ESTADOS_EVENTO],
  ["TIPOS_ACCION", accidentes.TIPOS_ACCION],
  ["JERARQUIAS_CONTROL", accidentes.JERARQUIAS_CONTROL],
  ["TIPOS_RESPONSABLE", accidentes.TIPOS_RESPONSABLE],
  ["ESTADOS_ACCION", accidentes.ESTADOS_ACCION],
  ["TIPOS_REPORTE", accidentes.TIPOS_REPORTE],
  ["NIVELES_RIESGO", accidentes.NIVELES_RIESGO],
  ["ESTADOS_REPORTE", accidentes.ESTADOS_REPORTE],
  ["TIPOS_EXAMEN", medicina.TIPOS_EXAMEN],
  ["ESTADOS_EXAMEN", medicina.ESTADOS_EXAMEN],
  ["TIPOS_SEGUIMIENTO", medicina.TIPOS_SEGUIMIENTO],
  ["TIPOS_INCAPACIDAD", medicina.TIPOS_INCAPACIDAD],
  ["TIPOS_REUBICACION", medicina.TIPOS_REUBICACION],
  ["ESTADOS_REUBICACION", medicina.ESTADOS_REUBICACION],
  ["ESTADOS_ENFERMEDAD_LABORAL", medicina.ESTADOS_ENFERMEDAD_LABORAL],
];

let fallas = 0;
for (const [nombre, original] of PARES) {
  const copiado = (copia as Record<string, readonly string[]>)[nombre];
  const igual =
    Array.isArray(copiado) &&
    copiado.length === original.length &&
    copiado.every((valor, i) => valor === original[i]);

  if (!igual) {
    fallas += 1;
    console.error(`✗ ${nombre} no coincide.\n  app: ${JSON.stringify(original)}\n  mcp: ${JSON.stringify(copiado)}`);
  }
}

if (fallas > 0) {
  console.error(`\n${fallas} catálogo(s) desalineados: actualiza mcp/catalogos.mjs.`);
  process.exit(1);
}
console.log(`✓ ${PARES.length} catálogos del conector MCP alineados con la app.`);
