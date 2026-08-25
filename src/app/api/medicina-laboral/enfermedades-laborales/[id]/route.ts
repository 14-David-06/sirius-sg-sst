// ══════════════════════════════════════════════════════════
// GET    /api/medicina-laboral/enfermedades-laborales/[id]  — Obtener enfermedad laboral
// PUT    /api/medicina-laboral/enfermedades-laborales/[id]  — Actualizar enfermedad laboral
// DELETE /api/medicina-laboral/enfermedades-laborales/[id]  — Eliminar enfermedad laboral
// ══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import {
  errorServidor,
  esFechaValida,
  jsonError,
  jsonOk,
  validarCatalogo,
  verificarSesion,
} from "@/lib/medicina-laboral/handlers";
import {
  actualizarEnfermedadLaboral,
  eliminarEnfermedadLaboral,
  listarEnfermedadesLaborales,
} from "@/lib/medicina-laboral/repository";
import {
  ESTADOS_ENFERMEDAD_LABORAL,
  type CrearEnfermedadLaboralPayload,
} from "@/lib/medicina-laboral/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    const enfermedades = await listarEnfermedadesLaborales({});
    const enfermedad = enfermedades.find((e) => e.recordId === id);

    if (!enfermedad) {
      return jsonError("Enfermedad laboral no encontrada", 404);
    }
    return jsonOk(enfermedad);
  } catch (e) {
    return errorServidor("obtener la enfermedad laboral", e);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<CrearEnfermedadLaboralPayload>;

    // Validar catálogo si viene
    const errEstado = validarCatalogo(
      "estado",
      body.estado,
      ESTADOS_ENFERMEDAD_LABORAL
    );
    if (errEstado) return jsonError(errEstado);

    // Validar fechas si vienen
    if (body.fechaDiagnostico && !esFechaValida(body.fechaDiagnostico)) {
      return jsonError("Fecha de diagnóstico inválida (formato YYYY-MM-DD)");
    }
    if (body.fechaInicioSintomas && !esFechaValida(body.fechaInicioSintomas)) {
      return jsonError(
        "Fecha de inicio de síntomas inválida (formato YYYY-MM-DD)"
      );
    }
    if (body.fechaCalificacion && !esFechaValida(body.fechaCalificacion)) {
      return jsonError("Fecha de calificación inválida (formato YYYY-MM-DD)");
    }
    if (
      body.fechaEstructuracion &&
      !esFechaValida(body.fechaEstructuracion)
    ) {
      return jsonError(
        "Fecha de estructuración inválida (formato YYYY-MM-DD)"
      );
    }

    // Validar PCL si viene
    if (body.pcl !== undefined && (body.pcl < 0 || body.pcl > 100)) {
      return jsonError("El PCL debe estar entre 0 y 100");
    }

    await actualizarEnfermedadLaboral(id, body);

    const enfermedades = await listarEnfermedadesLaborales({});
    const enfermedadActualizada = enfermedades.find((e) => e.recordId === id);

    return jsonOk(enfermedadActualizada);
  } catch (e) {
    return errorServidor("actualizar la enfermedad laboral", e);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const noAutorizado = await verificarSesion(request);
  if (noAutorizado) return noAutorizado;

  try {
    const { id } = await context.params;
    await eliminarEnfermedadLaboral(id);
    return jsonOk({ message: "Enfermedad laboral eliminada correctamente" });
  } catch (e) {
    return errorServidor("eliminar la enfermedad laboral", e);
  }
}
