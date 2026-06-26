// ══════════════════════════════════════════════════════════
// PUT /api/sgsst/vehicular/vehiculos/:id — Actualizar vehículo
// DELETE /api/sgsst/vehicular/vehiculos/:id — Desactivar (soft delete)
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

const TIPOS_VEHICULO = ["Motocicleta", "Automóvil", "Camioneta", "Camión", "Bicicleta", "Otro"];
const TIPOS_PROPIETARIO = ["Colaborador", "Tercero", "Empresa"];

export async function PUT(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const {
      placa,
      tipoVehiculo,
      propietarioNombre,
      propietarioTipo,
      propietarioDocumento,
      activo,
      observaciones,
    } = body;

    const vehConfig = airtableSGSSTConfig;
    const vehUrl = `${getSGSSTUrl(vehConfig.vehiculosTableId)}/${id}`;
    const headers = getSGSSTHeaders();

    // Construir payload solo con campos proporcionados
    const fields: Record<string, any> = {};

    if (placa !== undefined) {
      fields[vehConfig.vehiculosFields.PLACA] = placa.toUpperCase().trim();
    }
    if (tipoVehiculo !== undefined) {
      if (!TIPOS_VEHICULO.includes(tipoVehiculo)) {
        return NextResponse.json(
          { error: `Tipo de vehículo inválido. Valores permitidos: ${TIPOS_VEHICULO.join(", ")}` },
          { status: 400 }
        );
      }
      fields[vehConfig.vehiculosFields.TIPO_VEHICULO] = tipoVehiculo;
    }
    if (propietarioNombre !== undefined) {
      fields[vehConfig.vehiculosFields.PROPIETARIO_NOMBRE] = propietarioNombre;
    }
    if (propietarioTipo !== undefined) {
      if (!TIPOS_PROPIETARIO.includes(propietarioTipo)) {
        return NextResponse.json(
          { error: `Tipo de propietario inválido. Valores permitidos: ${TIPOS_PROPIETARIO.join(", ")}` },
          { status: 400 }
        );
      }
      fields[vehConfig.vehiculosFields.PROPIETARIO_TIPO] = propietarioTipo;
    }
    if (propietarioDocumento !== undefined) {
      fields[vehConfig.vehiculosFields.PROPIETARIO_DOCUMENTO] = propietarioDocumento;
    }
    if (activo !== undefined) {
      fields[vehConfig.vehiculosFields.ACTIVO] = activo;
    }
    if (observaciones !== undefined) {
      fields[vehConfig.vehiculosFields.OBSERVACIONES] = observaciones;
    }

    fields[vehConfig.vehiculosFields.UPDATED_AT] = new Date().toISOString();

    const updateResponse = await fetch(vehUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error("Error actualizando vehículo:", errorData);
      return NextResponse.json(
        { error: "Error al actualizar vehículo" },
        { status: updateResponse.status }
      );
    }

    const updatedVehiculo = await updateResponse.json();

    return NextResponse.json({
      success: true,
      message: "Vehículo actualizado exitosamente",
      vehiculo: {
        id: updatedVehiculo.id,
        ...updatedVehiculo.fields,
      },
    });
  } catch (error) {
    console.error("Error en PUT /api/sgsst/vehicular/vehiculos/:id:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;

    const vehConfig = airtableSGSSTConfig;
    const vehUrl = `${getSGSSTUrl(vehConfig.vehiculosTableId)}/${id}`;
    const headers = getSGSSTHeaders();

    // Soft delete: marcar como inactivo
    const payload = {
      fields: {
        [vehConfig.vehiculosFields.ACTIVO]: false,
        [vehConfig.vehiculosFields.UPDATED_AT]: new Date().toISOString(),
      },
    };

    const deleteResponse = await fetch(vehUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      console.error("Error desactivando vehículo:", errorData);
      return NextResponse.json(
        { error: "Error al desactivar vehículo" },
        { status: deleteResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vehículo desactivado exitosamente",
    });
  } catch (error) {
    console.error("Error en DELETE /api/sgsst/vehicular/vehiculos/:id:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
