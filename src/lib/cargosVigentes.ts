import {
  airtableConfig,
  getAirtableUrl,
  getAirtableHeaders,
} from "@/infrastructure/config/airtable";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

/**
 * Resuelve el cargo vigente de cada cédula contra la base Personal (Nómina Core).
 *
 * Los registros de asistencia guardan el cargo en su campo LABOR como una foto
 * tomada al momento de crear el registro. Si después se corrige el rol en Nómina
 * Core, esa foto queda desactualizada y el acta sigue mostrando el cargo viejo.
 * Esta función consulta el cargo actual para poder preferirlo sobre el guardado.
 *
 * Devuelve un mapa `numeroDocumento -> cargo`. Las cédulas sin coincidencia
 * simplemente no aparecen, de modo que quien las use debe caer al valor guardado.
 */
export async function resolverCargosVigentes(
  cedulas: string[]
): Promise<Record<string, string>> {
  const cargos: Record<string, string> = {};
  const unicas = [...new Set(cedulas.filter(Boolean))];
  if (unicas.length === 0) return cargos;

  const { personalTableId, personalFields: pf } = airtableConfig;

  for (let i = 0; i < unicas.length; i += 50) {
    const lote = unicas.slice(i, i + 50);
    const formula = `OR(${lote
      .map((c) => `{${pf.NUMERO_DOCUMENTO}}='${c.replace(/'/g, "\\'")}'`)
      .join(",")})`;
    const params = new URLSearchParams({
      filterByFormula: formula,
      pageSize: "100",
      returnFieldsByFieldId: "true",
    });
    params.append("fields[]", pf.NUMERO_DOCUMENTO);
    params.append("fields[]", pf.ROL_LOOKUP);

    try {
      const res = await fetch(`${getAirtableUrl(personalTableId)}?${params.toString()}`, {
        headers: getAirtableHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        console.error(
          "[cargosVigentes] Error consultando Personal:",
          res.status,
          await res.text()
        );
        continue;
      }
      const data: { records: AirtableRecord[] } = await res.json();
      for (const r of data.records) {
        const doc = (r.fields[pf.NUMERO_DOCUMENTO] as string) || "";
        // "Rol (from Rol)" es un lookup: llega como arreglo, se toma el primero
        const raw = r.fields[pf.ROL_LOOKUP];
        const cargo = (Array.isArray(raw) ? raw[0] : raw) as string;
        if (doc && cargo) cargos[doc] = cargo;
      }
    } catch (e) {
      console.error("[cargosVigentes] Error consultando Personal:", e);
    }
  }

  return cargos;
}
