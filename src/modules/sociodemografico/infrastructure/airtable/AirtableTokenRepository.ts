import Airtable from "airtable";
import { v4 as uuidv4 } from "uuid";
import type { Token, TokenGenerado, TokenConPersonal } from "../../domain/entities";
import type { ITokenRepository } from "../../domain/repositories";
import { SOCIO_CONFIG } from "./config";

export class AirtableTokenRepository implements ITokenRepository {
  private base: Airtable.Base;
  private table: Airtable.Table<any>;

  constructor() {
    const airtable = new Airtable({ apiKey: SOCIO_CONFIG.apiToken });
    this.base = airtable.base(SOCIO_CONFIG.baseId);
    this.table = this.base(SOCIO_CONFIG.tokens.tableId);
  }

  async generar(campanaId: string, personalIds: string[]): Promise<TokenGenerado[]> {
    const F = SOCIO_CONFIG.tokens.fields;
    const resultados: TokenGenerado[] = [];

    for (const personalId of personalIds) {
      // Verificar si ya existe token
      const existe = await this.existeTokenParaColaborador(campanaId, personalId);
      if (existe) {
        // Obtener token existente
        const records = await this.table
          .select({
            filterByFormula: `AND(FIND("${campanaId}", {${F.CAMPANA}}), FIND("${personalId}", {${F.PERSONAL}}))`,
            maxRecords: 1,
          })
          .firstPage();

        if (records.length > 0) {
          const token = records[0].get(F.TOKEN) as string;
          resultados.push({
            personalId,
            token,
            link: `/encuesta/socio/${token}`,
          });
        }
        continue;
      }

      // Crear nuevo token
      const token = uuidv4();

      await this.table.create({
        [F.TOKEN]: token,
        [F.CAMPANA]: [campanaId],
        [F.PERSONAL]: [personalId],
        [F.USADO]: false,
      });

      resultados.push({
        personalId,
        token,
        link: `/encuesta/socio/${token}`,
      });
    }

    return resultados;
  }

  async obtenerPorToken(token: string): Promise<Token | null> {
    const F = SOCIO_CONFIG.tokens.fields;

    const records = await this.table
      .select({
        filterByFormula: `{${F.TOKEN}} = '${token}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) return null;

    return this.mapToDomain(records[0]);
  }

  async obtenerConPersonal(token: string): Promise<TokenConPersonal | null> {
    const tokenData = await this.obtenerPorToken(token);
    if (!tokenData) return null;

    // Obtener datos del colaborador de la tabla Personal
    const personalTable = this.base(process.env.AIRTABLE_PERSONAL_TABLE_ID!);
    const PF = {
      NOMBRE_COMPLETO: process.env.AIRTABLE_PF_NOMBRE_COMPLETO!,
      CORREO: process.env.AIRTABLE_PF_CORREO!,
      NUMERO_DOCUMENTO: process.env.AIRTABLE_PF_NUMERO_DOCUMENTO!,
    };

    try {
      const personalRecord = await personalTable.find(tokenData.personalId);

      return {
        ...tokenData,
        nombreCompleto: personalRecord.get(PF.NOMBRE_COMPLETO) as string,
        correo: personalRecord.get(PF.CORREO) as string,
        numeroDocumento: personalRecord.get(PF.NUMERO_DOCUMENTO) as string,
      };
    } catch {
      return null;
    }
  }

  async listarPorCampana(campanaId: string): Promise<Token[]> {
    const F = SOCIO_CONFIG.tokens.fields;

    const records = await this.table
      .select({
        filterByFormula: `FIND("${campanaId}", {${F.CAMPANA}})`,
      })
      .all();

    return records.map((r) => this.mapToDomain(r));
  }

  async marcarUsado(tokenId: string): Promise<void> {
    const F = SOCIO_CONFIG.tokens.fields;

    await this.table.update(tokenId, {
      [F.USADO]: true,
      [F.FECHA_USO]: new Date().toISOString(),
    });
  }

  async existeTokenParaColaborador(campanaId: string, personalId: string): Promise<boolean> {
    const F = SOCIO_CONFIG.tokens.fields;

    const records = await this.table
      .select({
        filterByFormula: `AND(FIND("${campanaId}", {${F.CAMPANA}}), FIND("${personalId}", {${F.PERSONAL}}))`,
        maxRecords: 1,
      })
      .firstPage();

    return records.length > 0;
  }

  private mapToDomain(record: Airtable.Record<any>): Token {
    const F = SOCIO_CONFIG.tokens.fields;

    return {
      id: record.id,
      token: record.get(F.TOKEN) as string,
      campanaId: (record.get(F.CAMPANA) as string[])?.[0] || "",
      personalId: (record.get(F.PERSONAL) as string[])?.[0] || "",
      usado: record.get(F.USADO) === true,
      fechaUso: record.get(F.FECHA_USO) ? new Date(record.get(F.FECHA_USO) as string) : undefined,
      createdTime: new Date(record.get("Created") as string),
    };
  }
}
