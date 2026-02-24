import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

// ══════════════════════════════════════════════════════════
// AES-256-CBC Descifrado
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

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
}

// ══════════════════════════════════════════════════════════
// Conversión de firma PNG (blanca → negra transparente)
// ══════════════════════════════════════════════════════════
function convertSignatureToBlackTransparent(base64Data: string): string {
  const buf = Buffer.from(base64Data, "base64");
  try {
    const zlib = require("zlib");
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return base64Data;

    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idatChunks: Buffer[] = [];
    let pos = 8;

    while (pos < buf.length) {
      const len = buf.readUInt32BE(pos);
      const type = buf.toString("ascii", pos + 4, pos + 8);
      if (type === "IHDR") {
        width = buf.readUInt32BE(pos + 8);
        height = buf.readUInt32BE(pos + 12);
        bitDepth = buf[pos + 16];
        colorType = buf[pos + 17];
      } else if (type === "IDAT") {
        idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
      }
      pos += 12 + len;
    }

    if (bitDepth !== 8 || colorType !== 6) return base64Data;

    const compressed = Buffer.concat(idatChunks);
    const raw = zlib.inflateSync(compressed);
    const stride = 1 + width * 4;
    const pixels = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      const filterType = raw[y * stride];
      for (let x = 0; x < width * 4; x++) {
        const rawIdx = y * stride + 1 + x;
        let val = raw[rawIdx];
        const a = x >= 4 ? pixels[y * width * 4 + x - 4] : 0;
        const b = y > 0 ? pixels[(y - 1) * width * 4 + x] : 0;
        const c = (x >= 4 && y > 0) ? pixels[(y - 1) * width * 4 + x - 4] : 0;
        switch (filterType) {
          case 0: break;
          case 1: val = (val + a) & 0xff; break;
          case 2: val = (val + b) & 0xff; break;
          case 3: val = (val + Math.floor((a + b) / 2)) & 0xff; break;
          case 4: {
            const p = a + b - c;
            const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
            const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc) ? b : c;
            val = (val + pr) & 0xff;
            break;
          }
        }
        pixels[y * width * 4 + x] = val;
      }
    }

    let totalBrightness = 0, visiblePixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 20) {
        totalBrightness += pixels[i] + pixels[i + 1] + pixels[i + 2];
        visiblePixels++;
      }
    }
    const avgBrightness = visiblePixels > 0 ? totalBrightness / (visiblePixels * 3) : 0;

    if (avgBrightness > 180) {
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0) {
          pixels[i] = 255 - pixels[i];
          pixels[i + 1] = 255 - pixels[i + 1];
          pixels[i + 2] = 255 - pixels[i + 2];
        }
      }
    }

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], al = pixels[i + 3];
      if (al > 250 && r > 245 && g > 245 && b > 245) {
        pixels[i + 3] = 0;
      }
    }

    const processed = Buffer.alloc(raw.length);
    for (let y = 0; y < height; y++) {
      processed[y * stride] = 0;
      pixels.copy(processed, y * stride + 1, y * width * 4, (y + 1) * width * 4);
    }

    const newCompressed = zlib.deflateSync(processed);
    const crc32Table: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crc32Table[n] = c >>> 0;
    }
    const crc32 = (data: Buffer): number => {
      let c = 0xffffffff;
      for (let i = 0; i < data.length; i++) c = (c >>> 8) ^ crc32Table[(c ^ data[i]) & 0xff];
      return (c ^ 0xffffffff) >>> 0;
    };

    const chunks: Buffer[] = [];
    chunks.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const ihdr = Buffer.alloc(25);
    ihdr.writeUInt32BE(13, 0); ihdr.write("IHDR", 4);
    ihdr.writeUInt32BE(width, 8); ihdr.writeUInt32BE(height, 12);
    ihdr[16] = 8; ihdr[17] = 6; ihdr[18] = 0; ihdr[19] = 0; ihdr[20] = 0;
    ihdr.writeUInt32BE(crc32(ihdr.slice(4, 21)), 21);
    chunks.push(ihdr);
    const idatHeader = Buffer.alloc(8);
    idatHeader.writeUInt32BE(newCompressed.length, 0); idatHeader.write("IDAT", 4);
    const idatCrcData = Buffer.concat([Buffer.from("IDAT"), newCompressed]);
    const idatCrc = Buffer.alloc(4);
    idatCrc.writeUInt32BE(crc32(idatCrcData), 0);
    chunks.push(idatHeader, newCompressed, idatCrc);
    chunks.push(Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]));
    return Buffer.concat(chunks).toString("base64");
  } catch {
    return base64Data;
  }
}

// ══════════════════════════════════════════════════════════
// Colores Marca Sirius
// ══════════════════════════════════════════════════════════
const BRAND = {
  AZUL_BARRANCA: "0154AC",
  AZUL_CIELO:    "00A3FF",
  SUTILEZA:      "BCD7EA",
  COTILEDON:     "ECF1F4",
  IMPERIAL:      "1A1A33",
  WHITE:         "FFFFFF",
  BORDER:        "B0C4DE",
};

const allBorders: Partial<ExcelJS.Borders> = {
  top:    { style: "thin", color: { argb: `FF${BRAND.BORDER}` } },
  left:   { style: "thin", color: { argb: `FF${BRAND.BORDER}` } },
  bottom: { style: "thin", color: { argb: `FF${BRAND.BORDER}` } },
  right:  { style: "thin", color: { argb: `FF${BRAND.BORDER}` } },
};

const TOTAL_COLS = 5; // ITEM, NOMBRE, CEDULA, LABOR, FIRMA
const MIN_ROWS = 30;
const SIGNATURE_ROW_HEIGHT = 80;

// ══════════════════════════════════════════════════════════
// POST /api/registros-asistencia/exportar
// Genera el Excel FT-SST-021 para un registro de asistencia
// Body: { registroRecordId: string }
// ══════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const { registroRecordId } = await request.json();
    if (!registroRecordId) {
      return NextResponse.json(
        { success: false, message: "registroRecordId es requerido" },
        { status: 400 }
      );
    }

    const {
      eventosCapacitacionTableId,
      eventosCapacitacionFields: evtF,
      asistenciaCapacitacionesTableId,
      asistenciaCapacitacionesFields: asisF,
    } = airtableSGSSTConfig;
    const sgHeaders = getSGSSTHeaders();

    // 1. Fetch cabecera
    const cabeceraUrl = `${getSGSSTUrl(eventosCapacitacionTableId)}/${registroRecordId}?returnFieldsByFieldId=true`;
    const cabeceraResponse = await fetch(cabeceraUrl, { headers: sgHeaders, cache: "no-store" });
    if (!cabeceraResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Registro no encontrado" },
        { status: 404 }
      );
    }
    const cabecera: AirtableRecord = await cabeceraResponse.json();
    const cf = cabecera.fields;
    const temasRaw = (cf[evtF.TEMAS_TRATADOS] as string) || "";
    const nombreEvento = temasRaw.split("\n")[0].replace(/^[-•]\s*/, "").trim() || "Evento";

    // 2. Fetch detalles (asistentes)
    const detalleIds = (cf[evtF.ASISTENCIA_LINK] as string[]) || [];
    let asistentes: AirtableRecord[] = [];

    if (detalleIds.length > 0) {
      const formula = `OR(${detalleIds.map((id) => `RECORD_ID()='${id}'`).join(",")})`;
      const detalleUrl = getSGSSTUrl(asistenciaCapacitacionesTableId);
      const params = new URLSearchParams({
        filterByFormula: formula,
        pageSize: "100",
        returnFieldsByFieldId: "true",
      });
      const detalleResponse = await fetch(`${detalleUrl}?${params.toString()}`, {
        headers: sgHeaders,
        cache: "no-store",
      });
      if (detalleResponse.ok) {
        const detalleData: AirtableListResponse = await detalleResponse.json();
        asistentes = detalleData.records;
      }
    }

    // 3. Construir Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sirius SG-SST";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Registro Asistencia", {
      properties: { defaultColWidth: 16 },
      pageSetup: {
        paperSize: 9, // A4
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
      },
    });

    // Columnas: ITEM | NOMBRES Y APELLIDOS | No. DE CÉDULA | LABOR | FIRMA
    ws.columns = [
      { width: 8  }, // A - ITEM
      { width: 30 }, // B - NOMBRES Y APELLIDOS
      { width: 18 }, // C - No. DE CÉDULA
      { width: 22 }, // D - LABOR
      { width: 36 }, // E - FIRMA
    ];

    let row = 1;

    // ── Cargar logo Sirius ──────────────────────────────
    let logoImageId: number | null = null;
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      const logoBuffer = fs.readFileSync(logoPath);
      logoImageId = workbook.addImage({ base64: logoBuffer.toString("base64"), extension: "png" });
    } catch { /* logo no disponible */ }

    // ── FILA 1: Logo + Nombre empresa ──────────────────
    ws.mergeCells(row, 1, row + 1, 1);
    const logoCell = ws.getCell(row, 1);
    logoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
    logoCell.border = allBorders;
    logoCell.alignment = { horizontal: "center", vertical: "middle" };
    if (logoImageId !== null) {
      ws.addImage(logoImageId, {
        tl: { col: 0.05, row: row - 1 + 0.05 } as unknown as ExcelJS.Anchor,
        ext: { width: 120, height: 50 },
        editAs: "oneCell",
      });
    }

    ws.mergeCells(row, 2, row, TOTAL_COLS);
    const companyCell = ws.getCell(row, 2);
    companyCell.value = "SIRIUS REGENERATIVE SOLUTIONS S.A.S. ZOMAC";
    companyCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: `FF${BRAND.WHITE}` } };
    companyCell.alignment = { horizontal: "center", vertical: "middle" };
    companyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
    companyCell.border = allBorders;
    for (let c = 3; c <= TOTAL_COLS; c++) {
      ws.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
      ws.getCell(row, c).border = allBorders;
    }
    ws.getRow(row).height = 32;
    row++;

    // ── FILA 2: NIT + CÓDIGO ───────────────────────────
    ws.mergeCells(row, 2, row, 3);
    const logoCellR2 = ws.getCell(row, 1);
    logoCellR2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
    logoCellR2.border = allBorders;

    const nitCell = ws.getCell(row, 2);
    nitCell.value = "NIT: 901.377.064-8";
    nitCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
    nitCell.alignment = { horizontal: "center", vertical: "middle" };
    nitCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.COTILEDON}` } };
    nitCell.border = allBorders;
    ws.getCell(row, 3).border = allBorders;

    ws.mergeCells(row, 4, row, TOTAL_COLS);
    const codeCell = ws.getCell(row, 4);
    codeCell.value = "CÓDIGO: FT-SST-021    VERSIÓN: 001    FECHA: 02-10-2023";
    codeCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
    codeCell.alignment = { horizontal: "center", vertical: "middle" };
    codeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.COTILEDON}` } };
    codeCell.border = allBorders;
    ws.getCell(row, 5).border = allBorders;
    ws.getRow(row).height = 20;
    row++;

    // ── FILA 3: Título ─────────────────────────────────
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    const titleCell = ws.getCell(row, 1);
    titleCell.value = "FORMATO REGISTRO DE ASISTENCIA";
    titleCell.font = { name: "Calibri", size: 13, bold: true, color: { argb: `FF${BRAND.WHITE}` } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_CIELO}` } };
    titleCell.border = allBorders;
    ws.getRow(row).height = 26;
    row++;

    // ── FILA 4: NOMBRE DEL EVENTO ──────────────────────
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    const eventoLabelCell = ws.getCell(row, 1);
    eventoLabelCell.value = `NOMBRE DEL EVENTO:  ${nombreEvento}`;
    eventoLabelCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${BRAND.IMPERIAL}` } };
    eventoLabelCell.alignment = { vertical: "middle" };
    eventoLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.SUTILEZA}` } };
    eventoLabelCell.border = allBorders;
    ws.getRow(row).height = 22;
    row++;

    // ── FILA 5: CIUDAD | FECHA | HORA DE INICIO ────────
    ws.mergeCells(row, 1, row, 2);
    const ciudadCell = ws.getCell(row, 1);
    ciudadCell.value = `CIUDAD:  ${(cf[evtF.CIUDAD] as string) || ""}`;
    ciudadCell.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
    ciudadCell.alignment = { vertical: "middle" };
    ciudadCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    ciudadCell.border = allBorders;
    ws.getCell(row, 2).border = allBorders;

    const fechaRaw = (cf[evtF.FECHA] as string) || "";
    let fechaFormateada = fechaRaw;
    try {
      if (fechaRaw) {
        const d = new Date(fechaRaw + "T12:00:00");
        fechaFormateada = d.toLocaleDateString("es-CO", {
          timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric"
        });
      }
    } catch { /* mantener raw */ }

    const fechaCell2 = ws.getCell(row, 3);
    fechaCell2.value = `FECHA:  ${fechaFormateada}`;
    fechaCell2.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
    fechaCell2.alignment = { vertical: "middle" };
    fechaCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    fechaCell2.border = allBorders;

    ws.mergeCells(row, 4, row, TOTAL_COLS);
    const horaCell = ws.getCell(row, 4);
    horaCell.value = `HORA DE INICIO:  ${(cf[evtF.HORA_INICIO] as string) || ""}`;
    horaCell.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
    horaCell.alignment = { vertical: "middle" };
    horaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    horaCell.border = allBorders;
    ws.getCell(row, 5).border = allBorders;
    ws.getRow(row).height = 20;
    row++;

    // ── FILA 6: LUGAR | DURACIÓN ────────────────────────
    ws.mergeCells(row, 1, row, 3);
    const lugarCell = ws.getCell(row, 1);
    lugarCell.value = `LUGAR:  ${(cf[evtF.LUGAR] as string) || ""}`;
    lugarCell.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
    lugarCell.alignment = { vertical: "middle" };
    lugarCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    lugarCell.border = allBorders;
    ws.getCell(row, 2).border = allBorders;
    ws.getCell(row, 3).border = allBorders;

    ws.mergeCells(row, 4, row, TOTAL_COLS);
    const duracionCell = ws.getCell(row, 4);
    duracionCell.value = `DURACIÓN:  ${(cf[evtF.DURACION] as string) || ""}`;
    duracionCell.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
    duracionCell.alignment = { vertical: "middle" };
    duracionCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    duracionCell.border = allBorders;
    ws.getCell(row, 5).border = allBorders;
    ws.getRow(row).height = 20;
    row++;

    // ── FILA 7: ÁREA ────────────────────────────────────
    const areaValor = (cf[evtF.AREA] as string) || "";
    const areaOpciones = ["OPERACIONES", "GERENCIA", "SG-SST", "OTRO"];
    const areaLabel = ws.getCell(row, 1);
    areaLabel.value = "ÁREA";
    areaLabel.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
    areaLabel.alignment = { horizontal: "center", vertical: "middle" };
    areaLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.SUTILEZA}` } };
    areaLabel.border = allBorders;

    // Mostrar cada opción con su checkbox (X si seleccionada)
    const areaCols = [2, 3, 4, 5];
    areaOpciones.forEach((opcion, idx) => {
      const cell = ws.getCell(row, areaCols[idx]);
      const isSelected = areaValor.toUpperCase() === opcion;
      cell.value = `${isSelected ? "☑" : "☐"}  ${opcion}`;
      cell.font = { name: "Calibri", size: 10, color: { argb: isSelected ? `FF${BRAND.AZUL_BARRANCA}` : `FF${BRAND.IMPERIAL}` }, bold: isSelected };
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
      cell.border = allBorders;
    });
    ws.getRow(row).height = 20;
    row++;

    // ── FILA 8: TIPO ────────────────────────────────────
    const tipoValor = (cf[evtF.TIPO] as string) || "";
    const tipoOpciones = ["INDUCCION", "CAPACITACION", "CHARLA", "OTRO"];
    const tipoLabel = ws.getCell(row, 1);
    tipoLabel.value = "TIPO";
    tipoLabel.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
    tipoLabel.alignment = { horizontal: "center", vertical: "middle" };
    tipoLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.SUTILEZA}` } };
    tipoLabel.border = allBorders;

    tipoOpciones.forEach((opcion, idx) => {
      const cell = ws.getCell(row, areaCols[idx]);
      const isSelected = tipoValor.toUpperCase() === opcion;
      cell.value = `${isSelected ? "☑" : "☐"}  ${opcion}`;
      cell.font = { name: "Calibri", size: 10, color: { argb: isSelected ? `FF${BRAND.AZUL_BARRANCA}` : `FF${BRAND.IMPERIAL}` }, bold: isSelected };
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
      cell.border = allBorders;
    });
    ws.getRow(row).height = 20;
    row++;

    // ── FILA 9+: TEMAS TRATADOS ─────────────────────────
    ws.mergeCells(row, 1, row, TOTAL_COLS);
    const temasHeaderCell = ws.getCell(row, 1);
    temasHeaderCell.value = "TEMAS TRATADOS";
    temasHeaderCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${BRAND.WHITE}` } };
    temasHeaderCell.alignment = { horizontal: "center", vertical: "middle" };
    temasHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
    temasHeaderCell.border = allBorders;
    ws.getRow(row).height = 20;
    row++;

    ws.mergeCells(row, 1, row + 2, TOTAL_COLS);
    const temasCell = ws.getCell(row, 1);
    temasCell.value = temasRaw;
    temasCell.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
    temasCell.alignment = { vertical: "top", wrapText: true };
    temasCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    temasCell.border = allBorders;
    for (let r2 = row; r2 <= row + 2; r2++) {
      ws.getRow(r2).height = 18;
      for (let c = 2; c <= TOTAL_COLS; c++) ws.getCell(r2, c).border = allBorders;
    }
    row += 3;

    // ── ENCABEZADO DE TABLA DE ASISTENTES ───────────────
    const colHeaders = ["ITEM", "NOMBRES Y APELLIDOS", "No. DE CÉDULA", "LABOR", "FIRMA"];
    colHeaders.forEach((header, idx) => {
      const cell = ws.getCell(row, idx + 1);
      cell.value = header;
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${BRAND.WHITE}` } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
      cell.border = allBorders;
    });
    ws.getRow(row).height = 22;
    row++;

    // ── FILAS DE ASISTENTES (mínimo 30) ─────────────────
    const rowCount = Math.max(asistentes.length, MIN_ROWS);
    for (let i = 0; i < rowCount; i++) {
      const asistente = asistentes[i];
      const isEven = i % 2 === 0;
      const rowBg = isEven ? BRAND.WHITE : BRAND.COTILEDON;

      // Intentar descifrar firma
      let signatureDataUrl: string | undefined;
      if (asistente) {
        const firmaEncriptada = asistente.fields[asisF.FIRMA_CONFIRMADA] as string | undefined;
        if (firmaEncriptada && AES_SECRET) {
          try {
            const decrypted = decryptAES(firmaEncriptada);
            const parsed = JSON.parse(decrypted);
            signatureDataUrl = parsed.signature;
          } catch { /* firma sin descifrar */ }
        }
      }

      const rowHeight = signatureDataUrl ? SIGNATURE_ROW_HEIGHT : 22;
      ws.getRow(row).height = rowHeight;

      // ITEM
      const itemCell = ws.getCell(row, 1);
      itemCell.value = i + 1;
      itemCell.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
      itemCell.alignment = { horizontal: "center", vertical: "middle" };
      itemCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
      itemCell.border = allBorders;

      // NOMBRE
      const nombreCell = ws.getCell(row, 2);
      nombreCell.value = asistente ? (asistente.fields[asisF.NOMBRES] as string) || "" : "";
      nombreCell.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
      nombreCell.alignment = { vertical: "middle", wrapText: true };
      nombreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
      nombreCell.border = allBorders;

      // CÉDULA
      const cedulaCell = ws.getCell(row, 3);
      cedulaCell.value = asistente ? (asistente.fields[asisF.CEDULA] as string) || "" : "";
      cedulaCell.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
      cedulaCell.alignment = { horizontal: "center", vertical: "middle" };
      cedulaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
      cedulaCell.border = allBorders;

      // LABOR
      const laborCell = ws.getCell(row, 4);
      laborCell.value = asistente ? (asistente.fields[asisF.LABOR] as string) || "" : "";
      laborCell.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
      laborCell.alignment = { vertical: "middle", wrapText: true };
      laborCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
      laborCell.border = allBorders;

      // FIRMA
      const firmaCell = ws.getCell(row, 5);
      firmaCell.alignment = { horizontal: "center", vertical: "middle" };
      firmaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
      firmaCell.border = allBorders;

      if (signatureDataUrl) {
        try {
          const matches = signatureDataUrl.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/);
          if (matches) {
            const extension = matches[1] === "jpg" ? "jpeg" : matches[1];
            let base64Data = matches[2];
            if (extension === "png") base64Data = convertSignatureToBlackTransparent(base64Data);
            const imageId = workbook.addImage({ base64: base64Data, extension: extension as "png" | "jpeg" | "gif" });
            ws.addImage(imageId, {
              tl: { col: 4.02, row: row - 1 + 0.05 } as unknown as ExcelJS.Anchor,
              ext: { width: 250, height: 70 },
              editAs: "oneCell",
            });
          }
        } catch { /* imagen no disponible */ }
      }

      row++;
    }

    // ── FOOTER: NOMBRE Y FIRMA DEL CONFERENCISTA ────────
    ws.getRow(row).height = 20;
    const confLabelCell = ws.getCell(row, 1);
    confLabelCell.value = "NOMBRE DEL CONFERENCISTA:";
    confLabelCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
    confLabelCell.alignment = { vertical: "middle" };
    confLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.SUTILEZA}` } };
    confLabelCell.border = allBorders;

    ws.mergeCells(row, 2, row, 3);
    const confNombreCell = ws.getCell(row, 2);
    confNombreCell.value = (cf[evtF.NOMBRE_CONFERENCISTA] as string) || "";
    confNombreCell.font = { name: "Calibri", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
    confNombreCell.alignment = { vertical: "middle" };
    confNombreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    confNombreCell.border = allBorders;
    ws.getCell(row, 3).border = allBorders;

    const confFirmaLabelCell = ws.getCell(row, 4);
    confFirmaLabelCell.value = "FIRMA DEL CONFERENCISTA:";
    confFirmaLabelCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
    confFirmaLabelCell.alignment = { vertical: "middle" };
    confFirmaLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.SUTILEZA}` } };
    confFirmaLabelCell.border = allBorders;

    // Firma del conferencista
    const firmaConfEncriptada = "";
    let confSignatureDataUrl: string | undefined;
    if (firmaConfEncriptada && AES_SECRET) {
      try {
        const decrypted = decryptAES(firmaConfEncriptada);
        const parsed = JSON.parse(decrypted);
        confSignatureDataUrl = parsed.signature;
      } catch { /* no descifrar */ }
    }

    const confFirmaCell = ws.getCell(row, 5);
    confFirmaCell.alignment = { horizontal: "center", vertical: "middle" };
    confFirmaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.WHITE}` } };
    confFirmaCell.border = allBorders;

    if (confSignatureDataUrl) {
      ws.getRow(row).height = SIGNATURE_ROW_HEIGHT;
      try {
        const matches = confSignatureDataUrl.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/);
        if (matches) {
          const extension = matches[1] === "jpg" ? "jpeg" : matches[1];
          let base64Data = matches[2];
          if (extension === "png") base64Data = convertSignatureToBlackTransparent(base64Data);
          const imageId = workbook.addImage({ base64: base64Data, extension: extension as "png" | "jpeg" | "gif" });
          ws.addImage(imageId, {
            tl: { col: 4.02, row: row - 1 + 0.05 } as unknown as ExcelJS.Anchor,
            ext: { width: 250, height: 70 },
            editAs: "oneCell",
          });
        }
      } catch { /* imagen no disponible */ }
    } else {
      ws.getRow(row).height = 50;
    }

    // 4. Generar buffer y retornar
    const buffer = await workbook.xlsx.writeBuffer();
    const nombreEventoFile = nombreEvento
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 40);
    const fechaStr = new Date().toISOString().slice(0, 10);
    const filename = `Asistencia_${nombreEventoFile}_${fechaStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generando Excel de registro de asistencia:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error al generar el archivo Excel" },
      { status: 500 }
    );
  }
}
