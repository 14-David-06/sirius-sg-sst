import { NextRequest, NextResponse } from "next/server";
import { AirtableRespuestaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableRespuestaRepository";

const respuestasRepo = new AirtableRespuestaRepository();

/**
 * GET /api/socio/campanas/:id/respuestas
 * Obtiene todas las respuestas detalladas de una campaña
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campanaId } = await params;

    const respuestas = await respuestasRepo.listarPorCampana(campanaId);

    // Formatear respuestas para vista de tabla
    const respuestasFormateadas = respuestas.map((r) => ({
      id: r.id,
      nombreCompleto: r.nombreCompleto,
      numeroDocumento: r.numeroDocumento,
      edad: calcularEdad(r.fechaNacimiento),
      genero: r.genero,
      estadoCivil: r.estadoCivil,
      municipio: r.municipioResidencia,
      estrato: r.estrato,
      tipoVivienda: r.tipoVivienda,
      personasACargo: r.personasACargo,
      escolaridad: r.escolaridad,
      estudiandoActualmente: r.estudiandoActualmente,
      carreraActual: r.carreraActual,
      areaTrabajo: r.areaTrabajo,
      cargo: r.cargo,
      tipoContrato: r.tipoContrato,
      antiguedad: calcularAntiguedad(r.fechaIngresoSirius),
      turnoTrabajo: r.turnoTrabajo,
      otroEmpleo: r.otroEmpleo,
      descripcionOtroEmpleo: r.descripcionOtroEmpleo,
      enfermedadCronica: r.enfermedadCronica,
      cualEnfermedadCronica: r.cualEnfermedadCronica,
      discapacidad: r.discapacidad,
      cualDiscapacidad: r.cualDiscapacidad,
      tratamientoMedico: r.tratamientoMedico,
      descripcionTratamiento: r.descripcionTratamiento,
      accidentesTrabajoPrevios: r.accidentesTrabajoPrevios,
      descripcionAccidentes: r.descripcionAccidentes,
      enfermedadLaboralPrevia: r.enfermedadLaboralPrevia,
      descripcionEnfLaboral: r.descripcionEnfLaboral,
      fuma: r.fuma,
      alcohol: r.alcohol,
      practicaDeporte: r.practicaDeporte,
      cualDeporte: r.cualDeporte,
      tiempoLibre: r.tiempoLibre,
      descripcionOtroTiempoLibre: r.descripcionOtroTiempoLibre,
      medioTransporte: r.medioTransporte,
      tiempoDesplazamiento: r.tiempoDesplazamiento,
      fechaRespuesta: r.createdTime,
    }));

    return NextResponse.json({
      success: true,
      data: respuestasFormateadas,
    });
  } catch (error: unknown) {
    console.error("[GET /api/socio/campanas/:id/respuestas] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al obtener respuestas",
      },
      { status: 500 }
    );
  }
}

function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }
  return edad;
}

function calcularAntiguedad(fechaIngreso: Date): string {
  const hoy = new Date();
  const diff = hoy.getTime() - fechaIngreso.getTime();
  const años = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  const meses = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));

  if (años > 0) {
    return `${años} año${años > 1 ? "s" : ""}${meses > 0 ? ` y ${meses} mes${meses > 1 ? "es" : ""}` : ""}`;
  }
  return `${meses} mes${meses > 1 ? "es" : ""}`;
}
