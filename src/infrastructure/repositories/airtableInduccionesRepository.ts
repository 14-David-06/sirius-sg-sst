// ══════════════════════════════════════════════════════════
// Repositorio Airtable — Módulo Inducciones & Reinducciones
// Implementa operaciones CRUD sobre las 3 tablas del módulo
// ══════════════════════════════════════════════════════════

import {
  airtableInduccionesConfig,
  createInduccionesClient,
  induccionesModuleConfig,
} from "../config/airtableInducciones";
import type {
  RegistroInduccion,
  TokenFirma,
  AlertaLog,
  CrearInduccionDTO,
  ActualizarInduccionDTO,
  EstadoInduccion,
  EstadoToken,
} from "@/shared/types/inducciones";

const RF = airtableInduccionesConfig.registrosFields;
const TF = airtableInduccionesConfig.tokensFields;
const AF = airtableInduccionesConfig.alertasFields;

// ── Repositorio de Registros de Inducción ──────────────────
export class AirtableInduccionesRepository {
  private client;
  private registrosTableId: string;
  private tokensTableId: string;
  private alertasTableId: string;

  constructor() {
    this.client = createInduccionesClient();
    this.registrosTableId = airtableInduccionesConfig.registrosTableId;
    this.tokensTableId = airtableInduccionesConfig.tokensTableId;
    this.alertasTableId = airtableInduccionesConfig.alertasTableId;
  }

  // ── REGISTROS DE INDUCCIÓN ─────────────────────────────────

  /**
   * Listar todos los registros de inducción
   * @param filterByStatus - Opcional: filtrar por estado
   */
  async listarRegistros(filterByStatus?: EstadoInduccion): Promise<RegistroInduccion[]> {
    const url = `${this.client.baseUrl}/${this.registrosTableId}`;
    const params = new URLSearchParams({ pageSize: "100" });

    if (filterByStatus) {
      params.append("filterByFormula", `{${RF.ESTADO}} = '${filterByStatus}'`);
    }

    const response = await fetch(`${url}?${params}`, {
      headers: this.client.headers,
    });

    if (!response.ok) {
      throw new Error(`Error listando inducciones: ${response.statusText}`);
    }

    const data = await response.json();
    return data.records.map((record: any) => this.mapRecordToRegistro(record));
  }

  /**
   * Obtener un registro de inducción por ID
   */
  async obtenerRegistroPorId(recordId: string): Promise<RegistroInduccion | null> {
    const url = `${this.client.baseUrl}/${this.registrosTableId}/${recordId}`;

    const response = await fetch(url, {
      headers: this.client.headers,
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Error obteniendo inducción: ${response.statusText}`);
    }

    const record = await response.json();
    return this.mapRecordToRegistro(record);
  }

  /**
   * Obtener un registro por ID_Induccion (IND-XXXX)
   */
  async obtenerRegistroPorIdInduccion(idInduccion: string): Promise<RegistroInduccion | null> {
    const url = `${this.client.baseUrl}/${this.registrosTableId}`;
    const params = new URLSearchParams({
      filterByFormula: `{${RF.ID_INDUCCION}} = '${idInduccion}'`,
      maxRecords: "1",
    });

    const response = await fetch(`${url}?${params}`, {
      headers: this.client.headers,
    });

    if (!response.ok) {
      throw new Error(`Error buscando inducción: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.records.length === 0) return null;

    return this.mapRecordToRegistro(data.records[0]);
  }

  /**
   * Listar registros de un colaborador específico
   */
  async listarPorEmpleado(idEmpleadoCore: string): Promise<RegistroInduccion[]> {
    const url = `${this.client.baseUrl}/${this.registrosTableId}`;
    const params = new URLSearchParams({
      filterByFormula: `{${RF.ID_EMPLEADO_CORE}} = '${idEmpleadoCore}'`,
      sort: `[{field: '${RF.FECHA_REALIZACION}', direction: 'desc'}]`,
    });

    const response = await fetch(`${url}?${params}`, {
      headers: this.client.headers,
    });

    if (!response.ok) {
      throw new Error(`Error listando inducciones del empleado: ${response.statusText}`);
    }

    const data = await response.json();
    return data.records.map((record: any) => this.mapRecordToRegistro(record));
  }

  /**
   * Crear un nuevo registro de inducción
   */
  async crearRegistro(dto: CrearInduccionDTO, datosEmpleado: {
    nombreCompleto: string;
    numeroDocumento: string;
    cargo: string;
  }): Promise<RegistroInduccion> {
    // Generar ID_Induccion
    const lastId = await this.obtenerUltimoIdInduccion();
    const newIdNum = lastId ? parseInt(lastId.split("-")[1]) + 1 : 1;
    const idInduccion = `IND-${String(newIdNum).padStart(4, "0")}`;

    // Calcular fecha de vencimiento
    const fechaRealizacion = new Date(dto.fechaRealizacion);
    const fechaVencimiento = new Date(fechaRealizacion);
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + induccionesModuleConfig.vigenciaMeses);

    const url = `${this.client.baseUrl}/${this.registrosTableId}`;
    const payload = {
      fields: {
        [RF.ID_INDUCCION]: idInduccion,
        [RF.ID_EMPLEADO_CORE]: dto.idEmpleadoCore,
        [RF.NOMBRE_EMPLEADO]: datosEmpleado.nombreCompleto,
        [RF.NUMERO_DOCUMENTO]: datosEmpleado.numeroDocumento,
        [RF.CARGO]: datosEmpleado.cargo,
        [RF.TIPO]: dto.tipo,
        [RF.FECHA_REALIZACION]: dto.fechaRealizacion,
        [RF.FECHA_VENCIMIENTO]: fechaVencimiento.toISOString().split("T")[0],
        [RF.RESPONSABLE_SST]: dto.responsableSST,
        [RF.ESTADO_EVALUACION]: "Pendiente",
        [RF.ESTADO]: "En_Proceso",
        ...(dto.observaciones && { [RF.OBSERVACIONES]: dto.observaciones }),
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: this.client.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error creando inducción: ${error}`);
    }

    const record = await response.json();
    return this.mapRecordToRegistro(record);
  }

  /**
   * Actualizar un registro de inducción
   */
  async actualizarRegistro(
    recordId: string,
    dto: ActualizarInduccionDTO
  ): Promise<RegistroInduccion> {
    const url = `${this.client.baseUrl}/${this.registrosTableId}/${recordId}`;
    const fields: any = {};

    if (dto.evaluacionId !== undefined) fields[RF.EVALUACION_ID] = dto.evaluacionId;
    if (dto.puntajeEvaluacion !== undefined) fields[RF.PUNTAJE_EVALUACION] = dto.puntajeEvaluacion;
    if (dto.estadoEvaluacion) fields[RF.ESTADO_EVALUACION] = dto.estadoEvaluacion;
    if (dto.firmaUrl !== undefined) fields[RF.FIRMA_URL] = dto.firmaUrl;
    if (dto.certificadoUrl !== undefined) fields[RF.CERTIFICADO_URL] = dto.certificadoUrl;
    if (dto.fechaExportacion !== undefined) fields[RF.FECHA_EXPORTACION] = dto.fechaExportacion;
    if (dto.estado) fields[RF.ESTADO] = dto.estado;
    if (dto.observaciones !== undefined) fields[RF.OBSERVACIONES] = dto.observaciones;

    const response = await fetch(url, {
      method: "PATCH",
      headers: this.client.headers,
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error actualizando inducción: ${error}`);
    }

    const record = await response.json();
    return this.mapRecordToRegistro(record);
  }

  // ── TOKENS DE FIRMA ────────────────────────────────────────

  /**
   * Crear un token de firma
   */
  async crearTokenFirma(
    induccionId: string,
    idEmpleadoCore: string
  ): Promise<TokenFirma> {
    // Generar Token_ID
    const lastId = await this.obtenerUltimoIdToken();
    const newIdNum = lastId ? parseInt(lastId.split("-")[1]) + 1 : 1;
    const tokenId = `TKNI-${String(newIdNum).padStart(4, "0")}`;

    // Fechas (expiracion según configuración)
    const now = new Date();
    const expiracion = new Date(
      now.getTime() + induccionesModuleConfig.tokenExpiracionHoras * 60 * 60 * 1000
    );

    const url = `${this.client.baseUrl}/${this.tokensTableId}`;
    const payload = {
      fields: {
        [TF.TOKEN_ID]: tokenId,
        [TF.INDUCCION_ID]: induccionId,
        [TF.ID_EMPLEADO_CORE]: idEmpleadoCore,
        [TF.FECHA_GENERACION]: now.toISOString(),
        [TF.FECHA_EXPIRACION]: expiracion.toISOString(),
        [TF.ESTADO_TOKEN]: "Pendiente",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: this.client.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error creando token: ${error}`);
    }

    const record = await response.json();
    return this.mapRecordToToken(record);
  }

  /**
   * Obtener token por Token_ID
   */
  async obtenerTokenPorId(tokenId: string): Promise<TokenFirma | null> {
    const url = `${this.client.baseUrl}/${this.tokensTableId}`;
    const params = new URLSearchParams({
      filterByFormula: `{${TF.TOKEN_ID}} = '${tokenId}'`,
      maxRecords: "1",
    });

    const response = await fetch(`${url}?${params}`, {
      headers: this.client.headers,
    });

    if (!response.ok) {
      throw new Error(`Error buscando token: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.records.length === 0) return null;

    return this.mapRecordToToken(data.records[0]);
  }

  /**
   * Actualizar estado del token y guardar firma
   */
  async actualizarToken(
    recordId: string,
    estado: EstadoToken,
    hashFirma?: string
  ): Promise<TokenFirma> {
    const url = `${this.client.baseUrl}/${this.tokensTableId}/${recordId}`;
    const fields: any = {
      [TF.ESTADO_TOKEN]: estado,
    };

    if (hashFirma) {
      fields[TF.HASH_FIRMA] = hashFirma;
    }

    const response = await fetch(url, {
      method: "PATCH",
      headers: this.client.headers,
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error actualizando token: ${error}`);
    }

    const record = await response.json();
    return this.mapRecordToToken(record);
  }

  // ── ALERTAS ────────────────────────────────────────────────

  /**
   * Crear una alerta de vencimiento
   */
  async crearAlerta(
    induccionId: string,
    idEmpleadoCore: string,
    nombreEmpleado: string,
    fechaVencimiento: string,
    fechaAlerta: string
  ): Promise<AlertaLog> {
    // Generar ID_Alerta
    const lastId = await this.obtenerUltimoIdAlerta();
    const newIdNum = lastId ? parseInt(lastId.split("-")[2]) + 1 : 1;
    const idAlerta = `ALERTA-IND-${String(newIdNum).padStart(4, "0")}`;

    const url = `${this.client.baseUrl}/${this.alertasTableId}`;
    const payload = {
      fields: {
        [AF.ID_ALERTA]: idAlerta,
        [AF.INDUCCION_ID]: induccionId,
        [AF.ID_EMPLEADO_CORE]: idEmpleadoCore,
        [AF.NOMBRE_EMPLEADO]: nombreEmpleado,
        [AF.FECHA_VENCIMIENTO]: fechaVencimiento,
        [AF.FECHA_ALERTA]: fechaAlerta,
        [AF.TIPO_ALERTA]: "15_DIAS",
        [AF.ENVIADA]: false,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: this.client.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error creando alerta: ${error}`);
    }

    const record = await response.json();
    return this.mapRecordToAlerta(record);
  }

  /**
   * Listar alertas pendientes (no enviadas)
   */
  async listarAlertasPendientes(): Promise<AlertaLog[]> {
    const hoy = new Date().toISOString().split("T")[0];
    const url = `${this.client.baseUrl}/${this.alertasTableId}`;
    const params = new URLSearchParams({
      filterByFormula: `AND({${AF.ENVIADA}} = FALSE(), {${AF.FECHA_ALERTA}} <= '${hoy}')`,
      sort: `[{field: '${AF.FECHA_ALERTA}', direction: 'asc'}]`,
    });

    const response = await fetch(`${url}?${params}`, {
      headers: this.client.headers,
    });

    if (!response.ok) {
      throw new Error(`Error listando alertas: ${response.statusText}`);
    }

    const data = await response.json();
    return data.records.map((record: any) => this.mapRecordToAlerta(record));
  }

  /**
   * Marcar alerta como gestionada (Fase 1 - manual)
   */
  async marcarAlertaGestionada(recordId: string): Promise<AlertaLog> {
    const url = `${this.client.baseUrl}/${this.alertasTableId}/${recordId}`;
    const payload = {
      fields: {
        [AF.ENVIADA]: true,
        [AF.FECHA_ENVIO]: new Date().toISOString(),
      },
    };

    const response = await fetch(url, {
      method: "PATCH",
      headers: this.client.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error marcando alerta: ${error}`);
    }

    const record = await response.json();
    return this.mapRecordToAlerta(record);
  }

  // ── HELPERS PRIVADOS ───────────────────────────────────────

  private async obtenerUltimoIdInduccion(): Promise<string | null> {
    const url = `${this.client.baseUrl}/${this.registrosTableId}`;
    const params = new URLSearchParams({
      sort: `[{field: '${RF.ID_INDUCCION}', direction: 'desc'}]`,
      maxRecords: "1",
    });

    const response = await fetch(`${url}?${params}`, {
      headers: this.client.headers,
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.records.length > 0 ? data.records[0].fields[RF.ID_INDUCCION] : null;
  }

  private async obtenerUltimoIdToken(): Promise<string | null> {
    const url = `${this.client.baseUrl}/${this.tokensTableId}`;
    const params = new URLSearchParams({
      sort: `[{field: '${TF.TOKEN_ID}', direction: 'desc'}]`,
      maxRecords: "1",
    });

    const response = await fetch(`${url}?${params}`, {
      headers: this.client.headers,
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.records.length > 0 ? data.records[0].fields[TF.TOKEN_ID] : null;
  }

  private async obtenerUltimoIdAlerta(): Promise<string | null> {
    const url = `${this.client.baseUrl}/${this.alertasTableId}`;
    const params = new URLSearchParams({
      sort: `[{field: '${AF.ID_ALERTA}', direction: 'desc'}]`,
      maxRecords: "1",
    });

    const response = await fetch(`${url}?${params}`, {
      headers: this.client.headers,
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.records.length > 0 ? data.records[0].fields[AF.ID_ALERTA] : null;
  }

  // ── MAPPERS ────────────────────────────────────────────────

  private mapRecordToRegistro(record: any): RegistroInduccion {
    const f = record.fields;
    return {
      id: record.id,
      idInduccion: f[RF.ID_INDUCCION],
      idEmpleadoCore: f[RF.ID_EMPLEADO_CORE],
      nombreEmpleado: f[RF.NOMBRE_EMPLEADO],
      numeroDocumento: f[RF.NUMERO_DOCUMENTO],
      cargo: f[RF.CARGO],
      tipo: f[RF.TIPO],
      fechaRealizacion: f[RF.FECHA_REALIZACION],
      fechaVencimiento: f[RF.FECHA_VENCIMIENTO],
      responsableSST: f[RF.RESPONSABLE_SST],
      evaluacionId: f[RF.EVALUACION_ID] || null,
      puntajeEvaluacion: f[RF.PUNTAJE_EVALUACION] || null,
      estadoEvaluacion: f[RF.ESTADO_EVALUACION] || "Pendiente",
      firmaUrl: f[RF.FIRMA_URL] || null,
      certificadoUrl: f[RF.CERTIFICADO_URL] || null,
      fechaExportacion: f[RF.FECHA_EXPORTACION] || null,
      estado: f[RF.ESTADO] || "En_Proceso",
      observaciones: f[RF.OBSERVACIONES] || null,
    };
  }

  private mapRecordToToken(record: any): TokenFirma {
    const f = record.fields;
    return {
      id: record.id,
      tokenId: f[TF.TOKEN_ID],
      induccionId: f[TF.INDUCCION_ID],
      idEmpleadoCore: f[TF.ID_EMPLEADO_CORE],
      hashFirma: f[TF.HASH_FIRMA] || null,
      fechaGeneracion: f[TF.FECHA_GENERACION],
      fechaExpiracion: f[TF.FECHA_EXPIRACION],
      estadoToken: f[TF.ESTADO_TOKEN] || "Pendiente",
    };
  }

  private mapRecordToAlerta(record: any): AlertaLog {
    const f = record.fields;
    return {
      id: record.id,
      idAlerta: f[AF.ID_ALERTA],
      induccionId: f[AF.INDUCCION_ID],
      idEmpleadoCore: f[AF.ID_EMPLEADO_CORE],
      nombreEmpleado: f[AF.NOMBRE_EMPLEADO],
      fechaVencimiento: f[AF.FECHA_VENCIMIENTO],
      fechaAlerta: f[AF.FECHA_ALERTA],
      tipoAlerta: f[AF.TIPO_ALERTA] || "15_DIAS",
      enviada: f[AF.ENVIADA] || false,
      fechaEnvio: f[AF.FECHA_ENVIO] || null,
      correoDestino: f[AF.CORREO_DESTINO] || null,
      observacionesEnvio: f[AF.OBSERVACIONES_ENVIO] || null,
    };
  }
}

// Exportar instancia singleton
export const induccionesRepository = new AirtableInduccionesRepository();
