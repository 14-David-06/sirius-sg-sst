// ══════════════════════════════════════════════════════════
// Generador PDF — Informe mensual de gestión SST
//
// Siete secciones, en el orden del formato impreso:
//   1. Estadísticas legales (los 18 indicadores)
//   2. Gestión de accidentes de trabajo con lesión
//   3. Gestión de investigación de accidentes
//   4. Gestión de medicina laboral
//   5. Consolidado de inspecciones
//   6. Actividades de promoción y prevención
//   7. Inducción y reinducción (tablas separadas, como exige el formato)
// ══════════════════════════════════════════════════════════
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  C,
  EMPRESA,
  cargarLogo,
  checkPage,
  formatearFecha,
  parrafo,
  renderEncabezado,
  renderPiePagina,
  renderTitulo,
  saneaFilas,
  textoSeguroPdf,
  tituloSeccion,
  type MetadatosFormato,
} from "@/lib/pdf/corporativo";
import type { InformeMensual } from "./types";

const FORMATO: MetadatosFormato = {
  codigo: "FT-SST-070",
  version: "01",
  fechaEdicion: "25/08/2026",
  nombre: "INFORME MENSUAL DE GESTIÓN SST",
};

/** jsPDF con la propiedad que agrega jsPDF-AutoTable tras dibujar. */
type DocAT = jsPDF & { lastAutoTable: { finalY: number } };

/** Estilo base de todas las tablas del informe. */
function estiloTabla(M: number, CW: number) {
  return {
    margin: { left: M, right: M, bottom: 28 },
    tableWidth: CW,
    theme: "plain" as const,
    styles: {
      fontSize: 8,
      cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 },
      lineColor: C.NEGRO,
      lineWidth: 0.25,
      textColor: C.NEGRO,
      overflow: "linebreak" as const,
    },
    headStyles: {
      fillColor: C.AZUL,
      textColor: C.BLANCO,
      fontStyle: "bold" as const,
      fontSize: 8,
    },
  };
}

/** Mensaje uniforme para una sección sin registros en el periodo. */
function sinRegistros(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  texto: string
): number {
  return parrafo(doc, texto, M, y, CW, {
    fs: 8.5,
    style: "italic",
    color: C.GRIS_TEXTO,
  });
}

export function generarPdfInformeMensual(informe: InformeMensual): Buffer {
  const logo64 = cargarLogo();

  // `compress` importa: sin él, jsPDF guarda el logo PNG descomprimido y el
  // informe pesa ~2.3 MB aunque el mes venga vacío.
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
    compress: true,
  });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 12;
  const CW = PW - M * 2;
  const FH = 24; // alto reservado para el pie

  let y = M;

  y = renderEncabezado(doc, y, M, CW, logo64, FORMATO);
  y = renderTitulo(doc, y, M, CW, `${FORMATO.nombre} — ${informe.periodo.etiqueta}`);
  y = renderPanelDatos(doc, y, M, CW, informe);
  y = renderAvisoOrganizacion(doc, y, M, CW, informe);
  y = renderAvisoIncompleto(doc, y, M, CW, informe);
  y = renderEstadisticasLegales(doc, y, M, CW, PH, FH, informe);
  y = renderAccidentes(doc, y, M, CW, PH, FH, informe);
  y = renderInvestigaciones(doc, y, M, CW, PH, FH, informe);
  y = renderMedicinaLaboral(doc, y, M, CW, PH, FH, informe);
  y = renderInspecciones(doc, y, M, CW, PH, FH, informe);
  y = renderActividades(doc, y, M, CW, PH, FH, informe);
  renderInduccionesReinducciones(doc, y, M, CW, PH, FH, informe);

  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    renderPiePagina(doc, M, CW, PW, PH, p, totalPaginas);
  }

  return Buffer.from(doc.output("arraybuffer"));
}

// ══════════════════════════════════════════════════════════
// Secciones
// ══════════════════════════════════════════════════════════

function renderPanelDatos(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  informe: InformeMensual
): number {
  const cW = CW / 2;
  const generado = new Date(informe.generadoEn).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  autoTable(doc, {
    ...estiloTabla(M, CW),
    startY: y,
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: cW * 0.35, fillColor: C.GRIS_CLARO },
      1: { cellWidth: cW * 0.65 },
      2: { fontStyle: "bold", cellWidth: cW * 0.35, fillColor: C.GRIS_CLARO },
      3: { cellWidth: cW * 0.65 },
    },
    body: saneaFilas([
      [
        "Empresa:",
        informe.organizacion.razonSocial,
        "Periodo:",
        informe.periodo.etiqueta,
      ],
      [
        "Responsable:",
        informe.organizacion.responsableNombre,
        "Desde:",
        formatearFecha(informe.periodo.desde),
      ],
      [
        "Cargo:",
        informe.organizacion.responsableCargo,
        "Hasta:",
        formatearFecha(informe.periodo.hasta),
      ],
      [
        "Licencia SST:",
        `No. ${informe.organizacion.licenciaSST}`,
        "Generado:",
        generado,
      ],
    ]),
  });

  return (doc as DocAT).lastAutoTable.finalY + 4;
}

/**
 * Avisa cuando el encabezado salió con datos de reserva.
 *
 * El responsable y la licencia son datos que la ARL verifica. Si el entorno no
 * los define, el documento igual se genera —para no bloquear el trabajo— pero
 * debe decir en su cara que hay que revisarlos.
 */
function renderAvisoOrganizacion(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  informe: InformeMensual
): number {
  if (!informe.organizacion.usandoValoresPorDefecto) return y;

  const campos = informe.organizacion.camposPorDefecto.join(", ");
  const alto = 12;

  doc.setFillColor(255, 248, 235);
  doc.setDrawColor(...C.ROJO);
  doc.setLineWidth(0.3);
  doc.rect(M, y, CW, alto, "FD");

  doc.setTextColor(...C.ROJO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Verificar el encabezado antes de firmar", M + 3, y + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    textoSeguroPdf(`Se usaron valores de reserva para: ${campos}.`),
    M + 5,
    y + 8.5
  );

  return y + alto + 4;
}

/**
 * Avisa en el propio documento si alguna consulta falló.
 *
 * Un mes sin actividad y un mes con la consulta rota producen las mismas
 * tablas vacías; quien firma el informe necesita poder distinguirlos.
 */
function renderAvisoIncompleto(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  informe: InformeMensual
): number {
  if (informe.seccionesIncompletas.length === 0) return y;

  const alto = 6 + informe.seccionesIncompletas.length * 4;
  doc.setFillColor(255, 240, 240);
  doc.setDrawColor(...C.ROJO);
  doc.setLineWidth(0.3);
  doc.rect(M, y, CW, alto, "FD");

  doc.setTextColor(...C.ROJO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(
    "Informe incompleto — las siguientes consultas no se pudieron leer:",
    M + 3,
    y + 4.5
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  informe.seccionesIncompletas.forEach((fallo, i) => {
    doc.text(textoSeguroPdf(`• ${fallo}`), M + 5, y + 8.5 + i * 4);
  });

  return y + alto + 4;
}

function renderEstadisticasLegales(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  PH: number,
  FH: number,
  informe: InformeMensual
): number {
  y = checkPage(doc, y, 60, PH, FH);
  y = tituloSeccion(doc, "1. ESTADÍSTICAS LEGALES", M, CW, y);

  autoTable(doc, {
    ...estiloTabla(M, CW),
    startY: y,
    head: [["Indicador", "Valor", "Fuente"]],
    columnStyles: {
      0: { cellWidth: CW * 0.62 },
      1: { cellWidth: CW * 0.13, halign: "center", fontStyle: "bold" },
      2: { cellWidth: CW * 0.25, fontSize: 7.5, textColor: C.GRIS_TEXTO },
    },
    body: saneaFilas(
      informe.estadisticasLegales.map((f) => [
        f.indicador,
        String(f.valor),
        f.origen,
      ])
    ),
  });

  return (doc as DocAT).lastAutoTable.finalY + 4;
}

function renderAccidentes(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  PH: number,
  FH: number,
  informe: InformeMensual
): number {
  y = checkPage(doc, y, 45, PH, FH);
  y = tituloSeccion(doc, "2. GESTIÓN DE ACCIDENTES DE TRABAJO CON LESIÓN", M, CW, y);

  const filas = informe.accidentes.filasAccidentes;
  if (filas.length === 0) {
    return sinRegistros(
      doc,
      y,
      M,
      CW,
      "No se registraron accidentes de trabajo con lesión en el periodo."
    );
  }

  autoTable(doc, {
    ...estiloTabla(M, CW),
    startY: y,
    head: [["Trabajador", "Fecha", "Tipo de lesión", "Causa principal", "Días inc.", "Grave"]],
    columnStyles: {
      0: { cellWidth: CW * 0.22 },
      1: { cellWidth: CW * 0.12, halign: "center" },
      2: { cellWidth: CW * 0.2 },
      3: { cellWidth: CW * 0.29 },
      4: { cellWidth: CW * 0.09, halign: "center" },
      5: { cellWidth: CW * 0.08, halign: "center" },
    },
    body: saneaFilas(
      filas.map((f) => [
        f.nombreTrabajador,
        formatearFecha(f.fechaEvento),
        f.tipoLesion,
        f.causaPrincipal,
        String(f.diasIncapacidad),
        f.accidenteGrave ? "Sí" : "No",
      ])
    ),
  });

  return (doc as DocAT).lastAutoTable.finalY + 4;
}

function renderInvestigaciones(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  PH: number,
  FH: number,
  informe: InformeMensual
): number {
  y = checkPage(doc, y, 45, PH, FH);
  y = tituloSeccion(doc, "3. GESTIÓN DE INVESTIGACIÓN DE ACCIDENTES", M, CW, y);

  const filas = informe.accidentes.filasInvestigaciones;
  if (filas.length === 0) {
    return sinRegistros(
      doc,
      y,
      M,
      CW,
      "No hubo investigaciones de accidentes en el periodo."
    );
  }

  autoTable(doc, {
    ...estiloTabla(M, CW),
    startY: y,
    head: [["Trabajador", "Acción preventiva", "Acción correctiva", "Ejecución"]],
    columnStyles: {
      0: { cellWidth: CW * 0.22 },
      1: { cellWidth: CW * 0.3 },
      2: { cellWidth: CW * 0.3 },
      3: { cellWidth: CW * 0.18, halign: "center" },
    },
    body: saneaFilas(
      filas.map((f) => [
        f.nombreTrabajador,
        f.accionPreventiva,
        f.accionCorrectiva,
        formatearFecha(f.fechaEjecucion),
      ])
    ),
  });

  return (doc as DocAT).lastAutoTable.finalY + 4;
}

function renderMedicinaLaboral(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  PH: number,
  FH: number,
  informe: InformeMensual
): number {
  y = checkPage(doc, y, 45, PH, FH);
  y = tituloSeccion(doc, "4. GESTIÓN DE MEDICINA LABORAL", M, CW, y);

  const filas = informe.medicinaLaboral.filasSeguimientos;
  if (filas.length === 0) {
    return sinRegistros(
      doc,
      y,
      M,
      CW,
      "No se registraron seguimientos médicos en el periodo."
    );
  }

  autoTable(doc, {
    ...estiloTabla(M, CW),
    startY: y,
    head: [["Trabajador", "Tipo de seguimiento", "Observaciones"]],
    columnStyles: {
      0: { cellWidth: CW * 0.25 },
      1: { cellWidth: CW * 0.25 },
      2: { cellWidth: CW * 0.5 },
    },
    body: saneaFilas(
      filas.map((f) => [
        f.nombreTrabajador,
        f.tipoSeguimiento,
        f.observaciones || "—",
      ])
    ),
  });

  return (doc as DocAT).lastAutoTable.finalY + 4;
}

function renderInspecciones(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  PH: number,
  FH: number,
  informe: InformeMensual
): number {
  y = checkPage(doc, y, 60, PH, FH);
  y = tituloSeccion(doc, "5. CONSOLIDADO DE INSPECCIONES", M, CW, y);

  // Resumen por tipo: es lo que la ARL revisa primero.
  autoTable(doc, {
    ...estiloTabla(M, CW),
    startY: y,
    head: [["Tipo de inspección", "Realizadas"]],
    columnStyles: {
      0: { cellWidth: CW * 0.8 },
      1: { cellWidth: CW * 0.2, halign: "center", fontStyle: "bold" },
    },
    body: saneaFilas([
      ...informe.inspecciones.porTipo.map((t) => [t.etiqueta, String(t.cantidad)]),
      ["TOTAL", String(informe.inspecciones.total)],
    ]),
    didParseCell: (data) => {
      // Última fila = total.
      if (data.row.index === informe.inspecciones.porTipo.length) {
        data.cell.styles.fillColor = C.GRIS_CLARO;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  y = (doc as DocAT).lastAutoTable.finalY + 4;

  if (informe.inspecciones.filas.length === 0) {
    return sinRegistros(doc, y, M, CW, "No se realizaron inspecciones en el periodo.");
  }

  y = checkPage(doc, y, 40, PH, FH);
  autoTable(doc, {
    ...estiloTabla(M, CW),
    startY: y,
    head: [["Consecutivo", "Fecha", "Tipo", "Área", "Inspector", "Estado"]],
    columnStyles: {
      0: { cellWidth: CW * 0.2 },
      1: { cellWidth: CW * 0.11, halign: "center" },
      2: { cellWidth: CW * 0.22 },
      3: { cellWidth: CW * 0.15 },
      4: { cellWidth: CW * 0.19 },
      5: { cellWidth: CW * 0.13, halign: "center" },
    },
    body: saneaFilas(
      informe.inspecciones.filas.map((f) => [
        f.consecutivo,
        formatearFecha(f.fecha),
        f.tipoEtiqueta,
        f.area || "—",
        f.inspector || "—",
        f.estado || "—",
      ])
    ),
  });

  return (doc as DocAT).lastAutoTable.finalY + 4;
}

function renderActividades(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  PH: number,
  FH: number,
  informe: InformeMensual
): number {
  y = checkPage(doc, y, 55, PH, FH);
  y = tituloSeccion(doc, "6. ACTIVIDADES DE PROMOCIÓN Y PREVENCIÓN", M, CW, y);

  const a = informe.actividades;
  y = parrafo(
    doc,
    `En el periodo se ejecutaron ${a.total} actividades de promoción y prevención: ` +
      `${a.capacitaciones} capacitaciones (con ${a.totalParticipantes} asistencias registradas), ` +
      `${a.inducciones} inducciones, ${a.reinducciones} reinducciones, ` +
      `${a.inspecciones} inspecciones de seguridad ` +
      `y ${a.reunionesComite} reuniones de comité.`,
    M,
    y,
    CW,
    { fs: 8.5 }
  );

  if (a.filas.length === 0) {
    return sinRegistros(
      doc,
      y,
      M,
      CW,
      "No se registraron actividades de promoción y prevención en el periodo."
    );
  }

  y = checkPage(doc, y, 40, PH, FH);
  autoTable(doc, {
    ...estiloTabla(M, CW),
    startY: y,
    head: [["Fecha", "Origen", "Actividad", "Responsable / lugar", "Particip."]],
    columnStyles: {
      0: { cellWidth: CW * 0.11, halign: "center" },
      1: { cellWidth: CW * 0.14 },
      2: { cellWidth: CW * 0.4 },
      3: { cellWidth: CW * 0.25 },
      4: { cellWidth: CW * 0.1, halign: "center" },
    },
    body: saneaFilas(
      a.filas.map((f) => [
        formatearFecha(f.fecha),
        f.origen,
        f.descripcion,
        f.responsable,
        f.participantes === null ? "—" : String(f.participantes),
      ])
    ),
  });

  return (doc as DocAT).lastAutoTable.finalY + 4;
}

/**
 * Agrupa las filas de un origen por fecha, contando trabajadores.
 *
 * Cada registro de inducción es de un solo trabajador; el formato impreso pide
 * una fila por jornada con el total de asistentes.
 */
function agruparPorFecha(
  filas: InformeMensual["actividades"]["filas"],
  origen: string
): { fecha: string; responsable: string; trabajadores: number }[] {
  const porFecha = new Map<
    string,
    { responsables: Set<string>; trabajadores: number }
  >();

  for (const f of filas) {
    if (f.origen !== origen) continue;
    const actual = porFecha.get(f.fecha) ?? {
      responsables: new Set<string>(),
      trabajadores: 0,
    };
    actual.trabajadores += 1;
    if (f.responsable && f.responsable !== "—") {
      actual.responsables.add(f.responsable);
    }
    porFecha.set(f.fecha, actual);
  }

  return [...porFecha.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, v]) => ({
      fecha,
      responsable: v.responsables.size > 0 ? [...v.responsables].join(", ") : "—",
      trabajadores: v.trabajadores,
    }));
}

/**
 * Inducción y reinducción, cada una en su tabla.
 *
 * El formato impreso las exige separadas y la Resolución 0312/2019 las evalúa
 * bajo estándares distintos (1.2.2 y 2.8.1), aunque el sistema las guarde en
 * la misma tabla de Airtable.
 */
function renderInduccionesReinducciones(
  doc: jsPDF,
  y: number,
  M: number,
  CW: number,
  PH: number,
  FH: number,
  informe: InformeMensual
): number {
  y = checkPage(doc, y, 50, PH, FH);
  y = tituloSeccion(doc, "7. INDUCCIÓN Y REINDUCCIÓN EN SST", M, CW, y);

  const bloques: { titulo: string; origen: string }[] = [
    { titulo: "Inducción en SST ejecutada", origen: "Inducción" },
    { titulo: "Reinducción en SST ejecutada", origen: "Reinducción" },
  ];

  for (const bloque of bloques) {
    const jornadas = agruparPorFecha(informe.actividades.filas, bloque.origen);

    y = checkPage(doc, y, 30, PH, FH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.NEGRO);
    doc.text(textoSeguroPdf(bloque.titulo), M, y + 3);
    y += 6;

    if (jornadas.length === 0) {
      y = sinRegistros(
        doc,
        y,
        M,
        CW,
        `No se registraron jornadas de ${bloque.origen.toLowerCase()} en el periodo.`
      );
      continue;
    }

    autoTable(doc, {
      ...estiloTabla(M, CW),
      startY: y,
      head: [["Fecha", "Responsable", "N.º de trabajadores"]],
      columnStyles: {
        0: { cellWidth: CW * 0.2, halign: "center" },
        1: { cellWidth: CW * 0.55 },
        2: { cellWidth: CW * 0.25, halign: "center" },
      },
      body: saneaFilas(
        jornadas.map((j) => [
          formatearFecha(j.fecha),
          j.responsable,
          String(j.trabajadores),
        ])
      ),
    });

    y = (doc as DocAT).lastAutoTable.finalY + 5;
  }

  return y;
}
