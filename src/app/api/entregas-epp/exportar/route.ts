import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import sharp from "sharp";
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
import { requireAuth } from "@/lib/authMiddleware";

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
 * Convierte una firma PNG a trazos negros sobre fondo transparente.
 * Maneja múltiples casos:
 * - Firmas con fondo blanco y trazo negro → solo hace el fondo transparente
 * - Firmas con fondo negro y trazo blanco → invierte colores y hace fondo transparente
 * - Firmas con fondo transparente y trazo blanco → invierte trazo a negro
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

    // Muestrear las 4 esquinas para determinar el color del fondo
    // (las esquinas siempre son fondo, no trazo)
    const cornerSamples: number[] = [];
    const sampleSize = 10; // pixels a muestrear en cada esquina

    // Esquina superior izquierda
    for (let y = 0; y < sampleSize && y < height; y++) {
      for (let x = 0; x < sampleSize && x < width; x++) {
        const i = (y * width + x) * 4;
        if (pixels[i + 3] > 200) { // Solo pixels opacos
          cornerSamples.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
        }
      }
    }
    // Esquina superior derecha
    for (let y = 0; y < sampleSize && y < height; y++) {
      for (let x = Math.max(0, width - sampleSize); x < width; x++) {
        const i = (y * width + x) * 4;
        if (pixels[i + 3] > 200) {
          cornerSamples.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
        }
      }
    }
    // Esquina inferior izquierda
    for (let y = Math.max(0, height - sampleSize); y < height; y++) {
      for (let x = 0; x < sampleSize && x < width; x++) {
        const i = (y * width + x) * 4;
        if (pixels[i + 3] > 200) {
          cornerSamples.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
        }
      }
    }
    // Esquina inferior derecha
    for (let y = Math.max(0, height - sampleSize); y < height; y++) {
      for (let x = Math.max(0, width - sampleSize); x < width; x++) {
        const i = (y * width + x) * 4;
        if (pixels[i + 3] > 200) {
          cornerSamples.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
        }
      }
    }

    // Calcular brillo promedio del fondo
    const avgCornerBrightness = cornerSamples.length > 0
      ? cornerSamples.reduce((a, b) => a + b, 0) / cornerSamples.length
      : 128;

    // Si el fondo es oscuro (< 80), la firma tiene fondo negro → invertir
    const hasDarkBackground = avgCornerBrightness < 80;

    if (hasDarkBackground) {
      // Invertir TODOS los colores (el fondo negro se vuelve blanco, el trazo blanco se vuelve negro)
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 255 - pixels[i];       // R
        pixels[i + 1] = 255 - pixels[i + 1]; // G
        pixels[i + 2] = 255 - pixels[i + 2]; // B
        // Alpha se mantiene
      }
    }

    // Ahora hacer transparente todo lo que sea blanco/casi blanco
    // (esto elimina el fondo, sea originalmente blanco o negro invertido a blanco)
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const brightness = (r + g + b) / 3;
      // Pixel claro → transparente (umbral 230 para cubrir blancos y grises muy claros)
      if (brightness > 230) {
        pixels[i + 3] = 0;
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
// Paleta corporativa sobria — reemplaza el azul intenso del
// manual de marca por un azul pizarra apto para documentos
// impresos (formatos legales del SG-SST).
// ══════════════════════════════════════════════════════════
const BRAND = {
  AZUL_BARRANCA: "1F3D5C",   // Azul pizarra — membrete y encabezado de tabla
  AZUL_CIELO: "4A7A96",      // Azul medio — banda de evidencias
  SUTILEZA: "DCE6EE",        // Fondo claro azul — franja del acta
  COTILEDON: "F5F8FA",       // Banda suave — filas alternas
  IMPERIAL: "2E3A46",        // Gris grafito — texto de cuerpo
  VERDE_ALEGRIA: "7C9A72",   // Verde salvia — línea de cierre
  WHITE: "FFFFFF",
  LIGHT_GRAY: "FAFBFC",
  BORDER: "E2E8F0",          // Borde gris muy suave
  BORDER_MEDIUM: "CBD5E1",   // Borde gris medio
  BORDER_STRONG: "94A3B8",   // Borde gris fuerte para separación
};

const TOTAL_COLS = 5; // EPP, CANTIDAD, REFERENCIA, FECHA, FIRMA

const brandBorder: Partial<ExcelJS.Border> = {
  style: "thin",
  color: { argb: `FF${BRAND.BORDER}` },
};

const mediumBorder: Partial<ExcelJS.Border> = {
  style: "thin",
  color: { argb: `FF${BRAND.BORDER_MEDIUM}` },
};

const strongBorder: Partial<ExcelJS.Border> = {
  style: "medium",
  color: { argb: `FF${BRAND.BORDER_STRONG}` },
};

const allBorders: Partial<ExcelJS.Borders> = {
  top: brandBorder,
  left: brandBorder,
  bottom: brandBorder,
  right: brandBorder,
};

const tableBorders: Partial<ExcelJS.Borders> = {
  top: mediumBorder,
  left: mediumBorder,
  bottom: mediumBorder,
  right: mediumBorder,
};

// ══════════════════════════════════════════════════════════
// Helper: Descarga una evidencia y devuelve sus dimensiones
//
// sharp.rotate() aplica la orientación EXIF del celular; sin esto las
// fotos verticales entran acostadas. Las dimensiones se usan para
// dibujarlas sin deformar.
// ══════════════════════════════════════════════════════════
interface Evidencia {
  base64: string;
  ancho: number;
  alto: number;
}

async function fetchEvidencia(url: string): Promise<Evidencia | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const original = Buffer.from(await res.arrayBuffer());
    const { data, info } = await sharp(original)
      .rotate()
      .resize(700, 700, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return {
      base64: data.toString("base64"),
      ancho: info.width,
      alto: info.height,
    };
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════
// GET /api/entregas-epp/exportar
//
// Genera archivo Excel (.xlsx) con el formato FT-SST-029
// Incluye firma descifrada como imagen PNG transparente
// ══════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  // Verificar autenticación
  const authResult = await requireAuth(req);
  if (!authResult.authenticated) return authResult.response;

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

    const { insumoTableId, insumoFields, categoriaTableId, categoriaFields } = airtableInsumosConfig;
    const { personalTableId, personalFields } = airtableConfig;

    // ── Optional filters ────────────────────────────────
    const mes = req.nextUrl.searchParams.get("mes");
    const tipo = req.nextUrl.searchParams.get("tipo"); // "epp" | "dotacion"
    const entregasExtraParams: Record<string, string> = {
      [`sort[0][field]`]: entregasFields.FECHA_ENTREGA,
      [`sort[0][direction]`]: "desc",
    };
    if (mes && /^\d{4}-\d{2}$/.test(mes)) {
      const [year, month] = mes.split("-").map(Number);
      entregasExtraParams.filterByFormula =
        `AND(YEAR({${entregasFields.FECHA_ENTREGA}})=${year},MONTH({${entregasFields.FECHA_ENTREGA}})=${month})`;
    }

    // ── 1. Fetch all data in parallel ───────────────────
    const [allEntregas, allInsumos, allPersonal, allCategorias] = await Promise.all([
      fetchAllRecords(getSGSSTUrl(entregasTableId), sgHeaders, entregasExtraParams),
      fetchAllRecords(getInsumosUrl(insumoTableId), insHeaders),
      fetchAllRecords(getAirtableUrl(personalTableId), authHeaders),
      tipo
        ? fetchAllRecords(getInsumosUrl(categoriaTableId), insHeaders)
        : Promise.resolve([]),
    ]);

    if (allEntregas.length === 0) {
      return NextResponse.json(
        { success: false, message: mes ? `No hay entregas para el mes ${mes}` : "No hay entregas registradas" },
        { status: 404 }
      );
    }

    // ── 2. Build lookup maps ────────────────────────────

    // Map de categoría recordId → tipo ("EPP", "Dotación", etc.)
    const categoryTipoMap = new Map<string, string>();
    for (const cat of allCategorias) {
      const tipoVal = (cat.fields[categoriaFields.TIPO] as string) || "";
      categoryTipoMap.set(cat.id, tipoVal);
    }

    const insumoMap = new Map<
      string,
      { nombre: string; referencia: string; codigo: string; categoriaIds: string[] }
    >();
    for (const r of allInsumos) {
      const f = r.fields;
      const codigo = (f[insumoFields.CODIGO] as string) || "";
      insumoMap.set(codigo, {
        nombre: (f[insumoFields.NOMBRE] as string) || codigo,
        referencia: parseReferenciaComercial(f[insumoFields.REFERENCIA_COMERCIAL]),
        codigo,
        categoriaIds: (f[insumoFields.CATEGORIA] as string[]) || [],
      });
    }

    // Set de códigos de insumo que coinciden con el tipo solicitado
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const tipoFilterCodes = new Set<string>();
    if (tipo) {
      const targetNorm = normalize(tipo);
      for (const [codigo, info] of insumoMap) {
        const matchesTipo = info.categoriaIds.some((catId) => {
          const catTipo = categoryTipoMap.get(catId) || "";
          return normalize(catTipo) === targetNorm;
        });
        if (matchesTipo) tipoFilterCodes.add(codigo);
      }
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
      fotoUrls: string[];  // URLs de evidencia fotográfica de la última entrega
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
          fotoUrls: [],
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
      // Registrar conteo antes para detectar si esta entrega aporta filas al filtro actual
      const rowCountBefore = group.rows.length;
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

          // Filtrar por tipo de insumo (EPP / Dotación)
          if (tipo && tipoFilterCodes.size > 0 && !tipoFilterCodes.has(codigoInsumo)) continue;

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

      // Fotos: solo de la entrega más reciente que aporte filas al filtro de tipo actual.
      // Esto evita que fotos de Dotación aparezcan en el reporte de EPP y viceversa.
      if (group.rows.length > rowCountBefore && group.fotoUrls.length === 0) {
        const fotoField = f[entregasFields.FOTO_EVIDENCIA_URL];
        if (Array.isArray(fotoField) && fotoField.length > 0) {
          const urls = (fotoField as { url: string }[]).map((a) => a.url).filter(Boolean);
          if (urls.length > 0) group.fotoUrls.push(...urls);
        }
      }
    }

    // ── 6. Create Excel Workbook ────────────────────────
    // Eliminar grupos de empleados sin filas después del filtrado
    if (tipo) {
      for (const [key, group] of empleadoGroups) {
        if (group.rows.length === 0) empleadoGroups.delete(key);
      }
    }

    if (empleadoGroups.size === 0) {
      const tipoLabel = tipo === "dotacion" ? "Dotación" : "EPP";
      return NextResponse.json(
        { success: false, message: `No hay entregas de ${tipoLabel} para el período seleccionado` },
        { status: 404 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sirius SG-SST";
    workbook.created = new Date();

    const codigoFormato = tipo === "dotacion" ? "FT-SST-023" : "FT-SST-029";
    const sheetName = tipo === "dotacion" ? "Entregas Dotación" : "Entregas EPP";
    const ws = workbook.addWorksheet(sheetName, {
      properties: { defaultColWidth: 16 },
      // A4 vertical, un acta por página. fitToHeight 0 deja que los saltos
      // de página manuales manden sobre el alto.
      pageSetup: {
        paperSize: 9, // A4
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        margins: {
          left: 0.25, // 18 pt
          right: 0.25, // 18 pt
          top: 0.28, // 20 pt
          bottom: 0.33, // 24 pt
          header: 0.2,
          footer: 0.2,
        },
      },
      headerFooter: {
        oddFooter: `&C&"Segoe UI"&8Página &P de &N&R&"Segoe UI"&8${codigoFormato}`,
      },
      views: [{ showGridLines: false }],
    });

    // 5 columnas: EPP, CANTIDAD, REFERENCIA, FECHA, FIRMA
    ws.columns = [
      { width: 30 }, // A - EPP ENTREGADO
      { width: 11 }, // B - CANTIDAD
      { width: 20 }, // C - REFERENCIA
      { width: 15 }, // D - FECHA DE ENTREGA
      { width: 38 }, // E - FIRMA
    ];

    // Ancho en píxeles de cada columna (ExcelJS ancla las imágenes por
    // fracción de columna, así que se necesita para centrarlas).
    const anchoPx = (unidades: number) => Math.round(unidades * 7 + 5);
    const COLS_PX = [30, 11, 20, 15, 38].map(anchoPx);
    const COL_A_PX = COLS_PX[0];
    const COL_E_PX = COLS_PX[4];
    const TOTAL_PX = COLS_PX.reduce((t, w) => t + w, 0);

    // ExcelJS calcula la fracción de columna con una unidad propia que no
    // corresponde a píxeles reales, así que las imágenes se anclan con
    // desplazamientos nativos en EMU (1 px = 9525 EMU), que es lo que lee Excel.
    const EMU_POR_PX = 9525;

    /**
     * Traduce un desplazamiento absoluto en píxeles (desde el borde izquierdo
     * de la hoja) al ancla nativa: columna + desplazamiento en EMU.
     */
    const anclaNativa = (px: number): { nativeCol: number; nativeColOff: number } => {
      let restante = Math.max(0, px);
      for (let i = 0; i < COLS_PX.length; i++) {
        if (restante < COLS_PX[i]) {
          return { nativeCol: i, nativeColOff: Math.round(restante * EMU_POR_PX) };
        }
        restante -= COLS_PX[i];
      }
      return { nativeCol: COLS_PX.length - 1, nativeColOff: 0 };
    };

    let currentRow = 1;
    const SIGNATURE_ROW_HEIGHT = 70;
    const HEADER_ROW_HEIGHT = 40; // membrete (logo + razón social)
    const SUBHEADER_ROW_HEIGHT = 22; // NIT + código del formato
    // Filas donde arranca cada acta — se usan para los saltos de página
    const iniciosDeActa: number[] = [];

    // Alto útil de una hoja A4 vertical, en puntos y antes de la escala de
    // "ajustar a 1 página de ancho". La escala se midió imprimiendo el
    // archivo con Excel: las 5 columnas entran al ~96 %.
    const ESCALA_IMPRESION = 0.96;
    const ALTO_UTIL_A4 = Math.floor((842 - 20 - 24) / ESCALA_IMPRESION) - 20;
    const ALTO_CIERRE_ACTA = 24 + 6 + 8; // motivo + línea de acento + respiro
    const ALTO_MAX_GALERIA = 240;

    const sumarAltoDeFilas = (desde: number, hasta: number): number => {
      let total = 0;
      for (let r = desde; r <= hasta; r++) total += ws.getRow(r).height ?? 15;
      return total;
    };

    // ── Load Sirius logo ────────────────────────────────
    let logoImageId: number | null = null;
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = logoBuffer.toString("base64");
      logoImageId = workbook.addImage({
        base64: logoBase64,
        extension: "png",
      });
    } catch (err) {
      console.error("Could not load Sirius logo:", err);
    }

    for (const [, group] of empleadoGroups) {
      const inicioActa = currentRow;
      iniciosDeActa.push(inicioActa);

      // ═══════════════════════════════════════════════════
      // HEADER SECTION — membrete azul pizarra con logo Sirius
      // ═══════════════════════════════════════════════════

      // Row 1: Logo + Company name bar
      ws.mergeCells(currentRow, 1, currentRow + 1, 1); // Logo ocupa 2 filas en col A
      ws.mergeCells(currentRow, 2, currentRow, TOTAL_COLS);

      // Logo cell background
      const logoCell = ws.getCell(currentRow, 1);
      logoCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` },
      };
      logoCell.border = allBorders;
      logoCell.alignment = { horizontal: "center", vertical: "middle" };

      // Logo centrado dentro de la celda fusionada A(fila)–A(fila+1).
      // El ancla de ExcelJS es (columna + fracción de su ancho), así que el
      // centrado se calcula contra el ancho real de la columna A.
      if (logoImageId !== null) {
        const LOGO_WIDTH = 139; // 104 pt
        const LOGO_HEIGHT = 69; // 52 pt
        // El bloque del logo son las dos filas del membrete
        const bloquePx = (HEADER_ROW_HEIGHT + SUBHEADER_ROW_HEIGHT) * (4 / 3);

        const margenX = Math.max(0, (COL_A_PX - LOGO_WIDTH) / 2);
        const margenY = Math.max(0, (bloquePx - LOGO_HEIGHT) / 2);

        ws.addImage(logoImageId, {
          tl: {
            nativeCol: 0,
            nativeColOff: Math.round(margenX * EMU_POR_PX),
            nativeRow: currentRow - 1,
            nativeRowOff: Math.round(margenY * EMU_POR_PX),
          } as unknown as ExcelJS.Anchor,
          ext: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
          editAs: "oneCell", // Mantiene tamaño fijo al redimensionar celda
        });
      }

      const companyCell = ws.getCell(currentRow, 2);
      companyCell.value = "SIRIUS REGENERATIVE SOLUTIONS S.A.S. ZOMAC";
      companyCell.font = {
        name: "Segoe UI",
        size: 14,
        bold: true,
        color: { argb: `FF${BRAND.WHITE}` },
      };
      companyCell.alignment = { horizontal: "center", vertical: "middle" };
      companyCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` },
      };
      companyCell.border = { top: strongBorder, left: brandBorder, bottom: brandBorder, right: strongBorder };
      // Apply fill to all merged cells in top row
      for (let c = 3; c <= TOTAL_COLS; c++) {
        const mc = ws.getCell(currentRow, c);
        mc.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` },
        };
        mc.border = allBorders;
      }
      ws.getRow(currentRow).height = HEADER_ROW_HEIGHT;
      currentRow++;

      // Row 2: NIT + CÓDIGO del formato
      ws.mergeCells(currentRow, 2, currentRow, 3);
      // Logo cell row 2 (already merged with row 1 col A)
      const logoCellR2 = ws.getCell(currentRow, 1);
      logoCellR2.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` },
      };
      logoCellR2.border = allBorders;

      const nitCell = ws.getCell(currentRow, 2);
      nitCell.value = "NIT: 901.377.064-8";
      nitCell.font = { name: "Segoe UI", size: 9, bold: false, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
      nitCell.alignment = { horizontal: "center", vertical: "middle" };
      nitCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.WHITE}` },
      };
      nitCell.border = { top: brandBorder, left: brandBorder, bottom: strongBorder, right: brandBorder };
      // Cell 3 is merged with 2
      ws.getCell(currentRow, 3).border = allBorders;

      ws.mergeCells(currentRow, 4, currentRow, TOTAL_COLS);
      const codeCell = ws.getCell(currentRow, 4);
      codeCell.value = `CÓDIGO: ${codigoFormato}`;
      codeCell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
      codeCell.alignment = { horizontal: "center", vertical: "middle" };
      codeCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.WHITE}` },
      };
      codeCell.border = { top: brandBorder, left: brandBorder, bottom: strongBorder, right: strongBorder };
      ws.getCell(currentRow, 5).border = { top: brandBorder, left: brandBorder, bottom: strongBorder, right: strongBorder };
      ws.getRow(currentRow).height = SUBHEADER_ROW_HEIGHT;
      currentRow++;

      // Row 3: Title bar
      ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
      const titleCell = ws.getCell(currentRow, 1);
      titleCell.value = tipo === "dotacion"
        ? "FORMATO DE ENTREGA DE DOTACIÓN"
        : "FORMATO DE ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL";
      titleCell.font = {
        name: "Segoe UI",
        size: 13,
        bold: true,
        color: { argb: `FF${BRAND.WHITE}` },
      };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` },
      };
      titleCell.border = { top: strongBorder, left: strongBorder, bottom: strongBorder, right: strongBorder };
      ws.getRow(currentRow).height = 28;
      currentRow++;

      // Row 4: Employee info (diseño mejorado con gradiente visual)
      ws.mergeCells(currentRow, 1, currentRow, 3);
      const nameCell = ws.getCell(currentRow, 1);
      nameCell.value = `TRABAJADOR:  ${group.nombre}`;
      nameCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
      nameCell.alignment = { vertical: "middle", indent: 1 };
      nameCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.COTILEDON}` },
      };
      nameCell.border = tableBorders;

      ws.mergeCells(currentRow, 4, currentRow, TOTAL_COLS);
      const docCell = ws.getCell(currentRow, 4);
      docCell.value = `C.C:  ${group.documento}`;
      docCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
      docCell.alignment = { vertical: "middle", indent: 1 };
      docCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.COTILEDON}` },
      };
      docCell.border = tableBorders;
      ws.getRow(currentRow).height = 24;
      currentRow++;

      // ═══════════════════════════════════════════════════
      // DOTACIÓN: Textos normativos (antes de la tabla)
      // ═══════════════════════════════════════════════════
      if (tipo === "dotacion") {
        // Subtítulo ACTA con diseño destacado
        ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
        const actaCell = ws.getCell(currentRow, 1);
        actaCell.value = "ACTA DE ENTREGA DE DOTACIÓN";
        actaCell.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
        actaCell.alignment = { horizontal: "center", vertical: "middle" };
        actaCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${BRAND.SUTILEZA}` },
        };
        actaCell.border = tableBorders;
        ws.getRow(currentRow).height = 28;
        currentRow++;

        // Referencia con fecha de corte
        const fechaCorte = group.rows[0]?.fechaEntrega
          ? new Date(group.rows[0].fechaEntrega + "T12:00:00").toLocaleDateString("es-CO", {
              timeZone: "America/Bogota",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "";
        ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
        const refDotCell = ws.getCell(currentRow, 1);
        refDotCell.value = fechaCorte
          ? `Ref. Entrega de Dotación con Corte ${fechaCorte}.`
          : "Ref. Entrega de Dotación.";
        refDotCell.font = { name: "Segoe UI", size: 10, bold: true, underline: true, color: { argb: `FF${BRAND.IMPERIAL}` } };
        refDotCell.alignment = { vertical: "middle", indent: 1 };
        refDotCell.border = tableBorders;
        ws.getRow(currentRow).height = 20;
        currentRow++;

        // Texto introductorio
        ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
        const introCell = ws.getCell(currentRow, 1);
        introCell.value = "Por medio de la presente se hace entrega de los siguientes Elementos de Dotación Personal.";
        introCell.font = { name: "Segoe UI", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
        introCell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
        introCell.border = tableBorders;
        ws.getRow(currentRow).height = 22;
        currentRow++;
      }

      // ═══════════════════════════════════════════════════
      // COLUMN HEADERS — Azul Barranca con diseño moderno
      // ═══════════════════════════════════════════════════
      const colHeaders = [
        tipo === "dotacion" ? "DOTACIÓN ENTREGADA" : "EPP ENTREGADO",
        "CANTIDAD",
        "REFERENCIA COMERCIAL",
        "FECHA DE ENTREGA",
        "FIRMA DEL TRABAJADOR",
      ];
      colHeaders.forEach((header, idx) => {
        const cell = ws.getCell(currentRow, idx + 1);
        cell.value = header;
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: `FF${BRAND.WHITE}` } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${BRAND.AZUL_BARRANCA}` },
        };
        cell.border = { top: strongBorder, left: mediumBorder, bottom: strongBorder, right: mediumBorder };
      });
      ws.getRow(currentRow).height = 30;
      currentRow++;

      // ═══════════════════════════════════════════════════
      // DATA ROWS — diseño limpio con bordes sutiles
      // ═══════════════════════════════════════════════════
      let rowIndex = 0;
      for (const row of group.rows) {
        const dataRow = currentRow;
        const isEven = rowIndex % 2 === 0;
        const rowBg = isEven ? BRAND.WHITE : BRAND.COTILEDON;

        // Altura: grande para firma, normal para sin firma
        ws.getRow(dataRow).height = row.signatureDataUrl ? SIGNATURE_ROW_HEIGHT : 28;

        // A: EPP name
        const eppCell = ws.getCell(dataRow, 1);
        eppCell.value = row.eppNombre;
        eppCell.font = { name: "Segoe UI", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
        eppCell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
        eppCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
        eppCell.border = tableBorders;

        // B: Cantidad
        const cantCell = ws.getCell(dataRow, 2);
        cantCell.value = row.cantidad;
        cantCell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
        cantCell.alignment = { horizontal: "center", vertical: "middle" };
        cantCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
        cantCell.border = tableBorders;

        // C: Referencia
        const refCell = ws.getCell(dataRow, 3);
        refCell.value = row.referencia;
        refCell.font = { name: "Segoe UI", size: 9, color: { argb: `FF${BRAND.IMPERIAL}` } };
        refCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        refCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
        refCell.border = tableBorders;

        // D: Fecha
        const fechaCell = ws.getCell(dataRow, 4);
        if (row.fechaEntrega) {
          try {
            // Añadir mediodía para evitar desfase UTC, usar timezone Colombia
            const dateStr = row.fechaEntrega.includes("T") ? row.fechaEntrega : row.fechaEntrega + "T12:00:00";
            const date = new Date(dateStr);
            fechaCell.value = date.toLocaleDateString("es-CO", {
              timeZone: "America/Bogota",
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
        fechaCell.font = { name: "Segoe UI", size: 10, color: { argb: `FF${BRAND.IMPERIAL}` } };
        fechaCell.alignment = { horizontal: "center", vertical: "middle" };
        fechaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };
        fechaCell.border = tableBorders;

        // E: Firma — imagen PNG transparente en TODAS las filas
        const firmaCell = ws.getCell(dataRow, 5);
        firmaCell.border = tableBorders;
        firmaCell.alignment = { horizontal: "center", vertical: "middle" };
        firmaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${rowBg}` } };

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

              // Firma centrada en la celda FIRMA, con un margen a cada lado
              const firmaW = COL_E_PX - 20;
              const firmaH = Math.round((SIGNATURE_ROW_HEIGHT - 12) * (4 / 3));
              ws.addImage(imageId, {
                tl: {
                  nativeCol: 4,
                  nativeColOff: 10 * EMU_POR_PX,
                  nativeRow: dataRow - 1,
                  nativeRowOff: 6 * EMU_POR_PX,
                } as unknown as ExcelJS.Anchor,
                ext: { width: firmaW, height: firmaH },
                editAs: "oneCell",
              });
            }
          } catch (err) {
            console.error("Error adding signature image:", err);
          }
        } else if (row.estado === "Pendiente") {
          firmaCell.value = "Pendiente";
          firmaCell.font = {
            name: "Segoe UI",
            size: 9,
            color: { argb: `FF94A3B8` },
            italic: true,
          };
        }

        currentRow++;
        rowIndex++;
      }

      // ═══════════════════════════════════════════════════
      // DOTACIÓN: Textos normativos (después de la tabla)
      // ═══════════════════════════════════════════════════
      if (tipo === "dotacion") {
        // Espacio
        ws.getRow(currentRow).height = 6;
        currentRow++;

        // Texto de certificación con fondo destacado
        ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
        const certCell = ws.getCell(currentRow, 1);
        certCell.value = "Certifico que recibo a satisfacción los elementos de dotación Personal nombrados anteriormente en buen estado, y haber sido informado de los trabajos y zonas en los que deberá utilizar dicha dotación, así como haber recibido instrucciones para su correcto uso y aceptando los siguientes compromisos.";
        certCell.font = { name: "Segoe UI", size: 9, color: { argb: `FF${BRAND.IMPERIAL}` } };
        certCell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
        certCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${BRAND.COTILEDON}` },
        };
        certCell.border = tableBorders;
        ws.getRow(currentRow).height = 44;
        currentRow++;

        // Compromiso a)
        ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
        const compACell = ws.getCell(currentRow, 1);
        compACell.value = "a) Mantenerlos en buen estado y hacer buen uso de ellos, durante el tiempo de vida útil.";
        compACell.font = { name: "Segoe UI", size: 9, color: { argb: `FF${BRAND.IMPERIAL}` } };
        compACell.alignment = { vertical: "middle", wrapText: true, indent: 2 };
        compACell.border = tableBorders;
        ws.getRow(currentRow).height = 22;
        currentRow++;

        // Compromiso b)
        ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
        const compBCell = ws.getCell(currentRow, 1);
        compBCell.value = "b) Utilizar esta dotación durante la jornada de trabajo en las áreas cuya obligatoriedad de uso se encuentra establecido.";
        compBCell.font = { name: "Segoe UI", size: 9, color: { argb: `FF${BRAND.IMPERIAL}` } };
        compBCell.alignment = { vertical: "middle", wrapText: true, indent: 2 };
        compBCell.border = tableBorders;
        ws.getRow(currentRow).height = 22;
        currentRow++;

        // Espacio antes de nota legal
        ws.getRow(currentRow).height = 6;
        currentRow++;

        // Nota legal — Ley 11/84 Art. 230 con diseño destacado
        ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
        const legalCell = ws.getCell(currentRow, 1);
        legalCell.value = "De acuerdo a lo estipulado en la ley 11/84. Art. 230 establece el deber de todo empleador de suministrar cada cuatro meses, en forma gratuita una dotación (un par de zapatos y un vestido de labor) cuando tenga a su cargo uno o más trabajadores permanentes, cuya remuneración mensual sea hasta dos veces el salario mínimo más alto vigente, y que haya cumplido más de tres meses al servicio de este.";
        legalCell.font = { name: "Segoe UI", size: 8, bold: true, color: { argb: `FF${BRAND.IMPERIAL}` } };
        legalCell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
        legalCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${BRAND.SUTILEZA}` },
        };
        legalCell.border = tableBorders;
        ws.getRow(currentRow).height = 42;
        currentRow++;
      }

      // ═══════════════════════════════════════════════════
      // FOTOS DE EVIDENCIA — fila dedicada con imágenes
      // ═══════════════════════════════════════════════════
      // La galería toma el alto que quede libre en la hoja: así el acta
      // completa cabe en su página y las fotos se ven lo más grandes posible.
      const altoUsado = sumarAltoDeFilas(inicioActa, currentRow - 1);
      const altoGaleria = Math.min(
        ALTO_MAX_GALERIA,
        ALTO_UTIL_A4 - altoUsado - ALTO_CIERRE_ACTA - 22
      );

      if (group.fotoUrls.length > 0 && altoGaleria >= 70) {
        const FOTO_ROW_HEIGHT = altoGaleria;
        const FOTO_ALTO_PX = Math.round((FOTO_ROW_HEIGHT - 20) * (4 / 3));

        // Fila de etiqueta (fusionada) con diseño destacado
        ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
        const fotoLabelCell = ws.getCell(currentRow, 1);
        fotoLabelCell.value = `Evidencias Fotográficas (${Math.min(group.fotoUrls.length, 3)})`;
        fotoLabelCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: `FF${BRAND.WHITE}` } };
        fotoLabelCell.alignment = { vertical: "middle", horizontal: "center" };
        fotoLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.AZUL_CIELO}` } };
        fotoLabelCell.border = { top: strongBorder, left: strongBorder, bottom: mediumBorder, right: strongBorder };
        ws.getRow(currentRow).height = 22;
        currentRow++;

        // Fila con las fotos — fusionar todas las columnas para aprovechar el ancho completo
        const fotoDataRow = currentRow;
        ws.mergeCells(fotoDataRow, 1, fotoDataRow, TOTAL_COLS);
        ws.getRow(fotoDataRow).height = FOTO_ROW_HEIGHT;
        const fotoCellBase = ws.getCell(fotoDataRow, 1);
        fotoCellBase.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND.LIGHT_GRAY}` } };
        fotoCellBase.border = { top: mediumBorder, left: strongBorder, bottom: strongBorder, right: strongBorder };

        // Máximo 3 evidencias, a la misma altura y sin deformar
        const evidencias = (
          await Promise.all(
            group.fotoUrls.slice(0, 3).map((url) => fetchEvidencia(url))
          )
        ).filter((e): e is Evidencia => e !== null);

        // Reparto horizontal con espacios iguales dentro del ancho de la hoja
        const anchos = evidencias.map((e) =>
          Math.round(FOTO_ALTO_PX * (e.ancho / e.alto))
        );
        const sumaAnchos = anchos.reduce((t, w) => t + w, 0);
        const hueco = Math.max(8, (TOTAL_PX - sumaAnchos) / (evidencias.length + 1));

        let xPx = hueco;
        for (let i = 0; i < evidencias.length; i++) {
          const imgId = workbook.addImage({
            base64: evidencias[i].base64,
            extension: "jpeg",
          });

          ws.addImage(imgId, {
            tl: {
              ...anclaNativa(xPx),
              nativeRow: fotoDataRow - 1,
              nativeRowOff: 8 * EMU_POR_PX,
            } as unknown as ExcelJS.Anchor,
            ext: { width: anchos[i], height: FOTO_ALTO_PX },
            editAs: "oneCell",
          });

          xPx += anchos[i] + hueco;
        }

        currentRow++;
      }

      // ═══════════════════════════════════════════════════
      // FOOTER — motivo con diseño moderno
      // ═══════════════════════════════════════════════════
      ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
      const footerCell = ws.getCell(currentRow, 1);
      const motivos = [...new Set(group.rows.map((r) => r.motivo).filter(Boolean))];
      footerCell.value = `Motivo de entrega: ${motivos.join(", ") || "—"}`;
      footerCell.font = { name: "Segoe UI", size: 9, italic: false, color: { argb: `FF${BRAND.AZUL_BARRANCA}` } };
      footerCell.alignment = { vertical: "middle", indent: 1 };
      footerCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.COTILEDON}` },
      };
      footerCell.border = { top: strongBorder, left: strongBorder, bottom: brandBorder, right: strongBorder };
      ws.getRow(currentRow).height = 24;
      currentRow++;

      // Bottom accent line (Verde Alegria — acento de marca)
      ws.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
      const accentCell = ws.getCell(currentRow, 1);
      accentCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${BRAND.VERDE_ALEGRIA}` },
      };
      accentCell.border = { top: brandBorder, left: strongBorder, bottom: strongBorder, right: strongBorder };
      ws.getRow(currentRow).height = 6;
      currentRow++;

      // Fila de respiro al pie del acta (dentro de su propia página)
      ws.getRow(currentRow).height = 8;
      currentRow++;
    }

    // ── 7. Una página por trabajador ────────────────────
    // El salto va en la última fila del acta anterior, de modo que la
    // siguiente arranque en una hoja nueva.
    for (const inicio of iniciosDeActa.slice(1)) {
      ws.getRow(inicio - 1).addPageBreak();
    }
    ws.pageSetup.printArea = `A1:E${currentRow - 1}`;

    // ── 8. Generate buffer ──────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();

    // ── 9. Return as downloadable file ──────────────────
    const fileSuffix = mes || new Date().toISOString().slice(0, 10);
    const tipoSuffix = tipo === "dotacion" ? "Dotacion" : "EPP";
    const filename = `Entregas_${tipoSuffix}_Sirius_${fileSuffix}.xlsx`;

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
