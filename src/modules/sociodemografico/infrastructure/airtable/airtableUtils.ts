import Airtable from "airtable";

/**
 * Utilidades de lectura para el módulo Sociodemográfico.
 *
 * Los repositorios referencian campos por field ID (config por variables de
 * entorno), pero airtable.js indexa los campos por NOMBRE salvo que la consulta
 * pida returnFieldsByFieldId. table.find() no acepta esa opción, por eso las
 * lecturas por record ID se hacen vía select() + RECORD_ID().
 */

/** Busca un registro por record ID con los campos indexados por field ID */
export async function encontrarPorId(
  table: Airtable.Table<any>,
  recordId: string
): Promise<Airtable.Record<any> | null> {
  const records = await table
    .select({
      filterByFormula: `RECORD_ID() = '${recordId}'`,
      maxRecords: 1,
      returnFieldsByFieldId: true,
    })
    .firstPage();

  return records[0] ?? null;
}

/** Trae registros por record ID en lotes (la fórmula tiene límite de longitud) */
export async function listarPorIds(
  table: Airtable.Table<any>,
  ids: string[]
): Promise<Airtable.Record<any>[]> {
  const resultados: Airtable.Record<any>[] = [];
  const TAMANO_LOTE = 50;

  for (let i = 0; i < ids.length; i += TAMANO_LOTE) {
    const lote = ids.slice(i, i + TAMANO_LOTE);
    const formula = `OR(${lote.map((id) => `RECORD_ID() = '${id}'`).join(", ")})`;
    const records = await table
      .select({ filterByFormula: formula, returnFieldsByFieldId: true })
      .all();
    resultados.push(...records);
  }

  return resultados;
}
