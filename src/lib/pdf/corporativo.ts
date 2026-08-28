// ══════════════════════════════════════════════════════════
// Encabezado y pie corporativos Sirius para documentos PDF
//
// Extrae el patrón que ya usan `comites/actaPdf.ts` y
// `sociodemografico/perfilPdf.ts`: encabezado de tres columnas
// (logo · razón social · código de formato) y pie con los datos de contacto.
//
// Esos dos archivos conservan su propia copia; no se tocaron para no
// arriesgar formatos que hoy funcionan. Los documentos nuevos deben usar
// este módulo.
// ══════════════════════════════════════════════════════════
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

// ── Paleta corporativa ───────────────────────────────────
export const C = {
  VERDE:      [0, 182, 2]     as [number, number, number], // #00B602
  AZUL:       [1, 84, 172]    as [number, number, number], // #0154AC
  NEGRO:      [26, 26, 51]    as [number, number, number], // #1A1A33
  BLANCO:     [255, 255, 255] as [number, number, number],
  GRIS_CLARO: [242, 242, 242] as [number, number, number],
  GRIS_TEXTO: [100, 100, 115] as [number, number, number],
  ROJO:       [190, 40, 40]   as [number, number, number],
} as const;

// ── Datos de la empresa (configurables vía env) ──────────
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Variable de entorno requerida no definida: ${key}\n` +
      `Configura los datos de la empresa en .env.local y verifica con: npm run check:env`
    );
  }
  return value;
}

export const EMPRESA = requireEnv("EMPRESA_NOMBRE");
export const RAZON_SOCIAL = requireEnv("EMPRESA_RAZON_SOCIAL");
export const NIT = requireEnv("EMPRESA_NIT");
export const TELEFONO = requireEnv("EMPRESA_TELEFONO");
export const CORREO = requireEnv("EMPRESA_CORREO");
export const PLANTACION = requireEnv("EMPRESA_DIRECCION");

export interface MetadatosFormato {
  codigo: string;
  version: string;
  fechaEdicion: string;
  /** Nombre del formato, en mayúsculas, para la franja de título. */
  nombre: string;
}

/** Carga `public/logo.png` en base64. Devuelve `null` si no está. */
export function cargarLogo(): string | null {
  try {
    const p = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(p)) return fs.readFileSync(p).toString("base64");
  } catch {
    /* el documento se genera igual, con el recuadro de respaldo */
  }
  return null;
}

function logoDeRespaldo(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  doc.setFillColor(...C.VERDE);
  doc.roundedRect(x + 3, y + 3, w - 6, h - 6, 2, 2, "F");
  doc.setTextColor(...C.BLANCO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(EMPRESA, x + w / 2, y + h / 2 + 1.5, { align: "center" });
}

/** Encabezado de tres columnas. Devuelve la Y siguiente. */
export function renderEncabezado(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  logo64: string | null,
  formato: MetadatosFormato
): number {
  const H = 33;
  const cL = 40; // columna del logo
  const cC = 54; // columna del código
  const cM = CW - cL - cC;

  doc.setDrawColor(...C.NEGRO);
  doc.setLineWidth(0.4);
  doc.rect(M, y, CW, H);
  doc.line(M + cL, y, M + cL, y + H);
  doc.line(M + cL + cM, y, M + cL + cM, y + H);

  if (logo64) {
    try {
      doc.addImage("data:image/png;base64," + logo64, "PNG", M + 4, y + 4, cL - 8, H - 8);
    } catch {
      logoDeRespaldo(doc, M, y, cL, H);
    }
  } else {
    logoDeRespaldo(doc, M, y, cL, H);
  }

  const cx = M + cL;
  doc.setTextColor(...C.NEGRO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(RAZON_SOCIAL, cx + cM / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`NIT. ${NIT}`, cx + cM / 2, y + 13.5, { align: "center" });
  doc.setDrawColor(...C.GRIS_TEXTO);
  doc.setLineWidth(0.15);
  doc.line(cx + 5, y + 17, cx + cM - 5, y + 17);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.AZUL);
  doc.text(formato.nombre, cx + cM / 2, y + 24, { align: "center" });

  const ccx = M + cL + cM;
  const rH = H / 3;
  doc.setDrawColor(...C.NEGRO);
  doc.setLineWidth(0.3);
  doc.line(ccx, y + rH, ccx + cC, y + rH);
  doc.line(ccx, y + 2 * rH, ccx + cC, y + 2 * rH);
  doc.setTextColor(...C.NEGRO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(`CODIGO: ${formato.codigo}`, ccx + cC / 2, y + rH / 2 + 1.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(`VERSION: ${formato.version}`, ccx + cC / 2, y + rH + rH / 2 + 1.5, { align: "center" });
  doc.text(`FECHA EDICION: ${formato.fechaEdicion}`, ccx + cC / 2, y + 2 * rH + rH / 2 + 1.5, { align: "center" });

  return y + H + 3;
}

/** Franja negra de título. Devuelve la Y siguiente. */
export function renderTitulo(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  texto: string
): number {
  doc.setFillColor(...C.NEGRO);
  doc.rect(M, y, CW, 9.5, "F");
  doc.setTextColor(...C.BLANCO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(texto.toUpperCase(), M + CW / 2, y + 6.6, { align: "center" });
  return y + 14;
}

/** Pie con datos de contacto y numeración. Se dibuja en cada página. */
export function renderPiePagina(
  doc: jsPDF,
  M: number,
  CW: number,
  PW: number,
  PH: number,
  pagina: number,
  total: number
): void {
  const y0 = PH - 22;
  doc.setDrawColor(...C.VERDE);
  doc.setLineWidth(0.8);
  doc.line(M, y0, M + CW, y0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.NEGRO);
  doc.text(
    `Sirius Regenerative Solutions SAS Zomac / Nit: ${NIT} / Teléfono: ${TELEFONO} / Correo: ${CORREO}`,
    M + CW / 2,
    y0 + 4.5,
    { align: "center" }
  );
  doc.text(`Plantación: ${PLANTACION}`, M + CW / 2, y0 + 9, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.GRIS_TEXTO);
  doc.text(`Pág. ${pagina} / ${total}`, PW - M, y0 + 9, { align: "right" });
}

// ── Helpers de maquetación ───────────────────────────────

/** Alto de línea en mm para un tamaño de fuente en puntos. */
export function lh(fontSize: number): number {
  return (fontSize / 72) * 25.4 * 1.45;
}

/** Salta de página si el bloque no cabe. Devuelve la Y donde continuar. */
export function checkPage(
  doc: jsPDF,
  y: number,
  necesario: number,
  PH: number,
  FH: number
): number {
  if (y + necesario > PH - FH - 4) {
    doc.addPage();
    return 16;
  }
  return y;
}

/** Título de sección sobre franja azul. */
export function tituloSeccion(
  doc: jsPDF,
  titulo: string,
  x: number,
  w: number,
  y: number
): number {
  const top = 5;
  doc.setFillColor(...C.AZUL);
  doc.rect(x, y + top, w, 7.5, "F");
  doc.setTextColor(...C.BLANCO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(titulo, x + 3, y + top + 5.4);
  return y + top + 7.5 + 4;
}

/** Párrafo con ajuste de ancho. Devuelve la Y siguiente. */
export function parrafo(
  doc: jsPDF,
  texto: string,
  x: number,
  y: number,
  maxW: number,
  opts: {
    fs?: number;
    style?: "normal" | "bold" | "italic";
    color?: [number, number, number];
    indent?: number;
  } = {}
): number {
  const { fs = 9, style = "normal", color = C.NEGRO, indent = 0 } = opts;
  doc.setFont("helvetica", style);
  doc.setFontSize(fs);
  doc.setTextColor(...color);
  const lineas = doc.splitTextToSize(texto, maxW - indent) as string[];
  doc.text(lineas, x + indent, y);
  return y + lineas.length * lh(fs) + 3;
}

/** Formatea `YYYY-MM-DD` como `DD/MM/YYYY`. */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return "—";
  return `${dia}/${mes}/${anio}`;
}

/**
 * Equivalentes ASCII de la puntuación tipográfica que las fuentes estándar
 * de jsPDF no dibujan. Sin esto, un guion largo desaparece y el texto queda
 * como "Reunion COPASST  acta 005-2026", con un hueco en vez del separador.
 */
const TRANSLITERACIONES: [RegExp, string][] = [
  [/[\u2013\u2014]/g, "-"],   // – —
  [/[\u2018\u2019]/g, "'"],   // comillas simples tipográficas
  [/[\u201C\u201D]/g, '"'],   // comillas dobles tipográficas
  [/\u2026/g, "..."],        // …
  [/[\u2022\u00B7]/g, "-"],   // • ·
];

/**
 * Deja el texto en el juego de caracteres que las fuentes estándar de jsPDF
 * saben dibujar (WinAnsi).
 *
 * Sin esto, un emoji copiado desde WhatsApp a un campo de Airtable sale como
 * secuencias ilegibles en el documento impreso.
 */
export function textoSeguroPdf(valor: string): string {
  const transcrito = TRANSLITERACIONES.reduce(
    (texto, [patron, reemplazo]) => texto.replace(patron, reemplazo),
    valor
  );
  return transcrito
    // Lo que quede fuera de WinAnsi: emojis y caracteres de control.
    .replace(/[^\u0020-\u00FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Aplica `textoSeguroPdf` a todas las celdas de una tabla. */
export function saneaFilas(filas: string[][]): string[][] {
  return filas.map((fila) => fila.map(textoSeguroPdf));
}
