// ══════════════════════════════════════════════════════════
// POST /api/sgsst/vehicular/vehiculos — Registrar nuevo vehículo
// Validaciones: formato de placa, existencia de colaborador
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";
import { airtableConfig } from "@/infrastructure/config/airtable";

const TIPOS_VEHICULO = ["Motocicleta", "Automóvil", "Camioneta", "Camión", "Bicicleta", "Otro"];
const TIPOS_PROPIETARIO = ["Colaborador", "Tercero", "Empresa"];

/**
 * Valida formato de placa colombiana
 * Automóviles: ABC123 (3 letras + 3 números)
 * Motos: ABC12D (3 letras + 2 números + 1 letra)
 */
function validarPlaca(placa: string, tipoVehiculo: string): boolean {
  const placaUpper = placa.toUpperCase().trim();

  if (tipoVehiculo === "Motocicleta") {
    // Formato moto: ABC12D
    return /^[A-Z]{3}\d{2}[A-Z]$/.test(placaUpper);
  } else if (["Automóvil", "Camioneta", "Camión"].includes(tipoVehiculo)) {
    // Formato auto: ABC123
    return /^[A-Z]{3}\d{3}$/.test(placaUpper);
  }

  // Otros tipos: permitir cualquier formato alfanumérico
  return /^[A-Z0-9]{4,8}$/.test(placaUpper);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      idPersonalCore,
      placa,
      tipoVehiculo,
      propietarioNombre,
      propietarioTipo,
      propietarioDocumento,
      observaciones,
    } = body;

    // Validaciones
    if (!idPersonalCore || !idPersonalCore.startsWith("SIRIUS-PER-")) {
      return NextResponse.json(
        { error: "ID de personal inválido. Formato esperado: SIRIUS-PER-XXXX" },
        { status: 400 }
      );
    }

    if (!placa || !tipoVehiculo || !propietarioNombre || !propietarioTipo) {
      return NextResponse.json(
        { error: "Campos requeridos: placa, tipoVehiculo, propietarioNombre, propietarioTipo" },
        { status: 400 }
      );
    }

    if (!TIPOS_VEHICULO.includes(tipoVehiculo)) {
      return NextResponse.json(
        { error: `Tipo de vehículo inválido. Valores permitidos: ${TIPOS_VEHICULO.join(", ")}` },
        { status: 400 }
      );
    }

    if (!TIPOS_PROPIETARIO.includes(propietarioTipo)) {
      return NextResponse.json(
        { error: `Tipo de propietario inválido. Valores permitidos: ${TIPOS_PROPIETARIO.join(", ")}` },
        { status: 400 }
      );
    }

    if (!validarPlaca(placa, tipoVehiculo)) {
      return NextResponse.json(
        {
          error:
            tipoVehiculo === "Motocicleta"
              ? "Formato de placa inválido para moto. Formato esperado: ABC12D"
              : "Formato de placa inválido para vehículo. Formato esperado: ABC123",
        },
        { status: 400 }
      );
    }

    // Verificar que el colaborador existe en Nómina Core
    const personalUrl = `${airtableConfig.baseUrl}/${airtableConfig.baseId}/${airtableConfig.personalTableId}`;
    const PF = airtableConfig.personalFields;
    const filterFormula = `{${PF.ID_EMPLEADO}} = '${idPersonalCore}'`;

    const personalResponse = await fetch(
      `${personalUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`,
      {
        headers: {
          Authorization: `Bearer ${airtableConfig.apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!personalResponse.ok || (await personalResponse.json()).records.length === 0) {
      return NextResponse.json(
        { error: "Colaborador no encontrado en Nómina Core" },
        { status: 404 }
      );
    }

    // Verificar que no exista otra placa activa con el mismo número
    const vehConfig = airtableSGSSTConfig;
    const vehUrl = getSGSSTUrl(vehConfig.vehiculosTableId);
    const headers = getSGSSTHeaders();

    const placaUpper = placa.toUpperCase().trim();
    const checkPlacaFormula = `AND({${vehConfig.vehiculosFields.PLACA}} = '${placaUpper}', {${vehConfig.vehiculosFields.ACTIVO}} = 1)`;

    const checkResponse = await fetch(`${vehUrl}?filterByFormula=${encodeURIComponent(checkPlacaFormula)}`, {
      headers,
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.records && checkData.records.length > 0) {
        return NextResponse.json(
          { error: `La placa ${placaUpper} ya está registrada para otro vehículo activo` },
          { status: 409 }
        );
      }
    }

    // Crear vehículo en Airtable
    const now = new Date().toISOString();
    const payload = {
      fields: {
        [vehConfig.vehiculosFields.ID_PERSONAL_CORE]: idPersonalCore,
        [vehConfig.vehiculosFields.PLACA]: placaUpper,
        [vehConfig.vehiculosFields.TIPO_VEHICULO]: tipoVehiculo,
        [vehConfig.vehiculosFields.PROPIETARIO_NOMBRE]: propietarioNombre,
        [vehConfig.vehiculosFields.PROPIETARIO_TIPO]: propietarioTipo,
        [vehConfig.vehiculosFields.PROPIETARIO_DOCUMENTO]: propietarioDocumento || "",
        [vehConfig.vehiculosFields.ACTIVO]: true,
        [vehConfig.vehiculosFields.OBSERVACIONES]: observaciones || "",
        [vehConfig.vehiculosFields.CREATED_AT]: now,
        [vehConfig.vehiculosFields.UPDATED_AT]: now,
      },
    };

    const createResponse = await fetch(vehUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error("Error creando vehículo:", errorData);
      return NextResponse.json(
        { error: "Error al crear vehículo en Airtable" },
        { status: createResponse.status }
      );
    }

    const createdVehiculo = await createResponse.json();

    return NextResponse.json({
      success: true,
      message: "Vehículo registrado exitosamente",
      vehiculo: {
        id: createdVehiculo.id,
        ...createdVehiculo.fields,
      },
    });
  } catch (error) {
    console.error("Error en POST /api/sgsst/vehicular/vehiculos:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
