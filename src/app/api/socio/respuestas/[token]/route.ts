import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AirtableRespuestaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableRespuestaRepository";
import type { GuardarRespuestaDTO } from "@/modules/sociodemografico/domain/entities";

// ─── Schema de validación ───

const guardarRespuestaSchema = z.object({
  // Sección 1: Datos personales
  nombreCompleto: z.string().min(3),
  numeroDocumento: z.string().min(6),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genero: z.enum(["Masculino", "Femenino", "No_binario", "Prefiero_no_decir"]),
  estadoCivil: z.enum(["Soltero", "Casado", "Union_libre", "Divorciado", "Viudo"]),

  // Sección 2: Vivienda
  municipioResidencia: z.string().min(3),
  estrato: z.enum(["1", "2", "3", "4", "5", "6"]),
  tipoVivienda: z.enum(["Propia", "Arrendada", "Familiar"]),
  personasACargo: z.enum(["Ninguna", "1", "2", "3", "4_o_mas"]),

  // Sección 3: Educación
  escolaridad: z.enum(["Primaria", "Bachillerato", "Tecnico_Tecnologo", "Profesional", "Posgrado"]),
  estudiandoActualmente: z.boolean(),
  carreraActual: z.string().optional(),

  // Sección 4: Trabajo
  areaTrabajo: z.enum(["Pirolisis", "Laboratorio", "Bodega", "Administrativo"]),
  cargo: z.string().min(3),
  tipoContrato: z.enum(["Termino_fijo", "Termino_indefinido", "Prestacion_servicios", "Aprendiz"]),
  fechaIngresoSirius: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  turnoTrabajo: z.enum(["Mañana", "Tarde", "Noche", "Rotativo"]),
  otroEmpleo: z.boolean(),

  // Sección 5: Salud
  enfermedadCronica: z.boolean(),
  cualEnfermedadCronica: z.string().optional(),
  discapacidad: z.boolean(),
  cualDiscapacidad: z.string().optional(),
  tratamientoMedico: z.boolean(),
  accidentesTrabajoPrevios: z.boolean(),
  enfermedadLaboralPrevia: z.boolean(),

  // Sección 6: Hábitos
  fuma: z.enum(["Si", "No", "Exfumador"]),
  alcohol: z.enum(["Nunca", "Ocasionalmente", "Frecuentemente"]),
  practicaDeporte: z.boolean(),
  cualDeporte: z.string().optional(),
  tiempoLibre: z.array(
    z.enum([
      "Familia_amigos",
      "Deportes",
      "Leer",
      "Musica",
      "Videojuegos",
      "Series_peliculas",
      "Actividades_religiosas",
      "Otro",
    ])
  ),

  // Sección 7: Transporte
  medioTransporte: z.enum(["A_pie", "Bus_Transmilenio", "Bicicleta", "Moto", "Carro_particular", "Ruta_empresa"]),
  tiempoDesplazamiento: z.enum(["Menos_30min", "30_60min", "1_2horas", "Mas_2horas"]),

  // Consentimiento
  aceptaPoliticaDatos: z.boolean().refine((val) => val === true, {
    message: "Debe aceptar la política de datos",
  }),
  firmaVeracidad: z.boolean().refine((val) => val === true, {
    message: "Debe firmar la veracidad de la información",
  }),
});

const respuestasRepo = new AirtableRespuestaRepository();

/**
 * POST /api/socio/respuestas/:token
 * Guardar respuesta de encuesta (endpoint público, sin autenticación)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await request.json();

    // Validar datos
    const validacion = guardarRespuestaSchema.safeParse(body);
    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Datos inválidos",
          detalles: validacion.error.issues,
        },
        { status: 400 }
      );
    }

    const datos = validacion.data;

    // Preparar DTO
    const dto: GuardarRespuestaDTO = {
      token,
      ...datos,
    };

    // Guardar respuesta
    const respuesta = await respuestasRepo.guardar(dto);

    return NextResponse.json({
      success: true,
      data: { id: respuesta.id },
      message: "Encuesta enviada exitosamente. Gracias por su participación.",
    });
  } catch (error: any) {
    console.error("[POST /api/socio/respuestas/:token] Error:", error);

    // Errores conocidos
    if (error.message === "Token inválido") {
      return NextResponse.json(
        {
          success: false,
          error: "El link de acceso no es válido",
        },
        { status: 404 }
      );
    }

    if (error.message === "Esta encuesta ya fue respondida") {
      return NextResponse.json(
        {
          success: false,
          error: "Esta encuesta ya fue respondida anteriormente",
        },
        { status: 400 }
      );
    }

    if (error.message === "Esta campaña ya está cerrada") {
      return NextResponse.json(
        {
          success: false,
          error: "Esta campaña ya no está disponible",
        },
        { status: 400 }
      );
    }

    // Error genérico
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al guardar la encuesta",
      },
      { status: 500 }
    );
  }
}
