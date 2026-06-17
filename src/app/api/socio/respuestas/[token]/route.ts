import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AirtableRespuestaRepository } from "@/modules/sociodemografico/infrastructure/airtable/AirtableRespuestaRepository";
import type { GuardarRespuestaDTO } from "@/modules/sociodemografico/domain/entities";
import {
  MEDIOS_TRANSPORTE_VALIDOS,
  TIEMPOS_DESPLAZAMIENTO_VALIDOS,
} from "@/modules/sociodemografico/domain/entities";
import { encryptAES } from "@/lib/firmaCrypto";

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
  turnoTrabajo: z.enum(["Jornada_completa", "Media_jornada", "Rotativo", "Por_turnos"]),
  otroEmpleo: z.boolean(),
  descripcionOtroEmpleo: z.string().optional(),

  // Sección 5: Salud
  enfermedadCronica: z.boolean(),
  cualEnfermedadCronica: z.string().optional(),
  discapacidad: z.boolean(),
  cualDiscapacidad: z.string().optional(),
  tratamientoMedico: z.boolean(),
  descripcionTratamiento: z.string().optional(),
  accidentesTrabajoPrevios: z.boolean(),
  descripcionAccidentes: z.string().optional(),
  enfermedadLaboralPrevia: z.boolean(),
  descripcionEnfLaboral: z.string().optional(),

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
  descripcionOtroTiempoLibre: z.string().optional(),

  // Sección 7: Transporte
  medioTransporte: z
    .string()
    .min(1, "El medio de transporte es obligatorio")
    .refine((val) => MEDIOS_TRANSPORTE_VALIDOS.includes(val as any), {
      message: "Seleccione un medio de transporte válido de la lista",
    }),
  tiempoDesplazamiento: z
    .string()
    .min(1, "El tiempo de desplazamiento es obligatorio")
    .refine((val) => TIEMPOS_DESPLAZAMIENTO_VALIDOS.includes(val as any), {
      message: "Seleccione un tiempo de desplazamiento válido de la lista",
    }),

  // Consentimiento
  aceptaPoliticaDatos: z.boolean().refine((val) => val === true, {
    message: "Debe aceptar la política de datos",
  }),
  firmaVeracidad: z.boolean().refine((val) => val === true, {
    message: "Debe firmar la veracidad de la información",
  }),

  // Firma digital (sin cifrar - se cifrará en el servidor)
  firmaDataUrl: z.string().min(10),
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

    // DEBUG: Imprimir los valores problemáticos
    console.log("[DEBUG] medioTransporte recibido:", body.medioTransporte, "| tipo:", typeof body.medioTransporte);
    console.log("[DEBUG] tiempoDesplazamiento recibido:", body.tiempoDesplazamiento, "| tipo:", typeof body.tiempoDesplazamiento);

    // Verificar si son exactamente los valores esperados
    if (body.medioTransporte && !MEDIOS_TRANSPORTE_VALIDOS.includes(body.medioTransporte)) {
      console.error("[DEBUG] medioTransporte NO válido. Esperado uno de:", MEDIOS_TRANSPORTE_VALIDOS);
      console.error("[DEBUG] Valor recibido:", JSON.stringify(body.medioTransporte));
    }
    if (body.tiempoDesplazamiento && !TIEMPOS_DESPLAZAMIENTO_VALIDOS.includes(body.tiempoDesplazamiento)) {
      console.error("[DEBUG] tiempoDesplazamiento NO válido. Esperado uno de:", TIEMPOS_DESPLAZAMIENTO_VALIDOS);
      console.error("[DEBUG] Valor recibido:", JSON.stringify(body.tiempoDesplazamiento));
    }

    // Validar datos
    const validacion = guardarRespuestaSchema.safeParse(body);
    if (!validacion.success) {
      console.error("[POST /api/socio/respuestas/:token] Validación fallida:", validacion.error.issues);
      console.error("[DEBUG] Body completo:", JSON.stringify(body, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: "Datos inválidos",
          detalles: validacion.error.issues,
        },
        { status: 400 }
      );
    }

    const { firmaDataUrl, ...datosFormulario } = validacion.data;

    // Cifrar la firma antes de guardar
    const firmaPayload = JSON.stringify({
      signature: firmaDataUrl,
      timestamp: new Date().toISOString(),
    });
    const firmaCifrada = encryptAES(firmaPayload);

    // Preparar DTO con cast seguro (ya validado por Zod)
    const dto: GuardarRespuestaDTO = {
      token,
      ...datosFormulario,
      firma: firmaCifrada,
    } as GuardarRespuestaDTO;

    // Guardar respuesta
    const respuesta = await respuestasRepo.guardar(dto);

    return NextResponse.json({
      success: true,
      data: { id: respuesta.id },
      message: "Encuesta enviada exitosamente. Gracias por su participación.",
    });
  } catch (error: unknown) {
    console.error("[POST /api/socio/respuestas/:token] Error:", error);

    const mensaje = error instanceof Error ? error.message : "";

    // Errores conocidos
    if (mensaje === "Token inválido") {
      return NextResponse.json(
        {
          success: false,
          error: "El link de acceso no es válido",
        },
        { status: 404 }
      );
    }

    if (mensaje === "Esta encuesta ya fue respondida") {
      return NextResponse.json(
        {
          success: false,
          error: "Esta encuesta ya fue respondida anteriormente",
        },
        { status: 400 }
      );
    }

    if (mensaje === "Esta campaña ya está cerrada") {
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
        error: error instanceof Error ? error.message : "Error al guardar la encuesta",
      },
      { status: 500 }
    );
  }
}
