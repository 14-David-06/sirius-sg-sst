// ══════════════════════════════════════════════════════════
// GET /api/sgsst/vehicular/:id_personal — Vehículo(s) por colaborador
// Consulta completa: vehículos, documentos y licencia de un colaborador
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";
import { airtableConfig } from "@/infrastructure/config/airtable";

interface Params {
  params: Promise<{
    id_personal: string;
  }>;
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const { id_personal } = await context.params;

    if (!id_personal || !id_personal.startsWith("SIRIUS-PER-")) {
      return NextResponse.json(
        { error: "ID de personal inválido. Formato esperado: SIRIUS-PER-XXXX" },
        { status: 400 }
      );
    }

    const vehConfig = airtableSGSSTConfig;
    const headers = getSGSSTHeaders();

    // 1. Buscar vehículos del colaborador
    const vehUrl = getSGSSTUrl(vehConfig.vehiculosTableId);
    const filterFormula = `{${vehConfig.vehiculosFields.ID_PERSONAL_CORE}} = '${id_personal}'`;

    const vehResponse = await fetch(`${vehUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
      headers,
    });

    if (!vehResponse.ok) {
      return NextResponse.json(
        { error: "Error al consultar vehículos" },
        { status: vehResponse.status }
      );
    }

    const vehData = await vehResponse.json();
    const vehiculos = vehData.records || [];

    // 2. Buscar licencia del colaborador
    const licUrl = getSGSSTUrl(vehConfig.licenciasConduccionTableId);
    const licFilterFormula = `{${vehConfig.licenciasConduccionFields.ID_PERSONAL_CORE}} = '${id_personal}'`;

    const licResponse = await fetch(`${licUrl}?filterByFormula=${encodeURIComponent(licFilterFormula)}`, {
      headers,
    });

    const licData = licResponse.ok ? await licResponse.json() : { records: [] };
    const licencia = licData.records?.[0] || null;

    // 3. Para cada vehículo, obtener sus documentos
    const vehiculosConDocumentos = await Promise.all(
      vehiculos.map(async (veh: any) => {
        const vehiculoId = veh.id;

        // Buscar documentos del vehículo
        const docUrl = getSGSSTUrl(vehConfig.documentosVehicularesTableId);
        const docFilterFormula = `FIND('${vehiculoId}', ARRAYJOIN({${vehConfig.documentosVehicularesFields.VEHICULO_LINK}})) > 0`;

        const docResponse = await fetch(`${docUrl}?filterByFormula=${encodeURIComponent(docFilterFormula)}`, {
          headers,
        });

        const docData = docResponse.ok ? await docResponse.json() : { records: [] };
        const documentos = docData.records || [];

        const soat = documentos.find(
          (d: any) => d.fields[vehConfig.documentosVehicularesFields.TIPO_DOCUMENTO] === "SOAT"
        );
        const tecnomecanica = documentos.find(
          (d: any) => d.fields[vehConfig.documentosVehicularesFields.TIPO_DOCUMENTO] === "Tecnomecánica"
        );

        return {
          id: vehiculoId,
          placa: veh.fields[vehConfig.vehiculosFields.PLACA],
          tipoVehiculo: veh.fields[vehConfig.vehiculosFields.TIPO_VEHICULO],
          propietarioNombre: veh.fields[vehConfig.vehiculosFields.PROPIETARIO_NOMBRE],
          propietarioTipo: veh.fields[vehConfig.vehiculosFields.PROPIETARIO_TIPO],
          propietarioDocumento: veh.fields[vehConfig.vehiculosFields.PROPIETARIO_DOCUMENTO],
          activo: veh.fields[vehConfig.vehiculosFields.ACTIVO],
          observaciones: veh.fields[vehConfig.vehiculosFields.OBSERVACIONES],
          soat: soat
            ? {
                id: soat.id,
                numeroDocumento: soat.fields[vehConfig.documentosVehicularesFields.NUMERO_DOCUMENTO],
                entidadEmisora: soat.fields[vehConfig.documentosVehicularesFields.ENTIDAD_EMISORA],
                fechaExpedicion: soat.fields[vehConfig.documentosVehicularesFields.FECHA_EXPEDICION],
                fechaVencimiento: soat.fields[vehConfig.documentosVehicularesFields.FECHA_VENCIMIENTO],
                urlDocumento: soat.fields[vehConfig.documentosVehicularesFields.URL_DOCUMENTO],
              }
            : null,
          tecnomecanica: tecnomecanica
            ? {
                id: tecnomecanica.id,
                numeroDocumento: tecnomecanica.fields[vehConfig.documentosVehicularesFields.NUMERO_DOCUMENTO],
                entidadEmisora: tecnomecanica.fields[vehConfig.documentosVehicularesFields.ENTIDAD_EMISORA],
                fechaExpedicion: tecnomecanica.fields[vehConfig.documentosVehicularesFields.FECHA_EXPEDICION],
                fechaVencimiento: tecnomecanica.fields[vehConfig.documentosVehicularesFields.FECHA_VENCIMIENTO],
                urlDocumento: tecnomecanica.fields[vehConfig.documentosVehicularesFields.URL_DOCUMENTO],
              }
            : null,
        };
      })
    );

    // 4. Resolver datos del colaborador desde Nómina Core
    let colaborador = { nombre: "Desconocido", area: "Sin área", correo: "" };
    try {
      const personalUrl = `${airtableConfig.baseUrl}/${airtableConfig.baseId}/${airtableConfig.personalTableId}`;
      const PF = airtableConfig.personalFields;
      const filterFormula = `{${PF.ID_EMPLEADO}} = '${id_personal}'`;

      const personalResponse = await fetch(
        `${personalUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`,
        {
          headers: {
            Authorization: `Bearer ${airtableConfig.apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (personalResponse.ok) {
        const personalData = await personalResponse.json();
        if (personalData.records && personalData.records.length > 0) {
          const record = personalData.records[0].fields;
          colaborador = {
            nombre: record[PF.NOMBRE_COMPLETO] || "Sin nombre",
            area: record[PF.AREAS]?.[0] || "Sin área",
            correo: record[PF.CORREO] || "",
          };
        }
      }
    } catch (error) {
      console.error("Error resolviendo colaborador:", error);
    }

    return NextResponse.json({
      success: true,
      idPersonalCore: id_personal,
      colaborador,
      vehiculos: vehiculosConDocumentos,
      licencia: licencia
        ? {
            id: licencia.id,
            numeroLicencia: licencia.fields[vehConfig.licenciasConduccionFields.NUMERO_LICENCIA],
            categoria: licencia.fields[vehConfig.licenciasConduccionFields.CATEGORIA],
            fechaExpedicion: licencia.fields[vehConfig.licenciasConduccionFields.FECHA_EXPEDICION],
            fechaVencimiento: licencia.fields[vehConfig.licenciasConduccionFields.FECHA_VENCIMIENTO],
            organismoTransito: licencia.fields[vehConfig.licenciasConduccionFields.ORGANISMO_TRANSITO],
            urlLicencia: licencia.fields[vehConfig.licenciasConduccionFields.URL_LICENCIA],
          }
        : null,
    });
  } catch (error) {
    console.error("Error en GET /api/sgsst/vehicular/:id_personal:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
