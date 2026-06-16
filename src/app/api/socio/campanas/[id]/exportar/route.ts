import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { AirtableCampanaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableCampanaRepository";
import { AirtableRespuestaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableRespuestaRepository";

const campanasRepo = new AirtableCampanaRepository();
const respuestasRepo = new AirtableRespuestaRepository();

const legible = (valor: string | undefined | null): string =>
  (valor ?? "").toString().replace(/_/g, " ");

const siNo = (valor: boolean): string => (valor ? "Sí" : "No");

const fecha = (valor: Date | undefined): string => {
  if (!valor || isNaN(valor.getTime())) return "";
  return valor.toLocaleDateString("es-CO", { timeZone: "America/Bogota" });
};

/**
 * GET /api/socio/campanas/:id/exportar
 * Exportar a Excel todas las respuestas de la campaña
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campanaId } = await params;

    const campana = await campanasRepo.obtenerPorId(campanaId);
    if (!campana) {
      return NextResponse.json({ success: false, error: "Campaña no encontrada" }, { status: 404 });
    }

    const respuestas = await respuestasRepo.listarPorCampana(campanaId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Respuestas");

    sheet.columns = [
      { header: "Nombre completo", key: "nombre", width: 30 },
      { header: "Documento", key: "documento", width: 15 },
      { header: "Fecha nacimiento", key: "fechaNacimiento", width: 16 },
      { header: "Género", key: "genero", width: 14 },
      { header: "Estado civil", key: "estadoCivil", width: 14 },
      { header: "Municipio", key: "municipio", width: 18 },
      { header: "Estrato", key: "estrato", width: 9 },
      { header: "Tipo vivienda", key: "tipoVivienda", width: 13 },
      { header: "Personas a cargo", key: "personasACargo", width: 15 },
      { header: "Escolaridad", key: "escolaridad", width: 18 },
      { header: "Estudia actualmente", key: "estudiando", width: 17 },
      { header: "Qué estudia", key: "carrera", width: 22 },
      { header: "Área de trabajo", key: "area", width: 15 },
      { header: "Cargo", key: "cargo", width: 22 },
      { header: "Tipo contrato", key: "contrato", width: 18 },
      { header: "Fecha ingreso", key: "fechaIngreso", width: 14 },
      { header: "Turno", key: "turno", width: 11 },
      { header: "Otro empleo", key: "otroEmpleo", width: 11 },
      { header: "Enfermedad crónica", key: "enfCronica", width: 17 },
      { header: "Cuál enfermedad", key: "cualEnf", width: 20 },
      { header: "Discapacidad", key: "discapacidad", width: 12 },
      { header: "Cuál discapacidad", key: "cualDisc", width: 20 },
      { header: "Tratamiento médico", key: "tratamiento", width: 17 },
      { header: "Accidentes laborales previos", key: "accidentes", width: 24 },
      { header: "Enfermedad laboral previa", key: "enfLaboral", width: 22 },
      { header: "Fuma", key: "fuma", width: 11 },
      { header: "Alcohol", key: "alcohol", width: 15 },
      { header: "Practica deporte", key: "deporte", width: 15 },
      { header: "Cuál deporte", key: "cualDeporte", width: 18 },
      { header: "Tiempo libre", key: "tiempoLibre", width: 32 },
      { header: "Medio transporte", key: "transporte", width: 16 },
      { header: "Tiempo desplazamiento", key: "desplazamiento", width: 20 },
      { header: "Acepta política datos", key: "politica", width: 18 },
      { header: "Firma veracidad", key: "veracidad", width: 14 },
      { header: "Fecha respuesta", key: "fechaRespuesta", width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };

    respuestas.forEach((r) => {
      sheet.addRow({
        nombre: r.nombreCompleto,
        documento: r.numeroDocumento,
        fechaNacimiento: fecha(r.fechaNacimiento),
        genero: legible(r.genero),
        estadoCivil: legible(r.estadoCivil),
        municipio: r.municipioResidencia,
        estrato: r.estrato,
        tipoVivienda: legible(r.tipoVivienda),
        personasACargo: legible(r.personasACargo),
        escolaridad: legible(r.escolaridad),
        estudiando: siNo(r.estudiandoActualmente),
        carrera: r.carreraActual || "",
        area: legible(r.areaTrabajo),
        cargo: r.cargo,
        contrato: legible(r.tipoContrato),
        fechaIngreso: fecha(r.fechaIngresoSirius),
        turno: legible(r.turnoTrabajo),
        otroEmpleo: siNo(r.otroEmpleo),
        enfCronica: siNo(r.enfermedadCronica),
        cualEnf: r.cualEnfermedadCronica || "",
        discapacidad: siNo(r.discapacidad),
        cualDisc: r.cualDiscapacidad || "",
        tratamiento: siNo(r.tratamientoMedico),
        accidentes: siNo(r.accidentesTrabajoPrevios),
        enfLaboral: siNo(r.enfermedadLaboralPrevia),
        fuma: legible(r.fuma),
        alcohol: legible(r.alcohol),
        deporte: siNo(r.practicaDeporte),
        cualDeporte: r.cualDeporte || "",
        tiempoLibre: (r.tiempoLibre || []).map((t) => legible(t)).join(", "),
        transporte: legible(r.medioTransporte),
        desplazamiento: legible(r.tiempoDesplazamiento),
        politica: siNo(r.aceptaPoliticaDatos),
        veracidad: siNo(r.firmaVeracidad),
        fechaRespuesta: fecha(r.createdTime),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const nombreArchivo = `sociodemografico_${campana.nombre.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, "").replace(/\s+/g, "_")}.xlsx`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/socio/campanas/:id/exportar] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al exportar respuestas",
      },
      { status: 500 }
    );
  }
}
