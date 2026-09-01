/**
 * Prueba los filtros de exportación de entregas contra Airtable real:
 * acta de un evento puntual y descargas por colaborador.
 *
 *   npx tsx scripts/probar-filtros-entregas.ts
 */
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { NextRequest } from "next/server";

config({ path: ".env.local" });

const BASE = "http://localhost:3000/api/entregas-epp";

async function main() {
  const { generateJWT } = await import("../src/lib/jwt");
  const { GET: getPdf } = await import(
    "../src/app/api/entregas-epp/exportar-pdf/route"
  );
  const { GET: getExcel } = await import(
    "../src/app/api/entregas-epp/exportar/route"
  );

  const token = generateJWT({
    idEmpleado: "SCRIPT",
    nombreCompleto: "Script de prueba",
    correoElectronico: "script@sirius.local",
    numeroDocumento: "0",
    tipoPersonal: "Interno",
    ordenNivel: 1,
  });
  const cookie = { Cookie: `auth_token=${token}` };

  const pedir = async (
    handler: (r: NextRequest) => Promise<Response | undefined>,
    query: string,
    etiqueta: string
  ) => {
    const res = await handler(new NextRequest(`${BASE}${query}`, { headers: cookie }));
    if (!res) {
      console.log(`✖ ${etiqueta}: sin respuesta`);
      return null;
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      console.log(`✖ ${etiqueta}: ${res.status} — ${json.message ?? ""}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const nombre =
      res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] ?? "?";
    console.log(`✔ ${etiqueta}\n    ${nombre} · ${(buffer.length / 1024).toFixed(0)} KB`);
    return { buffer, nombre };
  };

  // Una entrega real para probar el acta por evento
  const { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } = await import(
    "../src/infrastructure/config/airtableSGSST"
  );
  const { entregasTableId, entregasFields } = airtableSGSSTConfig;
  const lista = await fetch(
    `${getSGSSTUrl(entregasTableId)}?pageSize=3&returnFieldsByFieldId=true`,
    { headers: getSGSSTHeaders() }
  ).then((r) => r.json());

  const muestra = lista.records?.[0];
  if (!muestra) {
    console.log("✖ No hay entregas en la base para probar");
    process.exit(1);
  }
  const idEntrega = muestra.fields[entregasFields.ID_ENTREGA] as string;
  const idEmpleado = muestra.fields[entregasFields.ID_EMPLEADO_CORE] as string;
  console.log(`Entrega de muestra: ${idEntrega} (recordId ${muestra.id})`);
  console.log(`Colaborador: ${idEmpleado}\n`);

  // 1. Acta por evento — por recordId y por ID legible
  const acta = await pedir(getPdf, `/exportar-pdf?entrega=${muestra.id}`, "Acta por recordId");
  await pedir(getPdf, `/exportar-pdf?entrega=${idEntrega}`, "Acta por ID de entrega");

  // 2. Todo el histórico de un colaborador
  await pedir(
    getPdf,
    `/exportar-pdf?tipo=dotacion&idEmpleado=${idEmpleado}`,
    "PDF dotación · histórico del colaborador"
  );
  await pedir(
    getPdf,
    `/exportar-pdf?tipo=epp&idEmpleado=${idEmpleado}`,
    "PDF EPP · histórico del colaborador"
  );
  await pedir(
    getExcel,
    `/exportar?tipo=dotacion&idEmpleado=${idEmpleado}`,
    "Excel dotación · histórico del colaborador"
  );

  // 3. Entrega inexistente → 404 con mensaje claro
  await pedir(getPdf, `/exportar-pdf?entrega=recNOEXISTE0000000`, "Entrega inexistente (se espera 404)");

  if (acta) {
    const salida = path.join(process.cwd(), "acta-evento.pdf");
    fs.writeFileSync(salida, acta.buffer);
    console.log(`\nActa guardada en ${salida}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
