// ══════════════════════════════════════════════════════════
// GET /api/sgsst/vehicular — Listar vehículos con estado consolidado
// Incluye estado de documentos (SOAT, Tecnomecánica) y licencia
// ══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";
import { airtableConfig } from "@/infrastructure/config/airtable";

type EstadoDocumento = "Vigente" | "Por vencer" | "Vencido" | "Sin registro";
type TipoVehiculo = "Motocicleta" | "Automóvil" | "Camioneta" | "Camión" | "Bicicleta" | "Otro";

interface VehiculoResponse {
  id: string;
  idPersonalCore: string;
  nombreColaborador: string;
  areaColaborador: string;
  placa: string;
  tipoVehiculo: TipoVehiculo;
  propietarioNombre: string;
  propietarioTipo: string;
  activo: boolean;
  soat: {
    estado: EstadoDocumento;
    fechaVencimiento: string | null;
    diasRestantes: number | null;
  };
  tecnomecanica: {
    estado: EstadoDocumento;
    fechaVencimiento: string | null;
    diasRestantes: number | null;
  };
  licencia: {
    estado: EstadoDocumento;
    fechaVencimiento: string | null;
    diasRestantes: number | null;
    categoria: string | null;
  };
  estadoConsolidado: "ok" | "alerta" | "critico"; // ok: todo vigente, alerta: algo por vencer, critico: algo vencido
}

/**
 * Calcula días restantes y estado basado en fecha de vencimiento
 */
function calcularEstado(fechaVencimiento: string | null): {
  estado: EstadoDocumento;
  diasRestantes: number | null;
} {
  if (!fechaVencimiento) {
    return { estado: "Sin registro", diasRestantes: null };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);

  const diffTime = vencimiento.getTime() - hoy.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { estado: "Vencido", diasRestantes: diffDays };
  } else if (diffDays <= 30) {
    return { estado: "Por vencer", diasRestantes: diffDays };
  } else {
    return { estado: "Vigente", diasRestantes: diffDays };
  }
}

/**
 * Determina el estado consolidado del vehículo
 */
function determinarEstadoConsolidado(
  estadoSoat: EstadoDocumento,
  estadoTecno: EstadoDocumento,
  estadoLic: EstadoDocumento
): "ok" | "alerta" | "critico" {
  const estados = [estadoSoat, estadoTecno, estadoLic];

  if (estados.includes("Vencido")) {
    return "critico";
  }
  if (estados.includes("Por vencer")) {
    return "alerta";
  }
  return "ok";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estadoFilter = searchParams.get("estado"); // ok|alerta|critico
    const tipoVehiculoFilter = searchParams.get("tipo");
    const activoFilter = searchParams.get("activo") !== "false";

    // 1. Obtener todos los vehículos activos
    const vehConfig = airtableSGSSTConfig;
    const vehUrl = getSGSSTUrl(vehConfig.vehiculosTableId);
    const headers = getSGSSTHeaders();

    let filterFormula = `{${vehConfig.vehiculosFields.ACTIVO}} = ${activoFilter ? 1 : 0}`;

    if (tipoVehiculoFilter) {
      filterFormula += ` AND {${vehConfig.vehiculosFields.TIPO_VEHICULO}} = '${tipoVehiculoFilter}'`;
    }

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

    // 2. Obtener todos los documentos (SOAT y Tecnomecánica)
    const docUrl = getSGSSTUrl(vehConfig.documentosVehicularesTableId);
    const docResponse = await fetch(docUrl, { headers });
    const docData = docResponse.ok ? await docResponse.json() : { records: [] };
    const documentos = docData.records || [];

    // 3. Obtener todas las licencias
    const licUrl = getSGSSTUrl(vehConfig.licenciasConduccionTableId);
    const licResponse = await fetch(licUrl, { headers });
    const licData = licResponse.ok ? await licResponse.json() : { records: [] };
    const licencias = licData.records || [];

    // 4. Construir el resultado consolidado
    const resultado: VehiculoResponse[] = [];

    for (const veh of vehiculos) {
      const fields = veh.fields;
      const vehiculoId = veh.id;
      const idPersonalCore = fields[vehConfig.vehiculosFields.ID_PERSONAL_CORE] || "";

      // Buscar SOAT
      const soatDoc = documentos.find(
        (d: any) =>
          d.fields[vehConfig.documentosVehicularesFields.VEHICULO_LINK]?.[0] === vehiculoId &&
          d.fields[vehConfig.documentosVehicularesFields.TIPO_DOCUMENTO] === "SOAT"
      );

      const soatVencimiento = soatDoc?.fields[vehConfig.documentosVehicularesFields.FECHA_VENCIMIENTO] || null;
      const soatEstado = calcularEstado(soatVencimiento);

      // Buscar Tecnomecánica
      const tecnoDoc = documentos.find(
        (d: any) =>
          d.fields[vehConfig.documentosVehicularesFields.VEHICULO_LINK]?.[0] === vehiculoId &&
          d.fields[vehConfig.documentosVehicularesFields.TIPO_DOCUMENTO] === "Tecnomecánica"
      );

      const tecnoVencimiento = tecnoDoc?.fields[vehConfig.documentosVehicularesFields.FECHA_VENCIMIENTO] || null;
      const tecnoEstado = calcularEstado(tecnoVencimiento);

      // Buscar licencia del colaborador
      const licencia = licencias.find(
        (l: any) => l.fields[vehConfig.licenciasConduccionFields.ID_PERSONAL_CORE] === idPersonalCore
      );

      const licVencimiento = licencia?.fields[vehConfig.licenciasConduccionFields.FECHA_VENCIMIENTO] || null;
      const licEstado = calcularEstado(licVencimiento);
      const licCategoria = licencia?.fields[vehConfig.licenciasConduccionFields.CATEGORIA] || null;

      // Estado consolidado
      const estadoConsolidado = determinarEstadoConsolidado(
        soatEstado.estado,
        tecnoEstado.estado,
        licEstado.estado
      );

      // Aplicar filtro de estado consolidado si se especificó
      if (estadoFilter && estadoConsolidado !== estadoFilter) {
        continue;
      }

      resultado.push({
        id: vehiculoId,
        idPersonalCore,
        nombreColaborador: "⏳ Cargando...", // Se resolverá en frontend
        areaColaborador: "⏳ Cargando...",
        placa: fields[vehConfig.vehiculosFields.PLACA] || "",
        tipoVehiculo: fields[vehConfig.vehiculosFields.TIPO_VEHICULO] || "Otro",
        propietarioNombre: fields[vehConfig.vehiculosFields.PROPIETARIO_NOMBRE] || "",
        propietarioTipo: fields[vehConfig.vehiculosFields.PROPIETARIO_TIPO] || "",
        activo: fields[vehConfig.vehiculosFields.ACTIVO] || false,
        soat: {
          estado: soatEstado.estado,
          fechaVencimiento: soatVencimiento,
          diasRestantes: soatEstado.diasRestantes,
        },
        tecnomecanica: {
          estado: tecnoEstado.estado,
          fechaVencimiento: tecnoVencimiento,
          diasRestantes: tecnoEstado.diasRestantes,
        },
        licencia: {
          estado: licEstado.estado,
          fechaVencimiento: licVencimiento,
          diasRestantes: licEstado.diasRestantes,
          categoria: licCategoria,
        },
        estadoConsolidado,
      });
    }

    // 5. Resolver nombres de colaboradores desde Nómina Core
    // Para cada idPersonalCore único, hacer lookup
    const idsUnicos = [...new Set(resultado.map((v) => v.idPersonalCore))];
    const personalMap = new Map<string, { nombre: string; area: string }>();

    for (const idCore of idsUnicos) {
      if (!idCore) continue;

      try {
        const personalUrl = `${airtableConfig.baseUrl}/${airtableConfig.baseId}/${airtableConfig.personalTableId}`;
        const PF = airtableConfig.personalFields;
        const filterFormula = `{${PF.ID_EMPLEADO}} = '${idCore}'`;

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
            personalMap.set(idCore, {
              nombre: record[PF.NOMBRE_COMPLETO] || "Sin nombre",
              area: record[PF.AREAS]?.[0] || "Sin área",
            });
          }
        }
      } catch (error) {
        console.error(`Error resolviendo personal ${idCore}:`, error);
      }
    }

    // Aplicar nombres resueltos
    resultado.forEach((v) => {
      const personalInfo = personalMap.get(v.idPersonalCore);
      if (personalInfo) {
        v.nombreColaborador = personalInfo.nombre;
        v.areaColaborador = personalInfo.area;
      }
    });

    // 6. Ordenar por estado consolidado (critico → alerta → ok)
    const ordenEstado = { critico: 0, alerta: 1, ok: 2 };
    resultado.sort((a, b) => ordenEstado[a.estadoConsolidado] - ordenEstado[b.estadoConsolidado]);

    return NextResponse.json({
      success: true,
      total: resultado.length,
      vehiculos: resultado,
    });
  } catch (error) {
    console.error("Error en GET /api/sgsst/vehicular:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
