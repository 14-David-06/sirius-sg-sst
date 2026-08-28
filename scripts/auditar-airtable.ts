/**
 * Audita la base SG-SST contra lo que el código espera.
 *
 * Consulta el esquema real vía la Metadata API y verifica, para cada tabla y
 * cada field ID declarado en `airtableSGSST.ts`, que exista de verdad.
 *
 * Reporta cuatro categorías:
 *   - Variable de entorno ausente (el código no tiene el ID)
 *   - Tabla declarada que no existe en la base
 *   - Field ID declarado que no existe en su tabla
 *   - Tablas de la base que el código no referencia
 *
 * Uso:
 *   npx tsx scripts/auditar-airtable.ts
 */
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

const API_TOKEN = process.env.AIRTABLE_SGSST_API_TOKEN;
const BASE_ID = process.env.AIRTABLE_SGSST_BASE_ID;

interface CampoAirtable {
  id: string;
  name: string;
  type: string;
  options?: Record<string, unknown>;
}

interface TablaAirtable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: CampoAirtable[];
}

interface Hallazgo {
  grupo: string;
  clave: string;
  detalle: string;
}

async function obtenerEsquema(): Promise<TablaAirtable[]> {
  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
    { headers: { Authorization: `Bearer ${API_TOKEN}` } }
  );
  if (!res.ok) {
    throw new Error(`Metadata API ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { tables: TablaAirtable[] };
  return data.tables;
}

async function main() {
  if (!API_TOKEN || !BASE_ID) {
    console.error("Faltan AIRTABLE_SGSST_API_TOKEN o AIRTABLE_SGSST_BASE_ID.");
    process.exit(1);
  }

  const tablas = await obtenerEsquema();
  const porId = new Map(tablas.map((t) => [t.id, t]));

  // Imports dinámicos: las configs leen process.env al evaluarse.
  const { airtableSGSSTConfig } = await import(
    "../src/infrastructure/config/airtableSGSST"
  );
  const { airtableInduccionesConfig } = await import(
    "../src/infrastructure/config/airtableInducciones"
  );
  const socioModulo = await import(
    "../src/modules/sociodemografico/infrastructure/airtable/config"
  );

  /**
   * Aplana las configuraciones a pares `{grupo, tableId, campos}`.
   *
   * Hay dos formas en el proyecto:
   *  - plana:    `xxxTableId` + `xxxFields` como claves hermanas
   *  - anidada:  `xxx: { tableId, fields }`
   */
  interface Entrada {
    grupo: string;
    claveTabla: string;
    claveFields: string;
    tableId: unknown;
    campos?: Record<string, string>;
  }

  function aplanar(cfg: Record<string, unknown>, origen: string): Entrada[] {
    const entradas: Entrada[] = [];

    for (const [clave, valor] of Object.entries(cfg)) {
      // Forma plana
      if (clave.endsWith("TableId")) {
        const grupo = clave.replace(/TableId$/, "");
        entradas.push({
          grupo: `${origen}:${grupo}`,
          claveTabla: clave,
          claveFields: `${grupo}Fields`,
          tableId: valor,
          campos: cfg[`${grupo}Fields`] as Record<string, string> | undefined,
        });
        continue;
      }

      // Forma anidada
      if (
        valor &&
        typeof valor === "object" &&
        !Array.isArray(valor) &&
        "tableId" in (valor as Record<string, unknown>)
      ) {
        const v = valor as { tableId: unknown; fields?: Record<string, string> };
        entradas.push({
          grupo: `${origen}:${clave}`,
          claveTabla: `${clave}.tableId`,
          claveFields: `${clave}.fields`,
          tableId: v.tableId,
          campos: v.fields,
        });
      }
    }

    return entradas;
  }

  const entradas: Entrada[] = [
    ...aplanar(
      airtableSGSSTConfig as unknown as Record<string, unknown>,
      "sgsst"
    ),
    ...aplanar(
      airtableInduccionesConfig as unknown as Record<string, unknown>,
      "inducciones"
    ),
    // El módulo sociodemográfico exporta su config como objeto anidado; se
    // recorren todos sus exports por si hay más de uno.
    ...Object.values(socioModulo as Record<string, unknown>)
      .filter((v) => typeof v === "object" && v !== null)
      .flatMap((v) => aplanar(v as Record<string, unknown>, "socio")),
  ];

  const envAusentes: Hallazgo[] = [];
  const tablasInexistentes: Hallazgo[] = [];
  const camposInexistentes: Hallazgo[] = [];
  const tablasReferenciadas = new Set<string>();

  for (const entrada of entradas) {
    const { grupo, claveTabla, claveFields, tableId, campos } = entrada;

    if (typeof tableId !== "string" || !tableId || tableId === "undefined") {
      envAusentes.push({
        grupo,
        clave: claveTabla,
        detalle: "variable de entorno del Table ID ausente",
      });
      // Sin table ID no se pueden verificar sus campos contra la base.
      if (campos) {
        for (const [nombre, fieldId] of Object.entries(campos)) {
          if (!fieldId || fieldId === "undefined") {
            envAusentes.push({
              grupo,
              clave: `${claveFields}.${nombre}`,
              detalle: "variable de entorno ausente",
            });
          }
        }
      }
      continue;
    }

    const tabla = porId.get(tableId);
    if (!tabla) {
      tablasInexistentes.push({
        grupo,
        clave: claveTabla,
        detalle: `${tableId} no existe en la base`,
      });
      continue;
    }

    tablasReferenciadas.add(tabla.id);
    if (!campos) continue;

    const fieldsPorId = new Set(tabla.fields.map((f) => f.id));

    for (const [nombre, fieldId] of Object.entries(campos)) {
      // Cadena vacía = campo declarado como `process.env.X || ""`, es decir
      // opcional a propósito. No es un problema.
      if (fieldId === "") continue;

      if (!fieldId || fieldId === "undefined") {
        envAusentes.push({
          grupo,
          clave: `${claveFields}.${nombre}`,
          detalle: `variable ausente — tabla "${tabla.name}"`,
        });
        continue;
      }
      if (/^(fld|tbl)?(PENDIENTE|_pending)/.test(fieldId)) {
        envAusentes.push({
          grupo,
          clave: `${claveFields}.${nombre}`,
          detalle: `placeholder sin reemplazar — tabla "${tabla.name}"`,
        });
        continue;
      }
      if (!fieldsPorId.has(fieldId)) {
        camposInexistentes.push({
          grupo,
          clave: `${claveFields}.${nombre}`,
          detalle: `${fieldId} no existe en la tabla "${tabla.name}"`,
        });
      }
    }
  }

  const huerfanas = tablas.filter((t) => !tablasReferenciadas.has(t.id));

  // ── Reporte ─────────────────────────────────────────────
  const linea = "─".repeat(70);

  console.log(linea);
  console.log(`AUDITORÍA BASE SG-SST (${BASE_ID})`);
  console.log(`${tablas.length} tablas en la base · ${tablasReferenciadas.size} referenciadas por el código`);
  console.log(linea);

  function imprimir(titulo: string, items: Hallazgo[]) {
    console.log(`\n${titulo}: ${items.length}`);
    if (items.length === 0) return;
    const porGrupo = new Map<string, Hallazgo[]>();
    for (const h of items) {
      if (!porGrupo.has(h.grupo)) porGrupo.set(h.grupo, []);
      porGrupo.get(h.grupo)!.push(h);
    }
    for (const [grupo, hs] of porGrupo) {
      console.log(`  ${grupo}`);
      for (const h of hs) console.log(`    - ${h.clave}: ${h.detalle}`);
    }
  }

  imprimir("TABLAS DECLARADAS QUE NO EXISTEN", tablasInexistentes);
  imprimir("FIELD IDs QUE NO EXISTEN EN SU TABLA", camposInexistentes);
  imprimir("VARIABLES DE ENTORNO AUSENTES", envAusentes);

  console.log(`\nTABLAS EN LA BASE SIN REFERENCIA EN EL CÓDIGO: ${huerfanas.length}`);
  for (const t of huerfanas) {
    console.log(`  - ${t.name} (${t.id}, ${t.fields.length} campos)`);
  }

  // Volcado del esquema para inspección posterior sin volver a llamar la API.
  const destino = path.join(process.cwd(), "scripts", "esquema-sgsst.json");
  fs.writeFileSync(
    destino,
    JSON.stringify(
      tablas.map((t) => ({
        id: t.id,
        name: t.name,
        fields: t.fields.map((f) => ({ id: f.id, name: f.name, type: f.type })),
      })),
      null,
      2
    ),
    "utf-8"
  );
  console.log(`\nEsquema volcado en: ${destino}`);

  const total =
    tablasInexistentes.length + camposInexistentes.length + envAusentes.length;
  console.log(`\nTotal de problemas: ${total}`);
}

main().catch((e) => {
  console.error("Error en la auditoría:", e);
  process.exit(1);
});
