import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import crypto from "crypto";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";
import {
  uploadToS3,
  generateS3Key,
  S3_FOLDERS,
  getContentType,
} from "@/infrastructure/config/awsS3";

// ══════════════════════════════════════════════════════════
// Tipos
// ══════════════════════════════════════════════════════════
type CondicionEPP = "B" | "R" | "M" | "NA" | null;

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
}

// ══════════════════════════════════════════════════════════
// AES Decryption
// ══════════════════════════════════════════════════════════
const AES_SECRET = process.env.AES_SIGNATURE_SECRET || "";

function decryptAES(encryptedStr: string): string {
  const [ivB64, encB64] = encryptedStr.split(":");
  if (!ivB64 || !encB64) throw new Error("Formato de cifrado inválido");

  const key = crypto.createHash("sha256").update(AES_SECRET).digest();
  const iv = Buffer.from(ivB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  let decrypted = decipher.update(encB64, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ══════════════════════════════════════════════════════════
// Mapeo de campos
// ══════════════════════════════════════════════════════════
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
// Colores
// ══════════════════════════════════════════════════════════
const BRAND = {
  AZUL_BARRANCA: "0154AC",
  AZUL_CIELO: "00A3FF",
  SUTILEZA: "BCD7EA",
  COTILEDON: "ECF1F4",
  IMPERIAL: "1A1A33",
  VERDE_ALEGRIA: "00B602",
  WHITE: "FFFFFF",
  BORDER: "B0C4DE",
  BUENO: "C6EFCE",
  BUENO_TEXT: "006100",
  REGULAR: "FFEB9C",
  REGULAR_TEXT: "9C5700",
  MALO: "FFC7CE",
  MALO_TEXT: "9C0006",
  NA: "D9D9D9",
  NA_TEXT: "595959",
};

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
// GET /api/inspecciones-epp/exportar/[id]
// Exporta una inspección específica a Excel
// ══════════════════════════════════════════════════════════
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspeccionId } = await params;

    const { inspeccionesFields, detalleInspeccionFields } = airtableSGSSTConfig;

    // ── 1. Obtener datos de la inspección ────────────────
    const inspeccionUrl = `${getSGSSTUrl(airtableSGSSTConfig.inspeccionesTableId)}/${inspeccionId}?returnFieldsByFieldId=true`;
    const inspeccionRes = await fetch(inspeccionUrl, {
      method: "GET",
      headers: getSGSSTHeaders(),
      cache: "no-store",
    });

    if (!inspeccionRes.ok) {
      return NextResponse.json(
        { success: false, message: "Inspección no encontrada" },
        { status: 404 }
      );
    }

    const inspeccionRecord: AirtableRecord = await inspeccionRes.json();
    const idInspeccion = (inspeccionRecord.fields[inspeccionesFields.ID] as string) || inspeccionId;
    const fecha = (inspeccionRecord.fields[inspeccionesFields.FECHA] as string) || "";
    const inspector = (inspeccionRecord.fields[inspeccionesFields.INSPECTOR] as string) || "";
    const detalleIds = (inspeccionRecord.fields[inspeccionesFields.DETALLE_LINK] as string[]) || [];
    
    console.log("Inspección encontrada:", { idInspeccion, fecha, inspector, detalles: detalleIds.length });

    // ── 2. Obtener detalles de empleados ─────────────────
    interface EmpleadoData {
      nombre: string;
      idEmpleado: string;
      condiciones: Record<string, CondicionEPP>;
      observaciones: string;
      firma: string | null; // Descifrada
    }

    const empleados: EmpleadoData[] = [];

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

          // Descifrar firma del empleado si existe
          let firmaDescifrada: string | null = null;
          const firmaHash = f[detalleInspeccionFields.FIRMA] as string | undefined;
          if (firmaHash && AES_SECRET) {
            try {
              const decrypted = decryptAES(firmaHash);
              const firmaData = JSON.parse(decrypted);
              firmaDescifrada = firmaData.signature;
            } catch (err) {
              console.error("Error descifrando firma:", err);
            }
          }

          empleados.push({
            nombre: (f[detalleInspeccionFields.NOMBRE] as string) || "",
            idEmpleado: (f[detalleInspeccionFields.ID_EMPLEADO] as string) || "",
            condiciones,
            observaciones: (f[detalleInspeccionFields.OBSERVACIONES] as string) || "",
            firma: firmaDescifrada,
          });
        }
      }
    }

    console.log("Empleados encontrados para exportar:", empleados.length);

    // ── 3. Crear Excel ───────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "Sirius SG-SST";
    wb.created = new Date();

    const ws = wb.addWorksheet("Inspección EPP", {
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        paperSize: 5, // Legal
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      },
    });

    // ── Anchos de columna profesionales ──────────────────
    ws.columns = [
      { width: 5 },    // A: #
      { width: 26 },   // B: Empleado
      { width: 10 },   // C: Casco
      { width: 10 },   // D: P. Auditiva
      { width: 10 },   // E: P. Visual
      { width: 10 },   // F: P. Respiratoria
      { width: 10 },   // G: Indumentaria
      { width: 10 },   // H: Guantes
      { width: 10 },   // I: Botas
      { width: 10 },   // J: P. Caídas
      { width: 10 },   // K: Otros
      { width: 22 },   // L: Observaciones
      { width: 18 },   // M: Firma
    ];

    let row = 1;

    // ── Fila 1: Logo + Título + Código ───────────────────
    ws.getRow(row).height = 55;

    // Logo (columnas A-B)
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      if (fs.existsSync(logoPath)) {
        const logoId = wb.addImage({ filename: logoPath, extension: "png" });
        ws.addImage(logoId, { tl: { col: 0.2, row: 0.15 }, ext: { width: 140, height: 42 } });
      }
    } catch (err) {
      console.error("Error cargando logo:", err);
    }

    // Celdas A-B vacías con fondo
    ws.mergeCells(row, 1, row, 2);
    const logoCell = ws.getCell(row, 1);
    logoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    logoCell.border = allBorders;

    // Título (columnas C-K)
    ws.mergeCells(row, 3, row, 11);
    const titleCell = ws.getCell(row, 3);
    titleCell.value = "INSPECCIÓN CONDICIÓN DE EPP";
    titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: `FF${BRAND.IMPERIAL}` } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.SUTILEZA}` } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.border = allBorders;

    // Código (columnas L-M)
    ws.mergeCells(row, 12, row, TOTAL_COLS);
    const codeCell = ws.getCell(row, 12);
    codeCell.value = "FT-SST-030";
    codeCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${BRAND.IMPERIAL}` } };
    codeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.SUTILEZA}` } };
    codeCell.alignment = { horizontal: "center", vertical: "middle" };
    codeCell.border = allBorders;

    row++;

    // ── Línea decorativa verde ───────────────────────────
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    const lineaVerde = ws.getCell(row, 1);
    lineaVerde.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.VERDE_ALEGRIA}` } };
    lineaVerde.border = allBorders;
    ws.getRow(row).height = 4;
    row++;

    // ── Info inspección ──────────────────────────────────
    ws.getRow(row).height = 24;

    ws.mergeCells(row, 1, row, 3);
    const fechaLabel = ws.getCell(row, 1);
    fechaLabel.value = "Fecha de Inspección:";
    fechaLabel.font = { ...bodyFont, bold: true };
    fechaLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.SUTILEZA}` } };
    fechaLabel.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    fechaLabel.border = allBorders;

    ws.mergeCells(row, 4, row, 6);
    const fechaCell = ws.getCell(row, 4);
    fechaCell.value = formatDateES(fecha);
    fechaCell.font = bodyFont;
    fechaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    fechaCell.alignment = { horizontal: "center", vertical: "middle" };
    fechaCell.border = allBorders;

    ws.mergeCells(row, 7, row, 9);
    const inspLabel = ws.getCell(row, 7);
    inspLabel.value = "Inspector / Responsable:";
    inspLabel.font = { ...bodyFont, bold: true };
    inspLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.SUTILEZA}` } };
    inspLabel.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    inspLabel.border = allBorders;

    ws.mergeCells(row, 10, row, TOTAL_COLS);
    const inspCell = ws.getCell(row, 10);
    inspCell.value = inspector || "—";
    inspCell.font = bodyFont;
    inspCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    inspCell.alignment = { horizontal: "center", vertical: "middle" };
    inspCell.border = allBorders;

    row++;

    // Espacio
    ws.getRow(row).height = 6;
    row++;

    // ── Encabezados de tabla ─────────────────────────────
    ws.getRow(row).height = 36;
    const headers = ["#", "Empleado", ...CATEGORIAS_EPP.map((c) => c.label), "Observaciones", "Firma"];
    headers.forEach((text, idx) => {
      const cell = ws.getCell(row, idx + 1);
      cell.value = text;
      cell.font = headerFont;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = allBorders;
    });
    row++;

    // ── Filas de empleados ───────────────────────────────
    empleados.forEach((emp, idx) => {
      const rowHeight = emp.firma ? 45 : 24;
      ws.getRow(row).height = rowHeight;
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? BRAND.COTILEDON : BRAND.WHITE;

      // #
      const numCell = ws.getCell(row, 1);
      numCell.value = idx + 1;
      numCell.font = { ...bodyFont, bold: true };
      numCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
      numCell.alignment = { horizontal: "center", vertical: "middle" };
      numCell.border = allBorders;

      // Empleado
      const empCell = ws.getCell(row, 2);
      empCell.value = emp.nombre;
      empCell.font = { ...bodyFont, bold: true };
      empCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
      empCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      empCell.border = allBorders;

      // Condiciones EPP
      CATEGORIAS_EPP.forEach((cat, catIdx) => {
        const condicion = emp.condiciones[cat.id];
        const style = getCondicionStyle(condicion);
        const cell = ws.getCell(row, catIdx + 3);
        cell.value = style.value;
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${style.textColor}` } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${style.bgColor}` } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = allBorders;
      });

      // Observaciones
      const obsCell = ws.getCell(row, 12);
      obsCell.value = emp.observaciones || "—";
      obsCell.font = bodyFont;
      obsCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
      obsCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true, indent: 1 };
      obsCell.border = allBorders;

      // Firma del empleado
      const firmaCell = ws.getCell(row, 13);
      if (emp.firma) {
        try {
          const base64Data = emp.firma.replace(/^data:image\/png;base64,/, "");
          const imageId = wb.addImage({ base64: base64Data, extension: "png" });
          ws.addImage(imageId, {
            tl: { col: 12.05, row: row - 1 + 0.1 },
            ext: { width: 100, height: 36 },
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
      firmaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
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
    leyendaLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    leyendaLabel.alignment = { horizontal: "right", vertical: "middle" };
    leyendaLabel.border = allBorders;

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
      cell.font = { name: "Calibri", size: 8, bold: true, color: { argb: `FF${item.color}` } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${item.bg}` } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = allBorders;
      col++;
    });

    // Celdas vacías del resto de la leyenda
    for (let c = col; c <= TOTAL_COLS; c++) {
      const cell = ws.getCell(row, c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
      cell.border = allBorders;
    }

    // ── Footer ───────────────────────────────────────────
    row += 2;
    ws.getRow(row).height = 20;
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    const footerCell = ws.getCell(row, 1);
    footerCell.value = `Generado el ${new Date().toLocaleDateString("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })} — Sistema SG-SST Sirius`;
    footerCell.font = { name: "Calibri", size: 8, italic: true, color: { argb: `FF${BRAND.IMPERIAL}` } };
    footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.SUTILEZA}` } };
    footerCell.alignment = { horizontal: "center", vertical: "middle" };
    footerCell.border = allBorders;

    // ── Generar buffer ───────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const filename = `Inspeccion_EPP_${idInspeccion}_${fecha || "sin-fecha"}.xlsx`;

    // ── Subir a S3 ───────────────────────────────────────
    let s3Url: string | null = null;
    try {
      const s3Key = generateS3Key(S3_FOLDERS.INSPECCION_EPP, filename, new Date());
      const result = await uploadToS3(
        s3Key,
        Buffer.from(buffer as ArrayBuffer),
        getContentType(filename)
      );
      s3Url = result.url;
      console.log("Archivo subido a S3:", s3Url);
    } catch (s3Error) {
      console.error("Error subiendo a S3 (continuando sin guardar):", s3Error);
      // No fallamos si S3 falla, solo no guardamos la URL
    }

    // ── Actualizar registro en Airtable ──────────────────
    if (s3Url) {
      try {
        const { inspeccionesFields } = airtableSGSSTConfig;
        const updateUrl = `${getSGSSTUrl(airtableSGSSTConfig.inspeccionesTableId)}/${inspeccionId}`;
        
        const updatePayload = {
          fields: {
            [inspeccionesFields.URL_DOCUMENTO]: s3Url,
            [inspeccionesFields.FECHA_EXPORTACION]: new Date().toISOString(),
          },
        };

        const updateRes = await fetch(updateUrl, {
          method: "PATCH",
          headers: getSGSSTHeaders(),
          body: JSON.stringify(updatePayload),
        });

        if (!updateRes.ok) {
          console.error("Error actualizando Airtable:", await updateRes.text());
        } else {
          console.log("Registro de inspección actualizado con URL del documento");
        }
      } catch (airtableError) {
        console.error("Error actualizando Airtable:", airtableError);
      }
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-S3-Url": s3Url || "",
      },
    });
  } catch (error) {
    console.error("Error en POST /api/inspecciones-epp/exportar/[id]:", error);
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
      timeZone: "America/Bogota",
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
