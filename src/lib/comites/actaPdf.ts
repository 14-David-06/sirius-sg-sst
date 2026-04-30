// ══════════════════════════════════════════════════════════
// Generador PDF compartido — Actas COPASST y COCOLAB
// Layout fiel al formato oficial Sirius:
//   • Encabezado 3 columnas (Logo / Empresa+Formato / Código)
//   • Colores corporativos #00B602 / #0154AC / #1A1A33
//   • Secciones parametrizadas por tipo de comité
// ══════════════════════════════════════════════════════════
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { decryptFirmaActa } from "@/lib/firmaCrypto";
import {
  FORMATO_COMITE,
  type ActaCocolab,
  type ActaCompleta,
  type ActaCopasst,
  type ComiteTipo,
} from "./types";

// ── Paleta corporativa (RGB) ──────────────────────────────
const COLORS = {
  VERDE: [0, 182, 2] as [number, number, number],          // #00B602
  AZUL: [1, 84, 172] as [number, number, number],          // #0154AC
  NEGRO: [26, 26, 51] as [number, number, number],         // #1A1A33
  BLANCO: [255, 255, 255] as [number, number, number],
  GRIS_CLARO: [242, 242, 242] as [number, number, number],
  GRIS_MEDIO: [180, 180, 190] as [number, number, number],
  ROJO: [220, 53, 69] as [number, number, number],
  VERDE_OK: [40, 167, 69] as [number, number, number],
  AMARILLO: [255, 193, 7] as [number, number, number],
} as const;

const ROL_LABEL: Record<string, string> = {
  presidente: "Presidente(a)",
  secretaria: "Secretario(a)",
  suplente_empleador: "Suplente Empleador",
  suplente_empresa: "Suplente Empresa",
  suplente_trabajadores: "Suplente Trabajadores",
  invitado: "Invitado(a)",
};

const RESULTADO_LABEL: Record<string, string> = {
  ok: "Conforme",
  oportunidad_mejora: "Oportunidad de mejora",
  critico: "Crítico",
};

const CATEGORIA_LABEL: Record<string, string> = {
  riesgo_psicosocial: "Riesgo Psicosocial",
  convivencia_laboral: "Convivencia Laboral",
  articulacion_sgsst: "Articulación con SG-SST",
  cultura_preventiva: "Cultura Preventiva",
  otro: "Otro",
};

interface BuildPdfOptions {
  acta: ActaCompleta;
  logoBase64?: string | null;
}

export async function generarPdfActaComite(
  options: BuildPdfOptions
): Promise<Buffer> {
  const { acta, logoBase64 } = options;
  const comite: ComiteTipo = acta.comite;
  const formato = FORMATO_COMITE[comite];

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ═══════════════════════════════════════════════════════
  // ENCABEZADO 3 COLUMNAS
  // ═══════════════════════════════════════════════════════
  const headerH = 26;
  const colLogoW = 36;
  const colCodigoW = 52;
  const colCentroW = contentWidth - colLogoW - colCodigoW;

  // Marco general
  doc.setDrawColor(...COLORS.NEGRO);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, headerH);

  // Col 1: Logo
  doc.rect(margin, y, colLogoW, headerH);
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin + 3, y + 3, colLogoW - 6, headerH - 6);
    } catch {
      // ignore
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.VERDE);
    doc.text("SIRIUS", margin + colLogoW / 2, y + headerH / 2 + 1, { align: "center" });
  }

  // Col 2: empresa + nombre formato
  const cx = margin + colLogoW;
  doc.rect(cx, y, colCentroW, headerH);
  doc.setTextColor(...COLORS.NEGRO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    "SIRIUS REGENERATIVE SOLUTIONS S.A.S. ZOMAC.",
    cx + colCentroW / 2,
    y + 6,
    { align: "center" }
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("NIT: 901.377.064-8", cx + colCentroW / 2, y + 11, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.AZUL);
  const nombreLines = doc.splitTextToSize(formato.nombre, colCentroW - 4);
  doc.text(nombreLines, cx + colCentroW / 2, y + 17, { align: "center" });

  // Col 3: Código + versión + fecha edición
  const ccx = margin + colLogoW + colCentroW;
  doc.rect(ccx, y, colCodigoW, headerH);
  doc.setTextColor(...COLORS.NEGRO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const rowH = headerH / 3;
  doc.line(ccx, y + rowH, ccx + colCodigoW, y + rowH);
  doc.line(ccx, y + 2 * rowH, ccx + colCodigoW, y + 2 * rowH);
  doc.text(`CÓDIGO: ${formato.codigo}`, ccx + colCodigoW / 2, y + rowH / 2 + 1.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(`VERSIÓN: ${formato.version}`, ccx + colCodigoW / 2, y + rowH + rowH / 2 + 1.5, { align: "center" });
  doc.text(`FECHA: ${formato.fechaEdicion}`, ccx + colCodigoW / 2, y + 2 * rowH + rowH / 2 + 1.5, { align: "center" });

  y += headerH + 4;

  // ═══════════════════════════════════════════════════════
  // TÍTULO DEL ACTA
  // ═══════════════════════════════════════════════════════
  doc.setFillColor(...COLORS.VERDE);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setTextColor(...COLORS.BLANCO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    `ACTA N° ${acta.numeroActa}  —  ${acta.mesEvaluado.toUpperCase()}`,
    margin + contentWidth / 2,
    y + 5.5,
    { align: "center" }
  );
  y += 12;

  // ═══════════════════════════════════════════════════════
  // DATOS GENERALES (tabla 2x3)
  // ═══════════════════════════════════════════════════════
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, textColor: COLORS.NEGRO },
    headStyles: { fillColor: COLORS.AZUL, textColor: COLORS.BLANCO, fontStyle: "bold" },
    head: [["Fecha", "Hora inicio", "Hora cierre", "Lugar"]],
    body: [
      [
        formatFecha(acta.fechaReunion),
        acta.horaInicio,
        acta.horaCierre,
        acta.lugar,
      ],
    ],
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // ═══════════════════════════════════════════════════════
  // INTEGRANTES
  // ═══════════════════════════════════════════════════════
  y = seccionTitulo(doc, "1. Integrantes asistentes", margin, contentWidth, y);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { fillColor: COLORS.AZUL, textColor: COLORS.BLANCO, fontStyle: "bold" },
    head: [["Nombre", "Cédula", "Cargo", "Rol", "Asistió"]],
    body: acta.asistentes.map((i) => [
      i.nombre || "—",
      i.cedula || "—",
      i.cargo || "—",
      i.rol ? (ROL_LABEL[i.rol.toLowerCase()] || i.rol) : "—",
      i.asistio === false ? "No" : "Sí",
    ]),
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // ═══════════════════════════════════════════════════════
  // SECCIONES ESPECÍFICAS POR COMITÉ
  // ═══════════════════════════════════════════════════════
  if (comite === "COPASST") {
    y = renderSeccionesCopasst(doc, acta as ActaCopasst, margin, contentWidth, y);
  } else {
    y = renderSeccionesCocolab(doc, acta as ActaCocolab, margin, contentWidth, y);
  }

  // ═══════════════════════════════════════════════════════
  // COMPROMISOS
  // ═══════════════════════════════════════════════════════
  y = ensurePageSpace(doc, y, 30);
  y = seccionTitulo(doc, "Compromisos y tareas", margin, contentWidth, y);
  if (acta.compromisos.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.GRIS_MEDIO);
    doc.text("Sin compromisos registrados.", margin, y + 4);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      headStyles: { fillColor: COLORS.VERDE, textColor: COLORS.BLANCO },
      head: [["Compromiso", "Responsable", "Fecha límite", "Cumplido"]],
      body: acta.compromisos.map((c) => [
        c.compromiso,
        c.responsable,
        formatFecha(c.fechaLimite),
        c.cumplido === true ? "Sí" : c.cumplido === false ? "No" : "Pendiente",
      ]),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // ═══════════════════════════════════════════════════════
  // FIRMAS
  // ═══════════════════════════════════════════════════════
  y = ensurePageSpace(doc, y, 70);
  y = seccionTitulo(doc, "Firmas", margin, contentWidth, y);
  await renderFirmas(doc, acta, margin, contentWidth, y);

  // ── Pie de página
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.GRIS_MEDIO);
    doc.text(
      `${formato.codigo} · v${formato.version} · Generado ${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}`,
      margin,
      doc.internal.pageSize.getHeight() - 6
    );
    doc.text(
      `Página ${p} de ${total}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 6,
      { align: "right" }
    );
  }

  const arr = doc.output("arraybuffer");
  return Buffer.from(arr);
}

// ══════════════════════════════════════════════════════════
// Secciones específicas
// ══════════════════════════════════════════════════════════
function renderSeccionesCopasst(
  doc: jsPDF,
  acta: ActaCopasst,
  margin: number,
  contentWidth: number,
  y: number
): number {
  // 2. Accidentes / incidentes
  y = ensurePageSpace(doc, y, 30);
  y = seccionTitulo(doc, "2. Accidentes e incidentes", margin, contentWidth, y);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: COLORS.AZUL, textColor: COLORS.BLANCO },
    head: [["Tipo", "Presentados", "Detalle"]],
    body: [
      [
        "Accidentes",
        acta.accidentesPresentados ? "Sí" : "No",
        acta.accidentesDetalle || "—",
      ],
      [
        "Incidentes",
        acta.incidentesPresentados ? "Sí" : "No",
        acta.incidentesDetalle || "—",
      ],
    ],
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // 3. Condiciones inseguras
  y = ensurePageSpace(doc, y, 30);
  y = seccionTitulo(doc, "3. Condiciones inseguras observadas", margin, contentWidth, y);
  if (acta.condicionesInseguras.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.GRIS_MEDIO);
    doc.text("Sin condiciones reportadas.", margin, y + 4);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      headStyles: { fillColor: COLORS.AZUL, textColor: COLORS.BLANCO },
      head: [["Descripción", "Resultado", "Observación"]],
      body: acta.condicionesInseguras.map((c) => [
        c.descripcion,
        RESULTADO_LABEL[c.resultado] || c.resultado,
        c.observacion || "—",
      ]),
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const r = acta.condicionesInseguras[data.row.index].resultado;
          if (r === "critico") data.cell.styles.textColor = COLORS.ROJO;
          else if (r === "oportunidad_mejora") data.cell.styles.textColor = COLORS.AMARILLO;
          else data.cell.styles.textColor = COLORS.VERDE_OK;
        }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // 4. Capacitaciones
  y = ensurePageSpace(doc, y, 30);
  y = seccionTitulo(doc, "4. Capacitaciones del periodo", margin, contentWidth, y);
  if (acta.capacitaciones.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.GRIS_MEDIO);
    doc.text("Sin capacitaciones registradas.", margin, y + 4);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      headStyles: { fillColor: COLORS.AZUL, textColor: COLORS.BLANCO },
      head: [["Tema", "Fecha de ejecución"]],
      body: acta.capacitaciones.map((c) => [
        c.tema || "—",
        c.fechaEjecucion || "—",
      ]),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // 5. Novedades administrativas
  if (acta.novedadesAdministrativas) {
    y = ensurePageSpace(doc, y, 20);
    y = seccionTitulo(doc, "5. Novedades administrativas", margin, contentWidth, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.NEGRO);
    const lines = doc.splitTextToSize(acta.novedadesAdministrativas, contentWidth);
    doc.text(lines, margin, y + 4);
    y += lines.length * 4 + 4;
  }
  return y;
}

function renderSeccionesCocolab(
  doc: jsPDF,
  acta: ActaCocolab,
  margin: number,
  contentWidth: number,
  y: number
): number {
  // 2. Quejas y conflictos
  y = ensurePageSpace(doc, y, 30);
  y = seccionTitulo(doc, "2. Quejas y conflictos del periodo", margin, contentWidth, y);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: COLORS.AZUL, textColor: COLORS.BLANCO },
    head: [["Tipo", "Presentadas", "Detalle"]],
    body: [
      [
        "Quejas de acoso laboral",
        acta.quejasAcoso ? "Sí" : "No",
        acta.quejasAcosoDetalle || "—",
      ],
      [
        "Conflictos laborales",
        acta.conflictosLaborales ? "Sí" : "No",
        acta.conflictosLaboralesDetalle || "—",
      ],
    ],
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // 3. Acciones preventivas
  y = ensurePageSpace(doc, y, 30);
  y = seccionTitulo(doc, "3. Acciones preventivas y de promoción", margin, contentWidth, y);
  if (acta.accionesPreventivas.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.GRIS_MEDIO);
    doc.text("Sin acciones registradas.", margin, y + 4);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      headStyles: { fillColor: COLORS.AZUL, textColor: COLORS.BLANCO },
      head: [["Categoría", "Descripción"]],
      body: acta.accionesPreventivas.map((a) => [
        CATEGORIA_LABEL[a.categoria] || a.categoria,
        a.descripcion,
      ]),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }
  return y;
}

// ══════════════════════════════════════════════════════════
// Helpers de layout
// ══════════════════════════════════════════════════════════
function seccionTitulo(
  doc: jsPDF,
  titulo: string,
  margin: number,
  contentWidth: number,
  y: number
): number {
  doc.setFillColor(...COLORS.AZUL);
  doc.rect(margin, y, contentWidth, 6, "F");
  doc.setTextColor(...COLORS.BLANCO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(titulo, margin + 2, y + 4.2);
  return y + 8;
}

function ensurePageSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 15) {
    doc.addPage();
    return 12;
  }
  return y;
}

function formatFecha(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

async function renderFirmas(
  doc: jsPDF,
  acta: ActaCompleta,
  margin: number,
  contentWidth: number,
  y: number
): Promise<void> {
  const colW = (contentWidth - 4) / 2;
  const boxH = 50;

  const firmas = [
    { rol: "presidente", label: "Presidente(a)", enc: acta.firmaPresidente, x: margin },
    { rol: "secretaria", label: acta.comite === "COCOLAB" ? "Secretaria" : "Secretario(a)", enc: acta.firmaSecretario, x: margin + colW + 4 },
  ];

  for (const f of firmas) {
    doc.setDrawColor(...COLORS.NEGRO);
    doc.setLineWidth(0.3);
    doc.rect(f.x, y, colW, boxH);

    let nombre = "—";
    let cedula = "—";
    let cargo = "—";
    let imgData: string | null = null;
    if (f.enc) {
      try {
        const data = decryptFirmaActa(f.enc);
        nombre = data.nombre;
        cedula = data.cedula;
        cargo = data.cargo;
        imgData = data.signature;
      } catch {
        // ignore — mostrar caja vacía
      }
    }

    if (imgData) {
      try {
        doc.addImage(imgData, "PNG", f.x + 4, y + 4, colW - 8, boxH - 22);
      } catch {
        // ignore
      }
    }

    doc.setDrawColor(...COLORS.GRIS_MEDIO);
    doc.line(f.x + 6, y + boxH - 18, f.x + colW - 6, y + boxH - 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.NEGRO);
    doc.text(nombre, f.x + colW / 2, y + boxH - 13, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`C.C. ${cedula}`, f.x + colW / 2, y + boxH - 8, { align: "center" });
    doc.text(cargo, f.x + colW / 2, y + boxH - 4, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.AZUL);
    doc.text(f.label, f.x + 2, y - 1);
  }
}
