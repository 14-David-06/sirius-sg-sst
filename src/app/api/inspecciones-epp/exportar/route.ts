import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

// ══════════════════════════════════════════════════════════
// Tipos
// ══════════════════════════════════════════════════════════
type CondicionEPP = "B" | "R" | "M" | "NA" | null;

interface InspeccionEmpleadoPayload {
  empleadoId: string;
  idEmpleado: string;
  nombreCompleto: string;
  condiciones: Record<string, CondicionEPP>;
  observaciones: string;
  firma?: string; // Base64 data URL de la firma
}

interface InspeccionPayload {
  fechaInspeccion: string;
  inspector: string;
  inspecciones: InspeccionEmpleadoPayload[];
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
}

// Mapeo inverso de field IDs a nombres de categorías  
const FIELD_TO_CATEGORIA: Record<string, string> = {
  [airtableSGSSTConfig.detalleInspeccionFields.CASCO]: "casco",
  [airtableSGSSTConfig.detalleInspeccionFields.P_AUDITIVA]: "proteccion_auditiva",
  [airtableSGSSTConfig.detalleInspeccionFields.P_VISUAL]: "proteccion_visual",
  [airtableSGSSTConfig.detalleInspeccionFields.P_RESPIRATORIA]: "proteccion_respiratoria",
  [airtableSGSSTConfig.detalleInspeccionFields.ROPA]: "ropa_trabajo",
  [airtableSGSSTConfig.detalleInspeccionFields.GUANTES]: "guantes",
  [airtableSGSSTConfig.detalleInspeccionFields.BOTAS]: "botas_seguridad",
  [airtableSGSSTConfig.detalleInspeccionFields.P_CAIDAS]: "proteccion_caidas",
  [airtableSGSSTConfig.detalleInspeccionFields.OTROS]: "otros",
};

// Categorías de EPP en orden
const CATEGORIAS_EPP = [
  { id: "casco", label: "Casco" },
  { id: "proteccion_auditiva", label: "Protección Auditiva" },
  { id: "proteccion_visual", label: "Protección Visual" },
  { id: "proteccion_respiratoria", label: "Protección Respiratoria" },
  { id: "ropa_trabajo", label: "Indumentaria" },
  { id: "guantes", label: "Guantes" },
  { id: "botas_seguridad", label: "Botas de Seguridad" },
  { id: "proteccion_caidas", label: "Protección de Caídas" },
  { id: "otros", label: "Otros" },
];

// ══════════════════════════════════════════════════════════
// Colores Marca Sirius (Manual de Marca 2023)
// ══════════════════════════════════════════════════════════
const BRAND = {
  AZUL_BARRANCA: "0154AC",   // Primario — headers, acentos
  AZUL_CIELO: "00A3FF",      // Secundario — título
  SUTILEZA: "BCD7EA",        // Fondo claro azul
  COTILEDON: "ECF1F4",       // Fondo muy claro (filas alternas)
  IMPERIAL: "1A1A33",        // Oscuro — texto fuerte
  VERDE_ALEGRIA: "00B602",   // Acento verde
  WHITE: "FFFFFF",
  LIGHT_GRAY: "F8FAFC",
  BORDER: "B0C4DE",          // Borde azul suave
  // Colores para condiciones
  BUENO: "C6EFCE",           // Verde claro
  BUENO_TEXT: "006100",      // Verde oscuro
  REGULAR: "FFEB9C",         // Amarillo
  REGULAR_TEXT: "9C5700",    // Marrón
  MALO: "FFC7CE",            // Rojo claro
  MALO_TEXT: "9C0006",       // Rojo oscuro
  NA: "D9D9D9",              // Gris
  NA_TEXT: "595959",         // Gris oscuro
};

// Número de columnas: # + Empleado + 9 EPPs + Observaciones + Firma = 13
const TOTAL_COLS = 13;

const headerFont: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 9,
  bold: true,
  color: { argb: `FF${BRAND.WHITE}` },
};

const bodyFont: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 9,
  color: { argb: `FF${BRAND.IMPERIAL}` },
};

const brandBorder: Partial<ExcelJS.Border> = {
  style: "thin",
  color: { argb: `FF${BRAND.BORDER}` },
};

const allBorders: Partial<ExcelJS.Borders> = {
  top: brandBorder,
  left: brandBorder,
  bottom: brandBorder,
  right: brandBorder,
};

// ══════════════════════════════════════════════════════════
// POST /api/inspecciones-epp/exportar
//
// Genera archivo Excel (.xlsx) con el formato de inspección EPP
// ══════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const payload: InspeccionPayload = await request.json();

    // Validaciones
    if (!payload.inspecciones || payload.inspecciones.length === 0) {
      return NextResponse.json(
        { success: false, message: "No hay datos para exportar" },
        { status: 400 }
      );
    }

    // ── Crear workbook ───────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "Sirius SG-SST";
    wb.created = new Date();

    const ws = wb.addWorksheet("Inspección EPP", {
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.5,
          bottom: 0.5,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    // ── Configurar anchos de columna ─────────────────────
    ws.columns = [
      { width: 4 },   // A: #
      { width: 25 },  // B: Empleado
      { width: 7 },   // C: Casco
      { width: 7 },   // D: P. Auditiva
      { width: 7 },   // E: P. Visual
      { width: 7 },   // F: P. Respiratoria
      { width: 7 },   // G: Ropa
      { width: 7 },   // H: Guantes
      { width: 7 },   // I: Botas
      { width: 7 },   // J: P. Caídas
      { width: 7 },   // K: Otros
      { width: 20 },  // L: Observaciones
      { width: 18 },  // M: Firma
    ];

    let row = 1;

    // ── Logo y encabezado ────────────────────────────────
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      const logoExists = fs.existsSync(logoPath);

      if (logoExists) {
        const logoId = wb.addImage({
          filename: logoPath,
          extension: "png",
        });

        // Logo en columna A-B
        ws.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 140, height: 50 },
        });
      }
    } catch (err) {
      console.error("Error cargando logo:", err);
    }

    // Título
    ws.getRow(row).height = 55;

    // Título principal en columnas C-K
    ws.mergeCells(row, 3, row, 11);
    const titleCell = ws.getCell(row, 3);
    titleCell.value = "INSPECCIÓN CONDICIÓN DE EPP";
    titleCell.font = {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: `FF${BRAND.WHITE}` },
    };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND.AZUL_CIELO}` },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Código del formato
    const codeCell = ws.getCell(row, 12);
    codeCell.value = "FT-SST-030";
    codeCell.font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: `FF${BRAND.IMPERIAL}` },
    };
    codeCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND.SUTILEZA}` },
    };
    codeCell.alignment = { horizontal: "center", vertical: "middle" };
    codeCell.border = allBorders;

    row++;

    // Línea verde de acento
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    ws.getCell(row, 1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND.VERDE_ALEGRIA}` },
    };
    ws.getRow(row).height = 4;
    row++;

    // ── Información del inspector ────────────────────────
    ws.getRow(row).height = 22;
    
    ws.mergeCells(row, 1, row, 3);
    const fechaLabelCell = ws.getCell(row, 1);
    fechaLabelCell.value = "Fecha de Inspección:";
    fechaLabelCell.font = { ...bodyFont, bold: true };
    fechaLabelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND.SUTILEZA}` },
    };
    fechaLabelCell.alignment = { horizontal: "left", vertical: "middle" };
    fechaLabelCell.border = allBorders;

    ws.mergeCells(row, 4, row, 6);
    const fechaCell = ws.getCell(row, 4);
    fechaCell.value = formatDateES(payload.fechaInspeccion);
    fechaCell.font = bodyFont;
    fechaCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND.WHITE}` },
    };
    fechaCell.alignment = { horizontal: "left", vertical: "middle" };
    fechaCell.border = allBorders;

    ws.mergeCells(row, 7, row, 9);
    const inspectorLabelCell = ws.getCell(row, 7);
    inspectorLabelCell.value = "Inspector / Responsable:";
    inspectorLabelCell.font = { ...bodyFont, bold: true };
    inspectorLabelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND.SUTILEZA}` },
    };
    inspectorLabelCell.alignment = { horizontal: "left", vertical: "middle" };
    inspectorLabelCell.border = allBorders;

    ws.mergeCells(row, 10, row, TOTAL_COLS);
    const inspectorCell = ws.getCell(row, 10);
    inspectorCell.value = payload.inspector || "—";
    inspectorCell.font = bodyFont;
    inspectorCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND.WHITE}` },
    };
    inspectorCell.alignment = { horizontal: "left", vertical: "middle" };
    inspectorCell.border = allBorders;

    row++;

    // Espacio
    ws.getRow(row).height = 8;
    row++;

    // ── Encabezados de tabla ─────────────────────────────
    ws.getRow(row).height = 35;

    const headers = [
      "#",
      "Empleado",
      ...CATEGORIAS_EPP.map(c => c.label),
      "Observaciones",
      "Firma",
    ];

    headers.forEach((text, idx) => {
      const cell = ws.getCell(row, idx + 1);
      cell.value = text;
      cell.font = headerFont;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = allBorders;
    });

    row++;

    // ── Datos de inspección ──────────────────────────────
    payload.inspecciones.forEach((insp, idx) => {
      const rowHeight = insp.firma ? 45 : 22;
      ws.getRow(row).height = rowHeight;
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? BRAND.COTILEDON : BRAND.WHITE;

      // #
      const numCell = ws.getCell(row, 1);
      numCell.value = idx + 1;
      numCell.font = bodyFont;
      numCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${rowBg}` },
      };
      numCell.alignment = { horizontal: "center", vertical: "middle" };
      numCell.border = allBorders;

      // Empleado
      const empCell = ws.getCell(row, 2);
      empCell.value = insp.nombreCompleto;
      empCell.font = { ...bodyFont, bold: true };
      empCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${rowBg}` },
      };
      empCell.alignment = { horizontal: "left", vertical: "middle" };
      empCell.border = allBorders;

      // Condiciones de EPP
      CATEGORIAS_EPP.forEach((cat, catIdx) => {
        const condicion = insp.condiciones[cat.id] as CondicionEPP;
        const cell = ws.getCell(row, catIdx + 3);
        
        const { value, bgColor, textColor } = getCondicionStyle(condicion);
        
        cell.value = value;
        cell.font = {
          name: "Calibri",
          size: 9,
          bold: true,
          color: { argb: `FF${textColor}` },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${bgColor}` },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = allBorders;
      });

      // Observaciones
      const obsCell = ws.getCell(row, 12);
      obsCell.value = insp.observaciones || "—";
      obsCell.font = bodyFont;
      obsCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${rowBg}` },
      };
      obsCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      obsCell.border = allBorders;

      // Firma
      const firmaCell = ws.getCell(row, 13);
      if (insp.firma) {
        try {
          // Extraer base64 del data URL
          const base64Data = insp.firma.replace(/^data:image\/png;base64,/, "");
          const imageId = wb.addImage({
            base64: base64Data,
            extension: "png",
          });
          ws.addImage(imageId, {
            tl: { col: 12, row: row - 1 },
            ext: { width: 100, height: 40 },
          });
          firmaCell.value = "";
        } catch {
          firmaCell.value = "✔ Firmado";
          firmaCell.font = { ...bodyFont, color: { argb: `FF${BRAND.BUENO_TEXT}` } };
        }
      } else {
        firmaCell.value = "—";
        firmaCell.font = bodyFont;
      }
      firmaCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${rowBg}` },
      };
      firmaCell.alignment = { horizontal: "center", vertical: "middle" };
      firmaCell.border = allBorders;

      row++;
    });

    // ── Leyenda ──────────────────────────────────────────
    row++;
    ws.getRow(row).height = 22;

    ws.mergeCells(row, 1, row, 2);
    const leyendaLabel = ws.getCell(row, 1);
    leyendaLabel.value = "Leyenda:";
    leyendaLabel.font = { ...bodyFont, bold: true };
    leyendaLabel.alignment = { horizontal: "left", vertical: "middle" };

    const leyendaItems = [
      { val: "B", text: "Bueno", bg: BRAND.BUENO, color: BRAND.BUENO_TEXT },
      { val: "R", text: "Regular", bg: BRAND.REGULAR, color: BRAND.REGULAR_TEXT },
      { val: "M", text: "Malo", bg: BRAND.MALO, color: BRAND.MALO_TEXT },
      { val: "N/A", text: "No Aplica", bg: BRAND.NA, color: BRAND.NA_TEXT },
    ];

    let col = 3;
    leyendaItems.forEach((item) => {
      const cell = ws.getCell(row, col);
      cell.value = `${item.val} = ${item.text}`;
      cell.font = {
        name: "Calibri",
        size: 8,
        bold: true,
        color: { argb: `FF${item.color}` },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${item.bg}` },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = allBorders;
      col++;
    });

    // ── Footer ───────────────────────────────────────────
    row += 2;
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    const footerCell = ws.getCell(row, 1);
    footerCell.value = `Generado el ${new Date().toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })} — Sistema SG-SST Sirius`;
    footerCell.font = {
      name: "Calibri",
      size: 8,
      italic: true,
      color: { argb: `FF${BRAND.IMPERIAL}` },
    };
    footerCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND.SUTILEZA}` },
    };
    footerCell.alignment = { horizontal: "center", vertical: "middle" };
    footerCell.border = allBorders;

    // ── Generar buffer y responder ───────────────────────
    const buffer = await wb.xlsx.writeBuffer();

    const filename = `Inspeccion_EPP_${payload.fechaInspeccion}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error en POST /api/inspecciones-epp/exportar:", error);
    return NextResponse.json(
      { success: false, message: "Error al generar el archivo Excel" },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════

function formatDateES(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getCondicionStyle(condicion: CondicionEPP): {
  value: string;
  bgColor: string;
  textColor: string;
} {
  switch (condicion) {
    case "B":
      return { value: "B", bgColor: BRAND.BUENO, textColor: BRAND.BUENO_TEXT };
    case "R":
      return { value: "R", bgColor: BRAND.REGULAR, textColor: BRAND.REGULAR_TEXT };
    case "M":
      return { value: "M", bgColor: BRAND.MALO, textColor: BRAND.MALO_TEXT };
    case "NA":
      return { value: "N/A", bgColor: BRAND.NA, textColor: BRAND.NA_TEXT };
    default:
      return { value: "—", bgColor: BRAND.WHITE, textColor: BRAND.IMPERIAL };
  }
}

// ══════════════════════════════════════════════════════════
// GET /api/inspecciones-epp/exportar
//
// Genera Excel con TODAS las inspecciones desde Airtable
// ══════════════════════════════════════════════════════════
export async function GET() {
  try {
    const { inspeccionesFields, detalleInspeccionFields } = airtableSGSSTConfig;

    // 1. Obtener todas las inspecciones
    const inspeccionesUrl = getSGSSTUrl(airtableSGSSTConfig.inspeccionesTableId);
    const inspeccionesParams = new URLSearchParams({
      "sort[0][field]": inspeccionesFields.FECHA,
      "sort[0][direction]": "desc",
      maxRecords: "100",
      returnFieldsByFieldId: "true",
    });

    const inspeccionesRes = await fetch(`${inspeccionesUrl}?${inspeccionesParams.toString()}`, {
      method: "GET",
      headers: getSGSSTHeaders(),
      cache: "no-store",
    });

    if (!inspeccionesRes.ok) {
      return NextResponse.json(
        { success: false, message: "Error obteniendo inspecciones" },
        { status: 500 }
      );
    }

    const inspeccionesData: AirtableResponse = await inspeccionesRes.json();

    if (inspeccionesData.records.length === 0) {
      return NextResponse.json(
        { success: false, message: "No hay inspecciones para exportar" },
        { status: 400 }
      );
    }

    // 2. Crear workbook con múltiples hojas (una por inspección)
    const wb = new ExcelJS.Workbook();
    wb.creator = "Sirius SG-SST";
    wb.created = new Date();

    for (const inspeccion of inspeccionesData.records) {
      const idInspeccion = (inspeccion.fields[inspeccionesFields.ID] as string) || "Sin ID";
      const fecha = (inspeccion.fields[inspeccionesFields.FECHA] as string) || "";
      const inspector = (inspeccion.fields[inspeccionesFields.INSPECTOR] as string) || "";
      const detalleIds = (inspeccion.fields[inspeccionesFields.DETALLE_LINK] as string[]) || [];

      // Obtener detalles de esta inspección
      const empleados: InspeccionEmpleadoPayload[] = [];

      if (detalleIds.length > 0) {
        const filterFormula = `OR(${detalleIds.map((id) => `RECORD_ID()='${id}'`).join(",")})`;
        const detalleUrl = getSGSSTUrl(airtableSGSSTConfig.detalleInspeccionTableId);
        const detalleParams = new URLSearchParams({
          filterByFormula: filterFormula,
          maxRecords: "100",
          returnFieldsByFieldId: "true",
        });

        const detalleRes = await fetch(`${detalleUrl}?${detalleParams.toString()}`, {
          method: "GET",
          headers: getSGSSTHeaders(),
          cache: "no-store",
        });

        if (detalleRes.ok) {
          const detalleData: AirtableResponse = await detalleRes.json();

          for (const record of detalleData.records) {
            const f = record.fields;
            const condiciones: Record<string, CondicionEPP> = {};

            for (const [fieldId, categoria] of Object.entries(FIELD_TO_CATEGORIA)) {
              condiciones[categoria] = (f[fieldId] as CondicionEPP) || null;
            }

            empleados.push({
              empleadoId: record.id,
              idEmpleado: (f[detalleInspeccionFields.ID_EMPLEADO] as string) || "",
              nombreCompleto: (f[detalleInspeccionFields.NOMBRE] as string) || "",
              condiciones,
              observaciones: (f[detalleInspeccionFields.OBSERVACIONES] as string) || "",
            });
          }
        }
      }

      // Crear hoja para esta inspección
      const sheetName = idInspeccion.slice(0, 31).replace(/[*?:\\\/\[\]]/g, "-");
      const ws = wb.addWorksheet(sheetName, {
        pageSetup: {
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
        },
      });

      // Configurar columnas
      ws.columns = [
        { width: 4 },
        { width: 25 },
        { width: 7 },
        { width: 7 },
        { width: 7 },
        { width: 7 },
        { width: 7 },
        { width: 7 },
        { width: 7 },
        { width: 7 },
        { width: 7 },
        { width: 25 },
      ];

      let row = 1;

      // Logo
      try {
        const logoPath = path.join(process.cwd(), "public", "logo.png");
        if (fs.existsSync(logoPath)) {
          const logoId = wb.addImage({ filename: logoPath, extension: "png" });
          ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 140, height: 50 } });
        }
      } catch (err) {
        console.error("Error cargando logo:", err);
      }

      ws.getRow(row).height = 55;
      ws.mergeCells(row, 3, row, 11);
      const titleCell = ws.getCell(row, 3);
      titleCell.value = "INSPECCIÓN CONDICIÓN DE EPP";
      titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: `FF${BRAND.WHITE}` } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_CIELO}` } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };

      row++;

      // Info de la inspección
      ws.mergeCells(row, 1, row, 6);
      ws.getCell(row, 1).value = `Fecha: ${formatDateES(fecha)}`;
      ws.getCell(row, 1).font = bodyFont;

      ws.mergeCells(row, 7, row, 12);
      ws.getCell(row, 7).value = `Inspector: ${inspector}`;
      ws.getCell(row, 7).font = bodyFont;

      row += 2;

      // Headers de la tabla
      const headers = ["#", "Empleado", ...CATEGORIAS_EPP.map((c) => c.label.slice(0, 10)), "Observaciones"];
      headers.forEach((h, i) => {
        const cell = ws.getCell(row, i + 1);
        cell.value = h;
        cell.font = headerFont;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = allBorders;
      });

      row++;

      // Datos de empleados
      empleados.forEach((emp, idx) => {
        const isAlt = idx % 2 === 1;
        const bgColor = isAlt ? BRAND.COTILEDON : BRAND.WHITE;

        // #
        const numCell = ws.getCell(row, 1);
        numCell.value = idx + 1;
        numCell.font = bodyFont;
        numCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bgColor}` } };
        numCell.alignment = { horizontal: "center" };
        numCell.border = allBorders;

        // Nombre
        const nameCell = ws.getCell(row, 2);
        nameCell.value = emp.nombreCompleto;
        nameCell.font = bodyFont;
        nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bgColor}` } };
        nameCell.alignment = { horizontal: "left" };
        nameCell.border = allBorders;

        // Condiciones
        CATEGORIAS_EPP.forEach((cat, catIdx) => {
          const condicion = emp.condiciones[cat.id];
          const style = getCondicionStyle(condicion);
          const cell = ws.getCell(row, catIdx + 3);
          cell.value = style.value;
          cell.font = { ...bodyFont, bold: true, color: { argb: `FF${style.textColor}` } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${style.bgColor}` } };
          cell.alignment = { horizontal: "center" };
          cell.border = allBorders;
        });

        // Observaciones
        const obsCell = ws.getCell(row, 12);
        obsCell.value = emp.observaciones || "";
        obsCell.font = bodyFont;
        obsCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bgColor}` } };
        obsCell.alignment = { horizontal: "left", wrapText: true };
        obsCell.border = allBorders;

        row++;
      });

      // Leyenda
      row++;
      ws.mergeCells(row, 1, row, 12);
      ws.getCell(row, 1).value = "Leyenda: B = Bueno | R = Regular | M = Malo | N/A = No Aplica";
      ws.getCell(row, 1).font = { ...bodyFont, italic: true };
      ws.getCell(row, 1).alignment = { horizontal: "center" };
    }

    // Generar buffer
    const buffer = await wb.xlsx.writeBuffer();

    const filename = `Inspecciones_EPP_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error en GET /api/inspecciones-epp/exportar:", error);
    return NextResponse.json(
      { success: false, message: "Error al generar el archivo Excel" },
      { status: 500 }
    );
  }
}
