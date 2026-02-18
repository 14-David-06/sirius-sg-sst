import { NextRequest, NextResponse } from "next/server";
import {
  airtableInsumosConfig,
  getInsumosUrl,
  getInsumosHeaders,
} from "@/infrastructure/config/airtableInsumos";

interface CreateMovimientoBody {
  insumoId: string;        // Record ID del insumo (linked record)
  cantidad: number;
  tipoMovimiento: "Entrada" | "Salida" | "Ajuste";
  nombre: string;          // Descripción del movimiento
  responsable: string;     // ID Empleado del responsable (ej: "EMP-001")
}

/**
 * POST /api/insumos/movimientos
 * Crea un nuevo registro de movimiento en la tabla "Movimientos Insumos".
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateMovimientoBody = await request.json();

    // Validaciones
    if (!body.insumoId || !body.cantidad || !body.tipoMovimiento || !body.nombre || !body.responsable) {
      return NextResponse.json(
        { success: false, message: "Campos requeridos: insumoId, cantidad, tipoMovimiento, nombre, responsable" },
        { status: 400 }
      );
    }

    if (body.cantidad <= 0) {
      return NextResponse.json(
        { success: false, message: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const validTipos = ["Entrada", "Salida", "Ajuste"];
    if (!validTipos.includes(body.tipoMovimiento)) {
      return NextResponse.json(
        { success: false, message: "Tipo de movimiento inválido" },
        { status: 400 }
      );
    }

    const { movimientosTableId, movimientosFields } = airtableInsumosConfig;
    const url = getInsumosUrl(movimientosTableId);
    const headers = getInsumosHeaders();

    // Construir campos del registro usando field IDs
    const fields: Record<string, unknown> = {
      [movimientosFields.NOMBRE]: body.nombre,
      [movimientosFields.CANTIDAD]: body.cantidad,
      [movimientosFields.TIPO]: body.tipoMovimiento,
      [movimientosFields.INSUMO]: [body.insumoId],
      [movimientosFields.RESPONSABLE]: body.responsable,
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        records: [{ fields }],
        typecast: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Airtable create movement error:", response.status, errorData);
      return NextResponse.json(
        { success: false, message: "Error al registrar el movimiento en Airtable" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const created = data.records?.[0];

    return NextResponse.json({
      success: true,
      message: "Movimiento registrado exitosamente",
      data: {
        id: created.id,
        codigo: created.fields[movimientosFields.CODIGO] || "",
        nombre: created.fields[movimientosFields.NOMBRE] || "",
        cantidad: created.fields[movimientosFields.CANTIDAD],
        tipo: created.fields[movimientosFields.TIPO],
        creada: created.fields[movimientosFields.CREADA] || created.createdTime,
      },
    });
  } catch (error) {
    console.error("Error creating movement:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
