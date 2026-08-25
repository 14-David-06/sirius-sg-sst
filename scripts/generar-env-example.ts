/**
 * Genera .env.example a partir de .env.local, conservando los comentarios de
 * sección y reemplazando cada valor por un placeholder según su tipo.
 *
 * Nunca copia valores reales: los secretos (tokens, claves AWS, JWT) quedan
 * como marcadores, y los IDs de Airtable como `tbl…` / `fld…`.
 *
 * Uso:
 *   npm run gen:env-example
 */
import fs from "fs";
import path from "path";

const ORIGEN = path.join(process.cwd(), ".env.local");
const DESTINO = path.join(process.cwd(), ".env.example");

/** Devuelve el placeholder que corresponde al nombre de la variable. */
function placeholderPara(clave: string, valorOriginal: string): string {
  // IDs de Airtable: se reconocen por el prefijo del valor real.
  if (valorOriginal.startsWith("tbl")) return "tblXXXXXXXXXXXXXX";
  if (valorOriginal.startsWith("fld")) return "fldXXXXXXXXXXXXXX";
  if (valorOriginal.startsWith("app")) return "appXXXXXXXXXXXXXX";
  if (valorOriginal.startsWith("viw")) return "viwXXXXXXXXXXXXXX";

  // Secretos, por nombre de variable.
  const c = clave.toUpperCase();
  if (c.includes("TOKEN")) return "tu_token_aqui";
  if (c.includes("SECRET")) return "tu_secreto_aqui";
  if (c.includes("KEY")) return "tu_clave_aqui";
  if (c.includes("PASSWORD")) return "tu_password_aqui";
  if (c.includes("EMAIL")) return "correo@ejemplo.com";
  if (c.includes("BUCKET")) return "nombre-del-bucket";
  if (c.includes("REGION")) return "us-east-1";
  if (c.includes("URL")) return "https://ejemplo.com";

  return "";
}

function main() {
  if (!fs.existsSync(ORIGEN)) {
    console.error("No se encontró .env.local en la raíz del proyecto.");
    process.exit(1);
  }

  const lineas = fs.readFileSync(ORIGEN, "utf-8").split(/\r?\n/);
  const salida: string[] = [
    "# ══════════════════════════════════════════════════════════",
    "# Sirius SG-SST — Plantilla de variables de entorno",
    "#",
    "# Generado por: npm run gen:env-example",
    "# No edites este archivo a mano: se regenera desde .env.local.",
    "#",
    "# Copia este archivo a .env.local y reemplaza los placeholders con los",
    "# valores reales. Verifica con: npm run check:env",
    "# ══════════════════════════════════════════════════════════",
    "",
  ];

  let variables = 0;
  const vistas = new Set<string>();

  for (const linea of lineas) {
    const limpia = linea.trim();

    // Conservar comentarios de sección y líneas en blanco tal cual.
    if (limpia === "" || limpia.startsWith("#")) {
      salida.push(linea);
      continue;
    }

    const separador = limpia.indexOf("=");
    if (separador === -1) {
      salida.push(linea);
      continue;
    }

    const clave = limpia.slice(0, separador).trim();
    const valor = limpia.slice(separador + 1).trim().replace(/^["']|["']$/g, "");

    // Una variable repetida en .env.local sería un error de configuración;
    // en la plantilla se deja una sola vez.
    if (vistas.has(clave)) continue;
    vistas.add(clave);

    salida.push(`${clave}=${placeholderPara(clave, valor)}`);
    variables++;
  }

  // Colapsar cadenas de más de dos líneas en blanco seguidas.
  const compacta: string[] = [];
  let blancosSeguidos = 0;
  for (const l of salida) {
    if (l.trim() === "") {
      blancosSeguidos++;
      if (blancosSeguidos > 2) continue;
    } else {
      blancosSeguidos = 0;
    }
    compacta.push(l);
  }

  fs.writeFileSync(DESTINO, compacta.join("\n"), "utf-8");

  console.log(`.env.example generado con ${variables} variables.`);
  console.log(`Ruta: ${DESTINO}`);
}

main();
