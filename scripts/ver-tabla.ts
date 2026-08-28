/**
 * Muestra los campos de una o más tablas del esquema volcado por
 * `auditar-airtable.ts`. Busca por coincidencia parcial de nombre o por ID.
 *
 * Uso:
 *   npx tsx scripts/ver-tabla.ts extintor camilla
 *   npx tsx scripts/ver-tabla.ts tbloviwmQItAhj3dv
 */
import fs from "fs";
import path from "path";

const ESQUEMA = path.join(process.cwd(), "scripts", "esquema-sgsst.json");

interface Campo {
  id: string;
  name: string;
  type: string;
}
interface Tabla {
  id: string;
  name: string;
  fields: Campo[];
}

function main() {
  if (!fs.existsSync(ESQUEMA)) {
    console.error("Falta el esquema. Corre primero: npx tsx scripts/auditar-airtable.ts");
    process.exit(1);
  }

  const tablas: Tabla[] = JSON.parse(fs.readFileSync(ESQUEMA, "utf-8"));
  const consultas = process.argv.slice(2).map((a) => a.toLowerCase());

  if (consultas.length === 0) {
    console.log(`${tablas.length} tablas:\n`);
    for (const t of tablas) {
      console.log(`  ${t.id}  ${t.name}  [${t.fields.length}]`);
    }
    return;
  }

  for (const q of consultas) {
    const encontradas = tablas.filter(
      (t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase() === q
    );

    if (encontradas.length === 0) {
      console.log(`\nSin coincidencias para "${q}"`);
      continue;
    }

    for (const t of encontradas) {
      console.log(`\n${"═".repeat(64)}`);
      console.log(`${t.name}  (${t.id})`);
      console.log("═".repeat(64));
      for (const f of t.fields) {
        console.log(`  ${f.id}  ${f.name.padEnd(32)} ${f.type}`);
      }
    }
  }
}

main();
