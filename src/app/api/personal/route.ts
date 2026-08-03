import { NextRequest, NextResponse } from "next/server";
import {
  airtableConfig,
  getAirtableUrl,
  getAirtableHeaders,
} from "@/infrastructure/config/airtable";
import { airtableSGSSTConfig, getSGSSTUrl, getSGSSTHeaders } from "@/infrastructure/config/airtableSGSST";
import { requireAuth } from "@/lib/authMiddleware";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface PersonalItem {
  id: string;
  idEmpleado: string;
  nombreCompleto: string;
  numeroDocumento: string;
  tipoPersonal: string;
  estado: string;
  areas: string[];
  fotoPerfil: { url: string; filename: string } | null;
}

/**
 * GET /api/personal
 * Devuelve la lista de personal activo desde Sirius Nomina Core.
 * Query params:
 *   ?excluir=asistencia  → Excluye miembros del comité SST marcados con EXCLUIR_ASISTENCIA
 *   ?area=Laboratorio    → Filtra solo empleados asignados a esa área
 */
export async function GET(req: NextRequest) {
  // Verificar autenticación
  const authResult = await requireAuth(req);
  if (!authResult.authenticated) return authResult.response;

  try {
    const { personalTableId, personalFields } = airtableConfig;
    const url = getAirtableUrl(personalTableId);
    const headers = getAirtableHeaders();

    // Parámetro de búsqueda por ID de empleado
    const idEmpleadoBuscar = req.nextUrl.searchParams.get("idEmpleado");

    // Solo excluir miembros SST cuando se solicita explícitamente (contexto de asistencia)
    const excluir = req.nextUrl.searchParams.get("excluir");
    const excludedIds = new Set<string>();
    if (excluir === "asistencia") {
      const { miembrosComitesTableId, miembrosComitesFields: mF } = airtableSGSSTConfig;
      try {
        const exclFormula = encodeURIComponent(`{${mF.EXCLUIR_ASISTENCIA}}=TRUE()`);
        const exclUrl = `${getSGSSTUrl(miembrosComitesTableId)}?returnFieldsByFieldId=true&filterByFormula=${exclFormula}&fields[]=${mF.ID_EMPLEADO}`;
        const exclRes = await fetch(exclUrl, { headers: getSGSSTHeaders(), cache: "no-store" });
        if (exclRes.ok) {
          const exclData = await exclRes.json();
          for (const r of (exclData.records || [])) {
            const empId = r.fields[mF.ID_EMPLEADO] as string;
            if (empId) excludedIds.add(empId);
          }
        }
      } catch (e) {
        console.warn("[personal] Error fetching exclusion list:", e);
      }
    }

    // IDs de empleado excluidos de los listados generales (ej: el CEO).
    // Se excluye por ID de empleado —que es estable— y no por el título del
    // cargo: si el rol se reasigna en Nómina Core, un match por título deja
    // de aplicar y la persona reaparece en silencio en las listas de firma.
    const EXCLUIR_ID_EMPLEADOS = (process.env.ASISTENCIA_EXCLUIR_ID_EMPLEADOS || "SIRIUS-PER-0016")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Construir filtro
    let filterFormula: string;

    // Si se busca por ID específico, solo filtrar por ese ID y estado activo
    if (idEmpleadoBuscar) {
      filterFormula = `AND({${personalFields.ESTADO_ACTIVIDAD}} = 'Activo', {${personalFields.ID_EMPLEADO}} = '${idEmpleadoBuscar}')`;
    } else {
      // Para listados generales, excluir Contratistas (el CEO se excluye por ID más abajo)
      filterFormula = `AND({${personalFields.ESTADO_ACTIVIDAD}} = 'Activo', {${personalFields.TIPO_PERSONAL}} != 'Contratista')`;
    }

    let allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({
        filterByFormula: filterFormula,
        pageSize: "100",
        returnFieldsByFieldId: "true",
      });
      if (offset) params.set("offset", offset);

      const response = await fetch(`${url}?${params.toString()}`, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Airtable personal error:", response.status, errorText);
        return NextResponse.json(
          { success: false, message: "Error al consultar personal" },
          { status: 500 }
        );
      }

      const data: AirtableListResponse = await response.json();
      allRecords = [...allRecords, ...data.records];
      offset = data.offset;
    } while (offset);

    // Aplicar exclusiones. En búsquedas por ID específico no se excluye nada:
    // ese modo lo usan la validación y el login, que deben poder resolver a
    // cualquier empleado activo (incluido el CEO).
    const filteredRecords = idEmpleadoBuscar
      ? allRecords
      : allRecords.filter((record) => {
          const empId = (record.fields[personalFields.ID_EMPLEADO] as string) || "";
          if (EXCLUIR_ID_EMPLEADOS.includes(empId)) return false;
          return !excludedIds.has(empId);
        });

    // Obtener parámetro de área para filtrado adicional
    const areaFilter = req.nextUrl.searchParams.get("area");

    const personal: PersonalItem[] = filteredRecords.map((record) => {
      const f = record.fields;
      const fotoArray = f[personalFields.FOTO_PERFIL] as
        | { url: string; filename: string }[]
        | undefined;

      // Obtener áreas (puede ser string o array)
      const areasRaw = f[personalFields.AREAS];
      const areas: string[] = Array.isArray(areasRaw) 
        ? areasRaw as string[]
        : typeof areasRaw === "string" && areasRaw 
          ? [areasRaw] 
          : [];

      return {
        id: record.id,
        idEmpleado: (f[personalFields.ID_EMPLEADO] as string) || "",
        nombreCompleto: (f[personalFields.NOMBRE_COMPLETO] as string) || "",
        numeroDocumento: (f[personalFields.NUMERO_DOCUMENTO] as string) || "",
        tipoPersonal: (() => { const v = f[personalFields.ROL_LOOKUP]; return (Array.isArray(v) ? v[0] : v) as string || ""; })(),
        estado: (f[personalFields.ESTADO_ACTIVIDAD] as string) || "Activo",
        areas,
        fotoPerfil: fotoArray?.[0]
          ? { url: fotoArray[0].url, filename: fotoArray[0].filename }
          : null,
      };
    });

    // Filtrar por área si se especificó
    const personalFiltrado = areaFilter
      ? personal.filter((p) => 
          p.areas.some((a) => a.toLowerCase().includes(areaFilter.toLowerCase()))
        )
      : personal;

    // Ordenar alfabéticamente
    personalFiltrado.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

    return NextResponse.json({ success: true, data: personalFiltrado, total: personalFiltrado.length });
  } catch (error) {
    console.error("Error fetching personal:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
