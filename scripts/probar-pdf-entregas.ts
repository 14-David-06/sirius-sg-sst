/**
 * Genera el PDF de entregas contra Airtable real y lo guarda en disco.
 *
 *   npx tsx scripts/probar-pdf-entregas.ts [dotacion|epp] [YYYY-MM]
 *
 * Mintea un JWT de prueba para pasar `requireAuth` sin levantar el servidor.
 */
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { NextRequest } from "next/server";

config({ path: ".env.local" });

async function main() {
  const { generateJWT } = await import("../src/lib/jwt");
  const { GET } = await import("../src/app/api/entregas-epp/exportar-pdf/route");

  const tipo = process.argv[2] || "dotacion";
  const mes = process.argv[3] || new Date().toISOString().slice(0, 7);

  const token = generateJWT({
    idEmpleado: "SCRIPT",
    nombreCompleto: "Script de prueba",
    correoElectronico: "script@sirius.local",
    numeroDocumento: "0",
    tipoPersonal: "Interno",
    ordenNivel: 1,
  });

  const url = `http://localhost:3000/api/entregas-epp/exportar-pdf?tipo=${tipo}&mes=${mes}`;
  const req = new NextRequest(url, { headers: { Cookie: `auth_token=${token}` } });

  console.log(`▶ Generando PDF de ${tipo} para ${mes}...`);
  const inicio = Date.now();
  const res = await GET(req);
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

  if (!res) {
    console.error("✖ El endpoint no devolvió respuesta (¿autenticación?)");
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`✖ ${res.status}`, await res.json().catch(() => ""));
    process.exit(1);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const salida = path.join(process.cwd(), `entregas-${tipo}-${mes}.pdf`);
  fs.writeFileSync(salida, buffer);

  console.log(`✔ ${salida}`);
  console.log(`  ${(buffer.length / 1024).toFixed(0)} KB en ${segundos} s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
