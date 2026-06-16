import Airtable from "airtable";
import type { Campana, CrearCampanaDTO, CerrarCampanaDTO } from "../../domain/entities";
import type { ICampanaRepository } from "../../domain/repositories";
import { SOCIO_CONFIG } from "./config";
import { encontrarPorId } from "./airtableUtils";

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

    const fields = {
      [F.NOMBRE]: dto.nombre,
      [F.PERIODO]: dto.periodo,
      [F.ANO]: dto.año,
      [F.ESTADO]: "Activa",
      [F.FECHA_INICIO]: dto.fechaInicio.toISOString().split("T")[0],
      [F.CREADO_POR]: dto.creadoPor,
    };

    // Validar que ningún field ID esté undefined
    Object.entries(fields).forEach(([key]) => {
      if (key === "undefined") {
        console.error("Field ID undefined detectado. Config:", F);
        throw new Error("Configuración de campo inválida");
      }
    });

    const record = await this.table.create(fields);

    // Re-leer: el registro devuelto por create() viene indexado por nombre de campo
    const creada = await this.obtenerPorId(record.id);
    if (!creada) throw new Error("No se pudo leer la campaña recién creada");
    return creada;
  }

  async obtenerPorId(id: string): Promise<Campana | null> {
    const record = await encontrarPorId(this.table, id);
    return record ? this.mapToDomain(record) : null;
  }

  async listar(): Promise<Campana[]> {
    const records = await this.table.select({ returnFieldsByFieldId: true }).all();
    return records.map((r) => this.mapToDomain(r));
  }

  async listarActivas(): Promise<Campana[]> {
    const F = SOCIO_CONFIG.campanas.fields;
    const records = await this.table
      .select({
        filterByFormula: `{${F.ESTADO}} = 'Activa'`,
        returnFieldsByFieldId: true,
      })
      .all();

    return records.map((r) => this.mapToDomain(r));
  }

  async cerrar(dto: CerrarCampanaDTO): Promise<Campana> {
    const F = SOCIO_CONFIG.campanas.fields;

    await this.table.update(dto.campanaId, {
      [F.ESTADO]: "Cerrada",
      [F.FECHA_CIERRE]: dto.fechaCierre.toISOString().split("T")[0],
    });

    // Re-leer: el registro devuelto por update() viene indexado por nombre de campo
    const cerrada = await this.obtenerPorId(dto.campanaId);
    if (!cerrada) throw new Error("No se pudo leer la campaña actualizada");
    return cerrada;
  }

  async obtenerEstadisticas(
    campanaId: string
  ): Promise<{ totalTokens: number; totalRespuestas: number; porcentajeCompletado: number }> {
    const F = SOCIO_CONFIG.campanas.fields;

    // Los back-links de la campaña ya contienen los record IDs vinculados:
    // una sola lectura en vez de escanear las tablas de tokens/respuestas.
    // (FIND(recordId, {link}) no funciona: los links se renderizan con su campo primario)
    const record = await encontrarPorId(this.table, campanaId);
    if (!record) {
      return { totalTokens: 0, totalRespuestas: 0, porcentajeCompletado: 0 };
    }

    const totalTokens = ((record.get(F.TOKENS_LINK) as string[]) || []).length;
    const totalRespuestas = ((record.get(F.RESPUESTAS_LINK) as string[]) || []).length;

    const porcentajeCompletado = totalTokens > 0 ? Math.round((totalRespuestas / totalTokens) * 100) : 0;

    return {
      totalTokens,
      totalRespuestas,
      porcentajeCompletado,
    };
  }

  private mapToDomain(record: Airtable.Record<any>): Campana {
    const F = SOCIO_CONFIG.campanas.fields;

    return {
      id: record.id,
      nombre: record.get(F.NOMBRE) as string,
      periodo: record.get(F.PERIODO) as any,
      año: record.get(F.ANO) as number,
      estado: record.get(F.ESTADO) as any,
      fechaInicio: new Date(record.get(F.FECHA_INICIO) as string),
      fechaCierre: record.get(F.FECHA_CIERRE) ? new Date(record.get(F.FECHA_CIERRE) as string) : undefined,
      creadoPor: record.get(F.CREADO_POR) as string,
      // Los back-links ya vienen en el registro: contar aquí evita queries N+1
      tokensGenerados: ((record.get(F.TOKENS_LINK) as string[]) || []).length,
      respuestasCompletadas: ((record.get(F.RESPUESTAS_LINK) as string[]) || []).length,
      createdTime: new Date(record._rawJson.createdTime),
    };
  }
}
