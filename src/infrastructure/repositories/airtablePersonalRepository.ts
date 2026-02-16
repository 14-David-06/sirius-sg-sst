import {
  airtableConfig,
  getAirtableUrl,
  getAirtableHeaders,
} from "../config/airtable";
import type { User } from "@/core/domain/entities/User";
import type { PersonRepository } from "@/core/ports/output";
import type { Logger } from "@/core/ports/output";

// ── Field IDs desde variables de entorno (ver .env.local) ──────────────
const PF = airtableConfig.personalFields;
const SF = airtableConfig.sistemasFields;

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

/**
 * Implementación de PersonRepository usando Airtable como fuente de datos.
 * Recibe un Logger inyectado — nunca usa console.log directamente.
 */
export class AirtablePersonalRepository implements PersonRepository {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Busca los record IDs de la app "Sirius SG-SST" en la tabla Sistemas y Aplicaciones.
   * Maneja paginación por si la tabla crece.
   */
  async getSgSstAppRecordIds(): Promise<string[]> {
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const url = new URL(getAirtableUrl(airtableConfig.sistemasTableId));
      if (offset) url.searchParams.set("offset", offset);

      this.logger.debug("Fetching Sistemas URL:", url.toString());

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: getAirtableHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Airtable Sistemas API error: ${error.error?.message || response.statusText}`
        );
      }

      const data: AirtableListResponse = await response.json();
      this.logger.debug(
        "Sistemas records fetched:",
        data.records.map((r) => ({ id: r.id, fields: r.fields }))
      );
      allRecords.push(...data.records);
      offset = data.offset;
    } while (offset);

    // Normalizar: "SG-SST", "SG SST", "SGSST" → todos matchean
    const sgSstIds = allRecords
      .filter((r) => {
        const nameByFieldName =
          (r.fields["Nombre sistema/aplicación"] as string) || "";
        const nameByFieldId = (r.fields[SF.NOMBRE_APP] as string) || "";
        const name = (nameByFieldName || nameByFieldId)
          .toUpperCase()
          .replace(/[-\s]/g, "");
        return name.includes("SGSST");
      })
      .map((r) => r.id);

    this.logger.info("SG-SST app record IDs encontrados:", sgSstIds);
    return sgSstIds;
  }

  async findByDocumento(
    numeroDocumento: string
  ): Promise<{ user: User; hashedPassword: string } | null> {
    const filterFormula = `{${PF.NUMERO_DOCUMENTO}} = '${numeroDocumento}'`;

    const url = new URL(getAirtableUrl(airtableConfig.personalTableId));
    url.searchParams.set("filterByFormula", filterFormula);
    url.searchParams.set("maxRecords", "1");
    url.searchParams.set("returnFieldsByFieldId", "true");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAirtableHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Airtable Personal API error: ${error.error?.message || response.statusText}`
      );
    }

    const data: AirtableListResponse = await response.json();

    if (data.records.length === 0) {
      return null;
    }

    const record = data.records[0];
    const f = record.fields;

    const fotoPerfilArr = f[PF.FOTO_PERFIL] as
      | Array<{
          url: string;
          filename: string;
          width: number;
          height: number;
          thumbnails?: {
            small?: { url: string; width: number; height: number };
            large?: { url: string; width: number; height: number };
          };
        }>
      | undefined;

    const user: User = {
      id: record.id,
      idEmpleado: (f[PF.ID_EMPLEADO] as string) || "",
      nombreCompleto: (f[PF.NOMBRE_COMPLETO] as string) || "",
      correoElectronico: (f[PF.CORREO] as string) || "",
      numeroDocumento: (f[PF.NUMERO_DOCUMENTO] as string) || "",
      telefono: (f[PF.TELEFONO] as string) || "",
      tipoPersonal: (f[PF.TIPO_PERSONAL] as string) || "",
      estadoActividad: (f[PF.ESTADO_ACTIVIDAD] as string) || "",
      fotoPerfil: fotoPerfilArr?.[0]
        ? {
            url: fotoPerfilArr[0].url,
            filename: fotoPerfilArr[0].filename,
            width: fotoPerfilArr[0].width,
            height: fotoPerfilArr[0].height,
            thumbnails: fotoPerfilArr[0].thumbnails,
          }
        : undefined,
      rolIds: (f[PF.ROL] as string[]) || [],
      areasIds: (f[PF.AREAS] as string[]) || [],
      accesosIds: (f[PF.ACCESOS_ASIGNADOS] as string[]) || [],
    };

    const hashedPassword = (f[PF.PASSWORD] as string) || "";

    this.logger.info(
      "Usuario encontrado:",
      user.nombreCompleto,
      "| Accesos:",
      user.accesosIds
    );

    return { user, hashedPassword };
  }

  /**
   * Actualiza el campo Password de un registro en la tabla Personal.
   */
  async updatePassword(
    recordId: string,
    hashedPassword: string
  ): Promise<void> {
    const url = getAirtableUrl(airtableConfig.personalTableId);

    const response = await fetch(url, {
      method: "PATCH",
      headers: getAirtableHeaders(),
      body: JSON.stringify({
        records: [
          {
            id: recordId,
            fields: {
              [PF.PASSWORD]: hashedPassword,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Airtable API error: ${error.error?.message || response.statusText}`
      );
    }
  }
}
