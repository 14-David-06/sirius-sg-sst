// ══════════════════════════════════════════════════════════
// API Route: /api/inducciones/test-relacion
// POST - Probar creación de relaciones
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { induccionesRepository } from "@/infrastructure/repositories/airtableInduccionesRepository";
import { nominaRepository } from "@/infrastructure/repositories/airtableNominaRepository";
import { crearInduccion } from "@/core/use-cases/inducciones";
import { generarTokenFirma } from "@/core/use-cases/inducciones";
import type { CrearInduccionDTO } from "@/shared/types/inducciones";

// POST /api/inducciones/test-relacion
export async function POST(request: NextRequest) {
  try {
    // Crear una inducción de prueba
    const dto: CrearInduccionDTO = {
      idEmpleadoCore: "SIRIUS-PER-0001",
      tipo: "Induccion",
      fechaRealizacion: "2026-07-02",
      responsableSST: "María Alejandra Polania Perdomo",
      observaciones: "Inducción de prueba - validación de relaciones",
    };

    // Obtener datos del empleado
    const empleado = await nominaRepository.obtenerEmpleadoPorId(dto.idEmpleadoCore);

    if (!empleado) {
      return NextResponse.json(
        {
          success: false,
          message: "Empleado no encontrado",
        },
        { status: 404 }
      );
    }

    const datosEmpleado = {
      nombreCompleto: empleado.nombreCompleto,
      numeroDocumento: empleado.numeroDocumento,
      cargo: empleado.cargo,
    };

    // 1. Crear el registro
    console.log('[TEST] Paso 1: Creando inducción...');
    const registro = await crearInduccion(dto, datosEmpleado);
    console.log('[TEST] Inducción creada:', registro.idInduccion);

    // 2. Generar token (esto debe crear la relación)
    console.log('[TEST] Paso 2: Generando token...');
    const token = await generarTokenFirma(registro.idInduccion, dto.idEmpleadoCore);
    console.log('[TEST] Token generado:', token.tokenId);

    // 3. Verificar que la relación se creó
    console.log('[TEST] Paso 3: Verificando relación...');
    const registroActualizado = await induccionesRepository.obtenerRegistroPorIdInduccion(registro.idInduccion);

    return NextResponse.json({
      success: true,
      data: {
        registro: {
          id: registro.id,
          idInduccion: registro.idInduccion,
        },
        token: {
          id: token.id,
          tokenId: token.tokenId,
          induccionId: token.induccionId,
        },
        relacionVerificada: {
          mensaje: "Si el token aparece relacionado en Airtable, la corrección funcionó",
          instrucciones: [
            "1. Ve a Airtable → tabla ind_tokens_firma",
            `2. Busca el token ${token.tokenId}`,
            `3. Verifica que el campo 'Registros' muestre ${registro.idInduccion}`,
          ],
        },
      },
      message: "Inducción y token creados. Verifica la relación en Airtable.",
    });
  } catch (error: any) {
    console.error("Error en test de relación:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error en test de relación",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
