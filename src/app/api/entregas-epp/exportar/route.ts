import { NextResponse } from "next/server";
import crypto from "crypto";
import ExcelJS from "exceljs";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";
import {
  airtableInsumosConfig,
  getInsumosUrl,
  getInsumosHeaders,
} from "@/infrastructure/config/airtableInsumos";
import {
  airtableConfig,
  getAirtableUrl,
  getAirtableHeaders,
} from "@/infrastructure/config/airtable";

// ══════════════════════════════════════════════════════════
// Tipos
// ══════════════════════════════════════════════════════════
interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

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

// ══════════════════════════════════════════════════════════
// Helpers de paginación Airtable
// ══════════════════════════════════════════════════════════
async function fetchAllRecords(
  url: string,
  headers: HeadersInit,
  extraParams: Record<string, string> = {}
): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({
      pageSize: "100",
      returnFieldsByFieldId: "true",
      ...extraParams,
    });
    if (offset) params.set("offset", offset);

    const res = await fetch(`${url}?${params.toString()}`, { headers });
    if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
    const data: AirtableListResponse = await res.json();
    all.push(...data.records);
    offset = data.offset;
  } while (offset);

  return all;
}

async function fetchRecordsByIds(
  url: string,
  headers: HeadersInit,
  ids: string[]
): Promise<Map<string, AirtableRecord>> {
  const map = new Map<string, AirtableRecord>();
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const formula = `OR(${batch.map((id) => `RECORD_ID()='${id}'`).join(",")})`;
    const params = new URLSearchParams({
      filterByFormula: formula,
      pageSize: "100",
      returnFieldsByFieldId: "true",
    });
    const res = await fetch(`${url}?${params.toString()}`, { headers });
    if (res.ok) {
      const data: AirtableListResponse = await res.json();
      for (const r of data.records) map.set(r.id, r);
    }
  }
  return map;
}

// ══════════════════════════════════════════════════════════
// Helpers de procesamiento
// ══════════════════════════════════════════════════════════

/**
 * Parsea el campo AI "Referencia Comercial" de Airtable.
 * Airtable lo devuelve como JSON: {"state":"generated","value":"...","isStale":false}
 * Extrae solo el texto limpio de la referencia.
 */
function parseReferenciaComercial(raw: unknown): string {
  if (!raw) return "—";

  const str = typeof raw === "string" ? raw : JSON.stringify(raw);

  try {
    const parsed = typeof raw === "object" ? raw : JSON.parse(str);
    if (parsed && typeof parsed === "object" && "value" in (parsed as Record<string, unknown>)) {
      let value = String((parsed as Record<string, unknown>).value || "");
      value = value.replace(/^Referencia\s+comercial:\s*/i, "").trim();
      return value || "—";
    }
  } catch {
    // No es JSON, usar como texto plano
  }

  return str.trim() || "—";
}

/**
 * Convierte una firma PNG con trazos blancos sobre fondo transparente
 * a trazos negros sobre fondo transparente (solo invierte RGB donde hay alpha).
 * Las firmas nuevas ya vienen con trazo negro, pero las antiguas tienen trazo blanco.
 */
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
    const processed = Buffer.alloc(raw.length);
    const pixels = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      const filterType = raw[y * stride];
      processed[y * stride] = 0;

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
            const pa = Math.abs(p - a);
            const pb = Math.abs(p - b);
            const pc = Math.abs(p - c);
            const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc) ? b : c;
            val = (val + pr) & 0xff;
            break;
          }
        }

        pixels[y * width * 4 + x] = val;
      }
    }

    // Detectar si la firma tiene trazos blancos (antiguas) — si el pixel promedio
    // con alpha > 0 tiene R+G+B > 384 (brightness > 128 por canal), es blanca
    let totalBrightness = 0;
    let visiblePixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 20) {
        totalBrightness += pixels[i] + pixels[i + 1] + pixels[i + 2];
        visiblePixels++;
      }
    }
    const avgBrightness = visiblePixels > 0 ? totalBrightness / (visiblePixels * 3) : 0;

    // Solo invertir si la firma tiene trazos claros (> 180 de brightness promedio)
    if (avgBrightness > 180) {
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0) {
          pixels[i] = 255 - pixels[i];       // R
          pixels[i + 1] = 255 - pixels[i + 1]; // G
          pixels[i + 2] = 255 - pixels[i + 2]; // B
          // Alpha se mantiene → fondo transparente
        }
      }
    }

    // Si la firma tenía fondo blanco sólido (todas las transparencias son 255),
    // hacer transparente lo que era blanco puro
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], al = pixels[i + 3];
      // Blanco puro o casi blanco con alpha completo → transparente
      if (al > 250 && r > 245 && g > 245 && b > 245) {
        pixels[i + 3] = 0; // Hacer transparente
      }
    }

    // Write back
    for (let y = 0; y < height; y++) {
      processed[y * stride] = 0;
      pixels.copy(processed, y * stride + 1, y * width * 4, (y + 1) * width * 4);
    }

    const newCompressed = zlib.deflateSync(processed);

    // CRC32
    const crc32Table: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crc32Table[n] = c >>> 0;
    }
    const crc32 = (data: Buffer): number => {
      let c = 0xffffffff;
      for (let i = 0; i < data.length; i++) {
        c = (c >>> 8) ^ crc32Table[(c ^ data[i]) & 0xff];
      }
      return (c ^ 0xffffffff) >>> 0;
    };

    const chunks: Buffer[] = [];
    chunks.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const ihdr = Buffer.alloc(25);
    ihdr.writeUInt32BE(13, 0);
    ihdr.write("IHDR", 4);
    ihdr.writeUInt32BE(width, 8);
    ihdr.writeUInt32BE(height, 12);
    ihdr[16] = 8;
    ihdr[17] = 6; // RGBA
    ihdr[18] = 0;
    ihdr[19] = 0;
    ihdr[20] = 0;
    ihdr.writeUInt32BE(crc32(ihdr.slice(4, 21)), 21);
    chunks.push(ihdr);

    const idatHeader = Buffer.alloc(8);
    idatHeader.writeUInt32BE(newCompressed.length, 0);
    idatHeader.write("IDAT", 4);
    const idatCrcData = Buffer.concat([Buffer.from("IDAT"), newCompressed]);
    const idatCrc = Buffer.alloc(4);
    idatCrc.writeUInt32BE(crc32(idatCrcData), 0);
    chunks.push(idatHeader, newCompressed, idatCrc);

    chunks.push(Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]));

    return Buffer.concat(chunks).toString("base64");
  } catch (err) {
    console.error("Error converting signature colors:", err);
    return base64Data;
  }
}

// ══════════════════════════════════════════════════════════
// Estilos Excel
// ══════════════════════════════════════════════════════════
const ORANGE = "FF6B21";
const DARK_BG = "1A1A2E";
const HEADER_BG = "2D2D44";
const TOTAL_COLS = 5; // EPP, CANTIDAD, REFERENCIA, FECHA, FIRMA

const headerFont: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
  bold: true,
  color: { argb: "FFFFFFFF" },
};

const bodyFont: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 10,
  color: { argb: "FF333333" },
};

const thinBorder: Partial<ExcelJS.Border> = {
  style: "thin",
  color: { argb: "FFCCCCCC" },
};

const allBorders: Partial<ExcelJS.Borders> = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder,
};

// ══════════════════════════════════════════════════════════
// GET /api/entregas-epp/exportar
//
// Genera archivo Excel (.xlsx) con el formato FT-SST-029
// Incluye firma descifrada como imagen PNG transparente
// ══════════════════════════════════════════════════════════
export async function GET() {
  try {
    const sgHeaders = getSGSSTHeaders();
    const insHeaders = getInsumosHeaders();
    const authHeaders = getAirtableHeaders();

    const {
      entregasTableId,
      entregasFields,
      detalleTableId,
      detalleFields,
      tokensTableId,
      tokensFields,
    } = airtableSGSSTConfig;

    const { insumoTableId, insumoFields } = airtableInsumosConfig;
    const { personalTableId, personalFields } = airtableConfig;

    // ── 1. Fetch all data in parallel ───────────────────
    const [allEntregas, allInsumos, allPersonal] = await Promise.all([
      fetchAllRecords(getSGSSTUrl(entregasTableId), sgHeaders, {
        [`sort[0][field]`]: entregasFields.FECHA_ENTREGA,
        [`sort[0][direction]`]: "desc",
      }),
      fetchAllRecords(getInsumosUrl(insumoTableId), insHeaders),
      fetchAllRecords(getAirtableUrl(personalTableId), authHeaders),
    ]);

    // ── 2. Build lookup maps ────────────────────────────
    const insumoMap = new Map<
      string,
      { nombre: string; referencia: string; codigo: string }
    >();
    for (const r of allInsumos) {
      const f = r.fields;
      const codigo = (f[insumoFields.CODIGO] as string) || "";
      insumoMap.set(codigo, {
        nombre: (f[insumoFields.NOMBRE] as string) || codigo,
        referencia: parseReferenciaComercial(f[insumoFields.REFERENCIA_COMERCIAL]),
        codigo,
      });
    }

    const personalMap = new Map<
      string,
      { nombre: string; documento: string }
    >();
    for (const r of allPersonal) {
      const f = r.fields;
      const idEmp = (f[personalFields.ID_EMPLEADO] as string) || "";
      personalMap.set(idEmp, {
        nombre: (f[personalFields.NOMBRE_COMPLETO] as string) || idEmp,
        documento: (f[personalFields.NUMERO_DOCUMENTO] as string) || "",
      });
    }

    // ── 3. Collect linked IDs ───────────────────────────
    const detalleIds = new Set<string>();
    const tokenIds = new Set<string>();

    for (const ent of allEntregas) {
      const dLinks = ent.fields[entregasFields.DETALLE_LINK] as string[] | undefined;
      const tLinks = ent.fields[entregasFields.TOKENS_LINK] as string[] | undefined;
      dLinks?.forEach((id) => detalleIds.add(id));
      tLinks?.forEach((id) => tokenIds.add(id));
    }

    // ── 4. Fetch detalles and tokens ────────────────────
    const [detalleMap, tokenMap] = await Promise.all([
      fetchRecordsByIds(getSGSSTUrl(detalleTableId), sgHeaders, Array.from(detalleIds)),
      fetchRecordsByIds(getSGSSTUrl(tokensTableId), sgHeaders, Array.from(tokenIds)),
    ]);

    // ── 5. Group entregas by employee ───────────────────
    interface EntregaRow {
      eppNombre: string;
      cantidad: number;
      referencia: string;
      fechaEntrega: string;
      motivo: string;
      estado: string;
      signatureDataUrl?: string;
    }

    interface EmpleadoGroup {
      nombre: string;
      documento: string;
      idEmpleado: string;
      rows: EntregaRow[];
    }

    const empleadoGroups = new Map<string, EmpleadoGroup>();

    for (const ent of allEntregas) {
      const f = ent.fields;
      const idEmp = (f[entregasFields.ID_EMPLEADO_CORE] as string) || "Desconocido";
      const fechaEntrega = (f[entregasFields.FECHA_ENTREGA] as string) || "";
      const motivo = (f[entregasFields.MOTIVO] as string) || "";
      const estado = (f[entregasFields.ESTADO] as string) || "";

      const empInfo = personalMap.get(idEmp) || {
        nombre: idEmp,
        documento: "",
      };

      if (!empleadoGroups.has(idEmp)) {
        empleadoGroups.set(idEmp, {
          nombre: empInfo.nombre,
          documento: empInfo.documento,
          idEmpleado: idEmp,
          rows: [],
        });
      }
      const group = empleadoGroups.get(idEmp)!;

      // Decrypt signature if available
      let signatureDataUrl: string | undefined;
      const tLinks = (f[entregasFields.TOKENS_LINK] as string[]) || [];
      for (const tId of tLinks) {
        const tokRec = tokenMap.get(tId);
        if (!tokRec) continue;
        const tokFields = tokRec.fields;
        const hashFirma = (tokFields[tokensFields.HASH_FIRMA] as string) || "";
        const tokEstado = (tokFields[tokensFields.ESTADO] as string) || "";

        if (hashFirma && tokEstado === "Usado") {
          try {
            const decrypted = decryptAES(hashFirma);
            const parsed = JSON.parse(decrypted);
            signatureDataUrl = parsed.signature;
          } catch (err) {
            console.error("Error decrypting signature for export:", err);
          }
          break;
        }
      }

      // Get detalles for this entrega — la firma va en TODAS las filas
      const dLinks = (f[entregasFields.DETALLE_LINK] as string[]) || [];
      if (dLinks.length === 0) {
        group.rows.push({
          eppNombre: "—",
          cantidad: 0,
          referencia: "—",
          fechaEntrega,
          motivo,
          estado,
          signatureDataUrl,
        });
      } else {
        for (const dId of dLinks) {
          const detRec = detalleMap.get(dId);
          if (!detRec) continue;
          const df = detRec.fields;
          const codigoInsumo = (df[detalleFields.CODIGO_INSUMO] as string) || "";
          const insumoInfo = insumoMap.get(codigoInsumo);

          group.rows.push({
            eppNombre: insumoInfo?.nombre || codigoInsumo || "—",
            cantidad: (df[detalleFields.CANTIDAD] as number) || 0,
            referencia: insumoInfo?.referencia || "—",
            fechaEntrega,
            motivo,
            estado,
            signatureDataUrl, // Firma en TODAS las filas del detalle
          });
        }
      }
    }

    // ── 6. Create Excel Workbook ────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sirius SG-SST";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Entregas EPP", {
      properties: { defaultColWidth: 16 },
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.6,
          bottom: 0.6,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    // 5 columnas: EPP, CANTIDAD, REFERENCIA, FECHA, FIRMA
    ws.columns = [
      { width: 32 }, // A - EPP ENTREGADO
      { width: 12 }, // B - CANTIDAD
      { width: 22 }, // C - REFERENCIA
      { width: 18 }, // D - FECHA DE ENTREGA
      { width: 30 }, // E - FIRMA (ancha para imagen)
    ];

    let currentRow = 1;
    const SIGNATURE_ROW_HEIGHT = 80;

    for (const [, group] of empleadoGroups) {
      // ─── Company Header ───────────────────────────────
      ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
      const companyCell = ws.getCell(currentRow, 1);
      companyCell.value = "SIRIUS REGENERATIVE SOLUTIONS S.A.S. ZOMAC";
      companyCell.font = {
        name: "Calibri",
        size: 14,
        bold: true,
        color: { argb: `FF${ORANGE}` },
      };
      companyCell.alignment = { horizontal: "center", vertical: "middle" };
      companyCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${DARK_BG}` },
      };
      companyCell.border = allBorders;
      ws.getRow(currentRow).height = 30;
      currentRow++;

      // NIT + CÓDIGO
      ws.mergeCells(currentRow, 1, currentRow, 2);
      const nitCell = ws.getCell(currentRow, 1);
      nitCell.value = "NIT: 901.377.064-8";
      nitCell.font = { name: "Calibri", size: 10, color: { argb: "FF666666" } };
      nitCell.alignment = { horizontal: "center", vertical: "middle" };
      nitCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F5F5" },
      };
      nitCell.border = allBorders;

      ws.mergeCells(currentRow, 3, currentRow, TOTAL_COLS);
      const codeCell = ws.getCell(currentRow, 3);
      codeCell.value = "CÓDIGO: FT-SST-029";
      codeCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF666666" } };
      codeCell.alignment = { horizontal: "center", vertical: "middle" };
      codeCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F5F5" },
      };
      codeCell.border = allBorders;
      ws.getRow(currentRow).height = 22;
      currentRow++;

      // Title
      ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
      const titleCell = ws.getCell(currentRow, 1);
      titleCell.value = "FORMATO DE ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL";
      titleCell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${ORANGE}` },
      };
      titleCell.border = allBorders;
      ws.getRow(currentRow).height = 26;
      currentRow++;

      // Employee info
      ws.mergeCells(currentRow, 1, currentRow, 2);
      const nameCell = ws.getCell(currentRow, 1);
      nameCell.value = `NOMBRE DEL TRABAJADOR: ${group.nombre}`;
      nameCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF333333" } };
      nameCell.alignment = { vertical: "middle" };
      nameCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFAFAFA" },
      };
      nameCell.border = allBorders;

      ws.mergeCells(currentRow, 3, currentRow, TOTAL_COLS);
      const docCell = ws.getCell(currentRow, 3);
      docCell.value = `CC: ${group.documento}`;
      docCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF333333" } };
      docCell.alignment = { vertical: "middle" };
      docCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFAFAFA" },
      };
      docCell.border = allBorders;
      ws.getRow(currentRow).height = 24;
      currentRow++;

      // Column headers (sin TALLA)
      const colHeaders = [
        "EPP ENTREGADO",
        "CANTIDAD",
        "REFERENCIA",
        "FECHA DE ENTREGA",
        "FIRMA",
      ];
      colHeaders.forEach((header, idx) => {
        const cell = ws.getCell(currentRow, idx + 1);
        cell.value = header;
        cell.font = headerFont;
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${HEADER_BG}` },
        };
        cell.border = allBorders;
      });
      ws.getRow(currentRow).height = 24;
      currentRow++;

      // ─── Data Rows ────────────────────────────────────
      for (const row of group.rows) {
        const dataRow = currentRow;

        // Todas las filas con firma tienen altura grande para la imagen
        ws.getRow(dataRow).height = row.signatureDataUrl ? SIGNATURE_ROW_HEIGHT : 22;

        // A: EPP name
        const eppCell = ws.getCell(dataRow, 1);
        eppCell.value = row.eppNombre;
        eppCell.font = bodyFont;
        eppCell.alignment = { vertical: "middle", wrapText: true };
        eppCell.border = allBorders;

        // B: Cantidad
        const cantCell = ws.getCell(dataRow, 2);
        cantCell.value = row.cantidad;
        cantCell.font = { ...bodyFont, bold: true };
        cantCell.alignment = { horizontal: "center", vertical: "middle" };
        cantCell.border = allBorders;

        // C: Referencia
        const refCell = ws.getCell(dataRow, 3);
        refCell.value = row.referencia;
        refCell.font = bodyFont;
        refCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        refCell.border = allBorders;

        // D: Fecha
        const fechaCell = ws.getCell(dataRow, 4);
        if (row.fechaEntrega) {
          try {
            const date = new Date(row.fechaEntrega);
            fechaCell.value = date.toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          } catch {
            fechaCell.value = row.fechaEntrega;
          }
        } else {
          fechaCell.value = "—";
        }
        fechaCell.font = bodyFont;
        fechaCell.alignment = { horizontal: "center", vertical: "middle" };
        fechaCell.border = allBorders;

        // E: Firma — imagen PNG transparente en TODAS las filas
        const firmaCell = ws.getCell(dataRow, 5);
        firmaCell.border = allBorders;
        firmaCell.alignment = { horizontal: "center", vertical: "middle" };

        if (row.signatureDataUrl) {
          try {
            const matches = row.signatureDataUrl.match(
              /^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/
            );
            if (matches) {
              const extension = matches[1] === "jpg" ? "jpeg" : matches[1];
              let base64Data = matches[2];

              // Para firmas antiguas con trazo blanco → invertir a negro + transparente
              if (extension === "png") {
                base64Data = convertSignatureToBlackTransparent(base64Data);
              }

              const imageId = workbook.addImage({
                base64: base64Data,
                extension: extension as "png" | "jpeg" | "gif",
              });

              // Imagen que llena la celda FIRMA (col E = index 4)
              ws.addImage(imageId, {
                tl: { col: 4.02, row: dataRow - 1 + 0.05 } as unknown as ExcelJS.Anchor,
                br: { col: 4.98, row: dataRow - 1 + 0.95 } as unknown as ExcelJS.Anchor,
                editAs: "oneCell",
              });
            }
          } catch (err) {
            console.error("Error adding signature image:", err);
          }
        } else if (row.estado === "Pendiente") {
          firmaCell.value = "Pendiente";
          firmaCell.font = {
            name: "Calibri",
            size: 9,
            color: { argb: "FFAAAAAA" },
            italic: true,
          };
        }

        currentRow++;
      }

      // ─── Footer row with motivo ───────────────────────
      ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
      const footerCell = ws.getCell(currentRow, 1);
      const motivos = [...new Set(group.rows.map((r) => r.motivo).filter(Boolean))];
      footerCell.value = `Motivo: ${motivos.join(", ") || "—"}`;
      footerCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF888888" } };
      footerCell.alignment = { vertical: "middle" };
      footerCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9F9F9" },
      };
      footerCell.border = allBorders;
      ws.getRow(currentRow).height = 20;
      currentRow++;

      // Spacer between employee sections
      currentRow += 2;
    }

    // ── 7. Generate buffer ──────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();

    // ── 8. Return as downloadable file ──────────────────
    const fecha = new Date().toISOString().slice(0, 10);
    const filename = `Entregas_EPP_Sirius_${fecha}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating Excel export:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Error al generar el archivo Excel",
      },
      { status: 500 }
    );
  }
}
