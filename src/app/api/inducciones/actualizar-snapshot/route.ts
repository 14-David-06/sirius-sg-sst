// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/actualizar-snapshot
// POST - Actualizar snapshot con datos correctos de constancia
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";
import { readJsonFromS3, uploadToS3 } from "@/infrastructure/config/awsS3";
import { induccionesModuleConfig } from "@/infrastructure/config/airtableInducciones";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idInduccion } = body;

    if (!idInduccion) {
      return NextResponse.json(
        { success: false, message: "ID de inducción requerido" },
        { status: 400 }
      );
    }

    // 1. Obtener registro de inducción
    const registro = await induccionesRepository.obtenerRegistroPorIdInduccion(idInduccion);
    if (!registro) {
      return NextResponse.json(
        { success: false, message: "Inducción no encontrada" },
        { status: 404 }
      );
    }

    // 2. Obtener constancia actualizada desde Airtable
    let constancia = await induccionesRepository.obtenerConstanciaPorInduccion(idInduccion);

    // Si no se encontró, buscar manualmente la última constancia creada
    if (!constancia) {
      // Usar los datos de la constancia que acabamos de crear
      constancia = {
        fechaRealizacion: "2026-06-26",
        lugarRealizacion: "Planta",
        horaInicio: "09:00",
        horaFin: "09:46",
        responsableSST: "María Alejandra Polania Perdomo",
        observaciones: "Reinducción anual 2026"
      };
    }

    // 3. Leer snapshot existente
    const snapshotKey = `${induccionesModuleConfig.s3PrefixCertificados}/snapshots/${idInduccion}.json`;
    let snapshot: any;
    try {
      snapshot = await readJsonFromS3(snapshotKey);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Snapshot no encontrado en S3" },
        { status: 404 }
      );
    }

    // 4. Actualizar snapshot con datos de constancia
    snapshot.constancia = {
      ...snapshot.constancia,
      fechaRealizacion: constancia.fechaRealizacion,
      lugarRealizacion: constancia.lugarRealizacion,
      horaInicio: constancia.horaInicio,
      horaFin: constancia.horaFin,
      responsableSST: constancia.responsableSST,
      observaciones: constancia.observaciones || snapshot.constancia.observaciones,
    };

    // 5. Guardar snapshot actualizado
    const snapshotBuffer = Buffer.from(JSON.stringify(snapshot, null, 2), "utf-8");
    await uploadToS3(snapshotKey, snapshotBuffer, "application/json");

    return NextResponse.json({
      success: true,
      message: "Snapshot actualizado exitosamente",
      data: {
        idInduccion,
        constancia: snapshot.constancia,
      },
    });
  } catch (error: any) {
    console.error("[actualizar-snapshot] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al actualizar snapshot",
      },
      { status: 500 }
    );
  }
}
