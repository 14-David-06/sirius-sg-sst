import Airtable from "airtable";
import { v4 as uuidv4 } from "uuid";
import type { Token, TokenGenerado, TokenConPersonal } from "../../domain/entities";
import type { ITokenRepository } from "../../domain/repositories";
import { SOCIO_CONFIG } from "./config";
import { encontrarPorId, listarPorIds } from "./airtableUtils";

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

    // Tokens ya emitidos para esta campaña (se reutilizan si el colaborador ya tiene uno)
    const existentes = await this.listarPorCampana(campanaId);
    const porPersonal = new Map(existentes.map((t) => [t.personalId, t]));

    for (const personalId of personalIds) {
      const existente = porPersonal.get(personalId);
      if (existente) {
        resultados.push({
          personalId,
          token: existente.token,
          link: `/encuesta/socio/${existente.token}`,
        });
        continue;
      }

      // Crear nuevo token
      const token = uuidv4();

      await this.table.create({
        [F.TOKEN]: token,
        [F.CAMPANA]: [campanaId],
        // Personal es un campo de texto (el colaborador vive en otra base, no se puede vincular)
        [F.PERSONAL]: personalId,
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
        returnFieldsByFieldId: true,
      })
      .firstPage();

    if (records.length === 0) return null;

    return this.mapToDomain(records[0]);
  }

  async obtenerConPersonal(token: string): Promise<TokenConPersonal | null> {
    const tokenData = await this.obtenerPorToken(token);
    if (!tokenData) return null;

    // El colaborador vive en la base Personal (distinta a la base SG-SST)
    const personalBase = new Airtable({ apiKey: process.env.AIRTABLE_API_TOKEN! }).base(
      process.env.AIRTABLE_BASE_ID!
    );
    const personalTable = personalBase(process.env.AIRTABLE_PERSONAL_TABLE_ID!);
    const PF = {
      NOMBRE_COMPLETO: process.env.AIRTABLE_PF_NOMBRE_COMPLETO!,
      CORREO: process.env.AIRTABLE_PF_CORREO!,
      NUMERO_DOCUMENTO: process.env.AIRTABLE_PF_NUMERO_DOCUMENTO!,
      CODIGO_EMPLEADO: process.env.AIRTABLE_PF_ID_EMPLEADO!,
      // Opcionales: si no están configurados, simplemente no se prellena
      FECHA_NACIMIENTO: process.env.AIRTABLE_PF_FECHA_NACIMIENTO,
      FECHA_INCORPORACION: process.env.AIRTABLE_PF_FECHA_INCORPORACION,
      AREA_TRABAJO: process.env.AIRTABLE_PF_AREAS, // Nota: es AREAS (plural)
      ROL_LOOKUP: process.env.AIRTABLE_PF_ROL_LOOKUP, // "Rol (from Rol)" - lookup field
    };

    try {
      const personalRecord = await encontrarPorId(personalTable, tokenData.personalId);
      if (!personalRecord) return null;

      // Rol (from Rol) es un lookup array, tomamos el primer elemento
      const rolArray = PF.ROL_LOOKUP
        ? (personalRecord.get(PF.ROL_LOOKUP) as string[] | undefined)
        : undefined;
      const cargo = rolArray && rolArray.length > 0 ? rolArray[0] : undefined;

      // Areas es un Link to another record (array de record IDs), necesitamos buscar el nombre del área
      // Por ahora, devolvemos el ID del área para que el frontend pueda usarlo
      const areasArray = PF.AREA_TRABAJO
        ? (personalRecord.get(PF.AREA_TRABAJO) as string[] | undefined)
        : undefined;
      const areaId = areasArray && areasArray.length > 0 ? areasArray[0] : undefined;

      // TODO: Necesitamos obtener el nombre del área desde la tabla Areas
      // Por ahora devolvemos el ID, el frontend debería tener un mapeo

      const resultado = {
        ...tokenData,
        nombreCompleto: personalRecord.get(PF.NOMBRE_COMPLETO) as string,
        correo: personalRecord.get(PF.CORREO) as string,
        numeroDocumento: personalRecord.get(PF.NUMERO_DOCUMENTO) as string,
        codigoEmpleado: personalRecord.get(PF.CODIGO_EMPLEADO) as string,
        fechaNacimiento: PF.FECHA_NACIMIENTO
          ? (personalRecord.get(PF.FECHA_NACIMIENTO) as string | undefined)
          : undefined,
        fechaIncorporacion: PF.FECHA_INCORPORACION
          ? (personalRecord.get(PF.FECHA_INCORPORACION) as string | undefined)
          : undefined,
        areaTrabajo: areaId, // Ahora es un string (record ID) en lugar de array
        cargo,
      };

      console.log("[obtenerConPersonal] Área de trabajo:", resultado.areaTrabajo, "Field ID:", PF.AREA_TRABAJO);
      console.log("[obtenerConPersonal] Cargo (Rol from Rol):", resultado.cargo, "Field ID:", PF.ROL_LOOKUP);

      return resultado;
    } catch {
      return null;
    }
  }

  async listarPorCampana(campanaId: string): Promise<Token[]> {
    // FIND(recordId, {link}) no funciona (los links se renderizan con su campo primario),
    // así que se usan los record IDs del back-link de la campaña.
    const CF = SOCIO_CONFIG.campanas.fields;
    const campanasTable = this.base(SOCIO_CONFIG.campanas.tableId);

    const campanaRecord = await encontrarPorId(campanasTable, campanaId);
    if (!campanaRecord) return [];

    const tokenIds = (campanaRecord.get(CF.TOKENS_LINK) as string[]) || [];
    if (tokenIds.length === 0) return [];

    const records = await listarPorIds(this.table, tokenIds);
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
    const tokens = await this.listarPorCampana(campanaId);
    return tokens.some((t) => t.personalId === personalId);
  }

  private mapToDomain(record: Airtable.Record<any>): Token {
    const F = SOCIO_CONFIG.tokens.fields;

    return {
      id: record.id,
      token: record.get(F.TOKEN) as string,
      campanaId: (record.get(F.CAMPANA) as string[])?.[0] || "",
      // Personal es texto plano con el record ID del colaborador
      personalId: (record.get(F.PERSONAL) as string) || "",
      usado: record.get(F.USADO) === true,
      fechaUso: record.get(F.FECHA_USO) ? new Date(record.get(F.FECHA_USO) as string) : undefined,
      createdTime: new Date(record._rawJson.createdTime),
    };
  }
}
