import Airtable from "airtable";
import type { Campana, CrearCampanaDTO, CerrarCampanaDTO } from "../../domain/entities";
import type { ICampanaRepository } from "../../domain/repositories";
import { SOCIO_CONFIG } from "./config";

export class AirtableCampanaRepository implements ICampanaRepository {
  private base: Airtable.Base;
  private table: Airtable.Table<any>;

  constructor() {
    const airtable = new Airtable({ apiKey: SOCIO_CONFIG.apiToken });
    this.base = airtable.base(SOCIO_CONFIG.baseId);
    this.table = this.base(SOCIO_CONFIG.campanas.tableId);
  }

  async crear(dto: CrearCampanaDTO): Promise<Campana> {
    const F = SOCIO_CONFIG.campanas.fields;

    const record = await this.table.create({
      [F.NOMBRE]: dto.nombre,
      [F.PERIODO]: dto.periodo,
      [F.AÑO]: dto.año,
      [F.ESTADO]: "Activa",
      [F.FECHA_INICIO]: dto.fechaInicio.toISOString().split("T")[0],
      [F.CREADO_POR]: dto.creadoPor,
    });

    return this.mapToDomain(record);
  }

  async obtenerPorId(id: string): Promise<Campana | null> {
    try {
      const record = await this.table.find(id);
      return this.mapToDomain(record);
    } catch (error) {
      return null;
    }
  }

  async listar(): Promise<Campana[]> {
    const records = await this.table.select().all();
    return records.map((r) => this.mapToDomain(r));
  }

  async listarActivas(): Promise<Campana[]> {
    const F = SOCIO_CONFIG.campanas.fields;
    const records = await this.table
      .select({
        filterByFormula: `{${F.ESTADO}} = 'Activa'`,
      })
      .all();

    return records.map((r) => this.mapToDomain(r));
  }

  async cerrar(dto: CerrarCampanaDTO): Promise<Campana> {
    const F = SOCIO_CONFIG.campanas.fields;

    const record = await this.table.update(dto.campanaId, {
      [F.ESTADO]: "Cerrada",
      [F.FECHA_CIERRE]: dto.fechaCierre.toISOString().split("T")[0],
    });

    return this.mapToDomain(record);
  }

  async obtenerEstadisticas(
    campanaId: string
  ): Promise<{ totalTokens: number; totalRespuestas: number; porcentajeCompletado: number }> {
    // Obtener tokens de la campaña
    const tokensTable = this.base(SOCIO_CONFIG.tokens.tableId);
    const TF = SOCIO_CONFIG.tokens.fields;

    const tokens = await tokensTable
      .select({
        filterByFormula: `FIND("${campanaId}", {${TF.CAMPANA}})`,
      })
      .all();

    const totalTokens = tokens.length;

    // Contar tokens usados
    const tokensUsados = tokens.filter((t) => t.get(TF.USADO) === true).length;

    const porcentajeCompletado = totalTokens > 0 ? Math.round((tokensUsados / totalTokens) * 100) : 0;

    return {
      totalTokens,
      totalRespuestas: tokensUsados,
      porcentajeCompletado,
    };
  }

  private mapToDomain(record: Airtable.Record<any>): Campana {
    const F = SOCIO_CONFIG.campanas.fields;

    return {
      id: record.id,
      nombre: record.get(F.NOMBRE) as string,
      periodo: record.get(F.PERIODO) as any,
      año: record.get(F.AÑO) as number,
      estado: record.get(F.ESTADO) as any,
      fechaInicio: new Date(record.get(F.FECHA_INICIO) as string),
      fechaCierre: record.get(F.FECHA_CIERRE) ? new Date(record.get(F.FECHA_CIERRE) as string) : undefined,
      creadoPor: record.get(F.CREADO_POR) as string,
      idCampana: record.get(F.ID_CAMPANA) as string | undefined,
      createdTime: new Date(record.get("Created") as string),
    };
  }
}
