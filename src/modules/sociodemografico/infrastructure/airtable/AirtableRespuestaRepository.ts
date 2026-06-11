import Airtable from "airtable";
import type {
  Respuesta,
  GuardarRespuestaDTO,
  EstadisticasCampana,
  PiramidePoblacional,
} from "../../domain/entities";
import type { IRespuestaRepository } from "../../domain/repositories";
import { SOCIO_CONFIG } from "./config";

export class AirtableRespuestaRepository implements IRespuestaRepository {
  private base: Airtable.Base;
  private table: Airtable.Table<any>;

  constructor() {
    const airtable = new Airtable({ apiKey: SOCIO_CONFIG.apiToken });
    this.base = airtable.base(SOCIO_CONFIG.baseId);
    this.table = this.base(SOCIO_CONFIG.respuestas.tableId);
  }

  async guardar(dto: GuardarRespuestaDTO): Promise<Respuesta> {
    const F = SOCIO_CONFIG.respuestas.fields;

    // 1. Validar que el token existe y no ha sido usado
    const tokensTable = this.base(SOCIO_CONFIG.tokens.tableId);
    const TF = SOCIO_CONFIG.tokens.fields;

    const tokenRecords = await tokensTable
      .select({
        filterByFormula: `{${TF.TOKEN}} = '${dto.token}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (tokenRecords.length === 0) {
      throw new Error("Token inválido");
    }

    const tokenRecord = tokenRecords[0];
    const tokenUsado = tokenRecord.get(TF.USADO) === true;

    if (tokenUsado) {
      throw new Error("Esta encuesta ya fue respondida");
    }

    // 2. Validar que la campaña está activa
    const campanaId = (tokenRecord.get(TF.CAMPANA) as string[])?.[0];
    const campanasTable = this.base(SOCIO_CONFIG.campanas.tableId);
    const CF = SOCIO_CONFIG.campanas.fields;

    const campanaRecord = await campanasTable.find(campanaId);
    const estadoCampana = campanaRecord.get(CF.ESTADO);

    if (estadoCampana === "Cerrada") {
      throw new Error("Esta campaña ya está cerrada");
    }

    // 3. Validar consentimiento
    if (!dto.aceptaPoliticaDatos) {
      throw new Error("Debe aceptar la política de tratamiento de datos");
    }

    if (!dto.firmaVeracidad) {
      throw new Error("Debe firmar la veracidad de la información");
    }

    // 4. Crear registro de respuesta
    const personalId = (tokenRecord.get(TF.PERSONAL) as string[])?.[0];

    const record = await this.table.create({
      [F.TOKEN]: [tokenRecord.id],
      [F.CAMPANA]: [campanaId],
      [F.PERSONAL]: [personalId],
      // Sección 1
      [F.NOMBRE_COMPLETO]: dto.nombreCompleto,
      [F.NUMERO_DOCUMENTO]: dto.numeroDocumento,
      [F.FECHA_NACIMIENTO]: dto.fechaNacimiento,
      [F.GENERO]: dto.genero,
      [F.ESTADO_CIVIL]: dto.estadoCivil,
      // Sección 2
      [F.MUNICIPIO_RESIDENCIA]: dto.municipioResidencia,
      [F.ESTRATO]: dto.estrato,
      [F.TIPO_VIVIENDA]: dto.tipoVivienda,
      [F.PERSONAS_A_CARGO]: dto.personasACargo,
      // Sección 3
      [F.ESCOLARIDAD]: dto.escolaridad,
      [F.ESTUDIANDO_ACTUALMENTE]: dto.estudiandoActualmente,
      [F.CARRERA_ACTUAL]: dto.carreraActual || "",
      // Sección 4
      [F.AREA_TRABAJO]: dto.areaTrabajo,
      [F.CARGO]: dto.cargo,
      [F.TIPO_CONTRATO]: dto.tipoContrato,
      [F.FECHA_INGRESO_SIRIUS]: dto.fechaIngresoSirius,
      [F.TURNO_TRABAJO]: dto.turnoTrabajo,
      [F.OTRO_EMPLEO]: dto.otroEmpleo,
      // Sección 5
      [F.ENFERMEDAD_CRONICA]: dto.enfermedadCronica,
      [F.CUAL_ENFERMEDAD_CRONICA]: dto.cualEnfermedadCronica || "",
      [F.DISCAPACIDAD]: dto.discapacidad,
      [F.CUAL_DISCAPACIDAD]: dto.cualDiscapacidad || "",
      [F.TRATAMIENTO_MEDICO]: dto.tratamientoMedico,
      [F.ACCIDENTES_TRABAJO_PREVIOS]: dto.accidentesTrabajoPrevios,
      [F.ENFERMEDAD_LABORAL_PREVIA]: dto.enfermedadLaboralPrevia,
      // Sección 6
      [F.FUMA]: dto.fuma,
      [F.ALCOHOL]: dto.alcohol,
      [F.PRACTICA_DEPORTE]: dto.practicaDeporte,
      [F.CUAL_DEPORTE]: dto.cualDeporte || "",
      [F.TIEMPO_LIBRE]: dto.tiempoLibre,
      // Sección 7
      [F.MEDIO_TRANSPORTE]: dto.medioTransporte,
      [F.TIEMPO_DESPLAZAMIENTO]: dto.tiempoDesplazamiento,
      // Consentimiento
      [F.ACEPTA_POLITICA_DATOS]: dto.aceptaPoliticaDatos,
      [F.FIRMA_VERACIDAD]: dto.firmaVeracidad,
    });

    // 5. Marcar token como usado
    await tokensTable.update(tokenRecord.id, {
      [TF.USADO]: true,
      [TF.FECHA_USO]: new Date().toISOString(),
    });

    return this.mapToDomain(record);
  }

  async obtenerPorId(id: string): Promise<Respuesta | null> {
    try {
      const record = await this.table.find(id);
      return this.mapToDomain(record);
    } catch {
      return null;
    }
  }

  async listarPorCampana(campanaId: string): Promise<Respuesta[]> {
    const F = SOCIO_CONFIG.respuestas.fields;

    const records = await this.table
      .select({
        filterByFormula: `FIND("${campanaId}", {${F.CAMPANA}})`,
      })
      .all();

    return records.map((r) => this.mapToDomain(r));
  }

  async obtenerEstadisticas(campanaId: string): Promise<EstadisticasCampana> {
    const respuestas = await this.listarPorCampana(campanaId);
    const totalRespuestas = respuestas.length;

    // Función helper para contar distribuciones
    const contar = (campo: keyof Respuesta): Record<string, number> => {
      const conteo: Record<string, number> = {};
      respuestas.forEach((r) => {
        const valor = String(r[campo] || "");
        conteo[valor] = (conteo[valor] || 0) + 1;
      });
      return conteo;
    };

    // Función helper para campos booleanos
    const contarBoolean = (campo: keyof Respuesta) => {
      const si = respuestas.filter((r) => r[campo] === true).length;
      return { si, no: totalRespuestas - si };
    };

    return {
      totalRespuestas,
      genero: contar("genero"),
      estadoCivil: contar("estadoCivil"),
      estrato: contar("estrato"),
      tipoVivienda: contar("tipoVivienda"),
      personasACargo: contar("personasACargo"),
      escolaridad: contar("escolaridad"),
      areaTrabajo: contar("areaTrabajo"),
      tipoContrato: contar("tipoContrato"),
      turnoTrabajo: contar("turnoTrabajo"),
      fuma: contar("fuma"),
      alcohol: contar("alcohol"),
      medioTransporte: contar("medioTransporte"),
      tiempoDesplazamiento: contar("tiempoDesplazamiento"),
      estudiandoActualmente: contarBoolean("estudiandoActualmente"),
      otroEmpleo: contarBoolean("otroEmpleo"),
      enfermedadCronica: contarBoolean("enfermedadCronica"),
      discapacidad: contarBoolean("discapacidad"),
      tratamientoMedico: contarBoolean("tratamientoMedico"),
      accidentesTrabajoPrevios: contarBoolean("accidentesTrabajoPrevios"),
      enfermedadLaboralPrevia: contarBoolean("enfermedadLaboralPrevia"),
      practicaDeporte: contarBoolean("practicaDeporte"),
    };
  }

  async obtenerPiramidePoblacional(campanaId: string): Promise<PiramidePoblacional> {
    const respuestas = await this.listarPorCampana(campanaId);

    // Calcular edades
    const ahora = new Date();
    const datosConEdad = respuestas.map((r) => {
      const edad = ahora.getFullYear() - r.fechaNacimiento.getFullYear();
      return { edad, genero: r.genero };
    });

    // Definir rangos
    const rangos = ["0-17", "18-25", "26-35", "36-45", "46-55", "56+"];

    const resultado = rangos.map((rango) => {
      const [min, max] = rango.split("-").map((n) => (n === "56+" ? 56 : parseInt(n)));

      const enRango = datosConEdad.filter((d) => {
        if (rango === "56+") return d.edad >= min;
        return d.edad >= min && d.edad <= max;
      });

      return {
        rango,
        Masculino: enRango.filter((d) => d.genero === "Masculino").length,
        Femenino: enRango.filter((d) => d.genero === "Femenino").length,
        Otro: enRango.filter((d) => d.genero !== "Masculino" && d.genero !== "Femenino").length,
      };
    });

    return { rangos: resultado };
  }

  async existeRespuestaParaToken(tokenId: string): Promise<boolean> {
    const F = SOCIO_CONFIG.respuestas.fields;

    const records = await this.table
      .select({
        filterByFormula: `FIND("${tokenId}", {${F.TOKEN}})`,
        maxRecords: 1,
      })
      .firstPage();

    return records.length > 0;
  }

  private mapToDomain(record: Airtable.Record<any>): Respuesta {
    const F = SOCIO_CONFIG.respuestas.fields;

    return {
      id: record.id,
      tokenId: (record.get(F.TOKEN) as string[])?.[0] || "",
      campanaId: (record.get(F.CAMPANA) as string[])?.[0] || "",
      personalId: (record.get(F.PERSONAL) as string[])?.[0] || "",
      // Sección 1
      nombreCompleto: record.get(F.NOMBRE_COMPLETO) as string,
      numeroDocumento: record.get(F.NUMERO_DOCUMENTO) as string,
      fechaNacimiento: new Date(record.get(F.FECHA_NACIMIENTO) as string),
      genero: record.get(F.GENERO) as any,
      estadoCivil: record.get(F.ESTADO_CIVIL) as any,
      // Sección 2
      municipioResidencia: record.get(F.MUNICIPIO_RESIDENCIA) as string,
      estrato: record.get(F.ESTRATO) as any,
      tipoVivienda: record.get(F.TIPO_VIVIENDA) as any,
      personasACargo: record.get(F.PERSONAS_A_CARGO) as any,
      // Sección 3
      escolaridad: record.get(F.ESCOLARIDAD) as any,
      estudiandoActualmente: record.get(F.ESTUDIANDO_ACTUALMENTE) === true,
      carreraActual: record.get(F.CARRERA_ACTUAL) as string | undefined,
      // Sección 4
      areaTrabajo: record.get(F.AREA_TRABAJO) as any,
      cargo: record.get(F.CARGO) as string,
      tipoContrato: record.get(F.TIPO_CONTRATO) as any,
      fechaIngresoSirius: new Date(record.get(F.FECHA_INGRESO_SIRIUS) as string),
      turnoTrabajo: record.get(F.TURNO_TRABAJO) as any,
      otroEmpleo: record.get(F.OTRO_EMPLEO) === true,
      // Sección 5
      enfermedadCronica: record.get(F.ENFERMEDAD_CRONICA) === true,
      cualEnfermedadCronica: record.get(F.CUAL_ENFERMEDAD_CRONICA) as string | undefined,
      discapacidad: record.get(F.DISCAPACIDAD) === true,
      cualDiscapacidad: record.get(F.CUAL_DISCAPACIDAD) as string | undefined,
      tratamientoMedico: record.get(F.TRATAMIENTO_MEDICO) === true,
      accidentesTrabajoPrevios: record.get(F.ACCIDENTES_TRABAJO_PREVIOS) === true,
      enfermedadLaboralPrevia: record.get(F.ENFERMEDAD_LABORAL_PREVIA) === true,
      // Sección 6
      fuma: record.get(F.FUMA) as any,
      alcohol: record.get(F.ALCOHOL) as any,
      practicaDeporte: record.get(F.PRACTICA_DEPORTE) === true,
      cualDeporte: record.get(F.CUAL_DEPORTE) as string | undefined,
      tiempoLibre: (record.get(F.TIEMPO_LIBRE) as any[]) || [],
      // Sección 7
      medioTransporte: record.get(F.MEDIO_TRANSPORTE) as any,
      tiempoDesplazamiento: record.get(F.TIEMPO_DESPLAZAMIENTO) as any,
      // Consentimiento
      aceptaPoliticaDatos: record.get(F.ACEPTA_POLITICA_DATOS) === true,
      firmaVeracidad: record.get(F.FIRMA_VERACIDAD) === true,
      createdTime: new Date(record.get("Created") as string),
    };
  }
}
