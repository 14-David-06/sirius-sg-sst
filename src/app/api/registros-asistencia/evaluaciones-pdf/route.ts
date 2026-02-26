import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";
import {
  airtableSGSSTConfig,
  getSGSSTUrl,
  getSGSSTHeaders,
} from "@/infrastructure/config/airtableSGSST";

// ══════════════════════════════════════════════════════════
// Interfaces
// ══════════════════════════════════════════════════════════
interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface EvalResult {
  id: string;
  nombres: string;
  cedula: string;
  cargo: string;
  plantillaId: string;
  plantillaNombre: string;
  puntajeObtenido: number;
  puntajeMaximo: number;
  porcentaje: number;
  estado: string;
  intento: number;
  fecha: string;
}

// ══════════════════════════════════════════════════════════
// POST /api/registros-asistencia/evaluaciones-pdf
// ══════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { registroRecordId } = body;
    if (!registroRecordId) {
      return NextResponse.json({ success: false, message: "registroRecordId requerido" }, { status: 400 });
    }

    const {
      eventosCapacitacionTableId,
      eventosCapacitacionFields: evtF,
      evalAplicadasTableId,
      evalAplicadasFields: eF,
      plantillasEvalTableId,
      plantillasEvalFields: pF,
      asistenciaCapacitacionesTableId,
      asistenciaCapacitacionesFields: aF,
    } = airtableSGSSTConfig;

    const headers = getSGSSTHeaders();
    const base = getSGSSTUrl;

    // ── 1. Fetch Event ──────────────────────────────────
    const evtUrl = `${base(eventosCapacitacionTableId)}/${registroRecordId}?returnFieldsByFieldId=true`;
    const evtRes = await fetch(evtUrl, { headers, cache: "no-store" });
    if (!evtRes.ok) throw new Error("No se pudo obtener el evento");
    const evtData = await evtRes.json();
    const evtFields = evtData.fields || {};

    const nombreEvento = (evtFields[evtF.TEMAS_TRATADOS] as string || "Evento sin nombre").split("\n")[0];
    const fecha = evtFields[evtF.FECHA] as string || "";
    const ciudad = evtFields[evtF.CIUDAD] as string || "";
    const tipo = evtFields[evtF.TIPO] as string || "";
    const conferencista = evtFields[evtF.NOMBRE_CONFERENCISTA] as string || "";
    const progIds = (evtFields[evtF.PROGRAMACION_LINK] as string[]) || [];

    if (!progIds.length) {
      return NextResponse.json({ success: false, message: "El evento no tiene programaciones asociadas" }, { status: 404 });
    }

    // ── 2. Fetch Asistentes (batched for large events) ──
    const asisIds = (evtFields[evtF.ASISTENCIA_LINK] as string[]) || [];
    const attendeeMap: Record<string, { nombre: string; cedula: string }> = {};
    if (asisIds.length) {
      const asisBatch = 50; // Airtable formula length safety
      for (let i = 0; i < asisIds.length; i += asisBatch) {
        const batch = asisIds.slice(i, i + asisBatch);
        const asisFormula = `OR(${batch.map(id => `RECORD_ID()='${id}'`).join(",")})`;
        const asisUrl = `${base(asistenciaCapacitacionesTableId)}?returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(asisFormula)}&fields[]=${aF.NOMBRES}&fields[]=${aF.CEDULA}&fields[]=${aF.ID_EMPLEADO_CORE}`;
        const asisRes = await fetch(asisUrl, { headers, cache: "no-store" });
        if (asisRes.ok) {
          const asisData = await asisRes.json();
          for (const r of (asisData.records || []) as AirtableRecord[]) {
            const empId = r.fields[aF.ID_EMPLEADO_CORE] as string;
            if (empId) {
              attendeeMap[empId] = {
                nombre: r.fields[aF.NOMBRES] as string || "",
                cedula: r.fields[aF.CEDULA] as string || "",
              };
            }
          }
        }
      }
    }

    // ── 3. Fetch EvalAplicadas by employee IDs, then filter by PROG_CAP in code ──
    // (FIND/ARRAYJOIN with field IDs doesn't work on linked record fields)
    const employeeIds = Object.keys(attendeeMap);
    if (!employeeIds.length) {
      return NextResponse.json({ success: false, message: "No se encontraron asistentes para este evento" }, { status: 404 });
    }

    const evalFields = [
      eF.NOMBRES, eF.CEDULA, eF.CARGO, eF.PLANTILLA,
      eF.PUNTAJE_OBT, eF.PUNTAJE_MAX, eF.PORCENTAJE,
      eF.ESTADO, eF.INTENTO, eF.FECHA, eF.ID_EMPLEADO, eF.PROG_CAP,
    ];
    const evalFieldsQs = evalFields.map(f => `fields[]=${f}`).join("&");

    const evalRecords: AirtableRecord[] = [];
    const progIdsSet = new Set(progIds);
    const batchSize = 20;

    for (let i = 0; i < employeeIds.length; i += batchSize) {
      const batch = employeeIds.slice(i, i + batchSize);
      const orParts = batch.map(id => `{${eF.ID_EMPLEADO}}="${id}"`);
      const formula = encodeURIComponent(`OR(${orParts.join(",")})`);
      let url: string | null = `${base(evalAplicadasTableId)}?returnFieldsByFieldId=true&filterByFormula=${formula}&${evalFieldsQs}`;

      // Handle Airtable pagination
      while (url) {
        const fetchRes: Response = await fetch(url, { headers, cache: "no-store" });
        if (!fetchRes.ok) break;
        const data = await fetchRes.json();
        const records = (data.records || []) as AirtableRecord[];

        // Filter by PROG_CAP matching this event's programación IDs
        for (const r of records) {
          const rprogIds = (r.fields[eF.PROG_CAP] as string[]) || [];
          if (rprogIds.some(pid => progIdsSet.has(pid))) {
            evalRecords.push(r);
          }
        }

        if (data.offset) {
          url = `${base(evalAplicadasTableId)}?returnFieldsByFieldId=true&filterByFormula=${formula}&${evalFieldsQs}&offset=${data.offset}`;
        } else {
          url = null;
        }
      }
    }

    if (!evalRecords.length) {
      return NextResponse.json({ success: false, message: "No se encontraron evaluaciones para este evento" }, { status: 404 });
    }

    // ── 4. Fetch Plantilla names ────────────────────────
    const plantillaIds = [...new Set(
      evalRecords
        .flatMap(r => (r.fields[eF.PLANTILLA] as string[]) || [])
        .filter(Boolean)
    )];
    const plantillaNames: Record<string, string> = {};
    if (plantillaIds.length) {
      const plFormula = `OR(${plantillaIds.map(id => `RECORD_ID()='${id}'`).join(",")})`;
      const plUrl = `${base(plantillasEvalTableId)}?returnFieldsByFieldId=true&filterByFormula=${encodeURIComponent(plFormula)}&fields[]=${pF.NOMBRE}`;
      const plRes = await fetch(plUrl, { headers, cache: "no-store" });
      if (plRes.ok) {
        const plData = await plRes.json();
        for (const r of (plData.records || []) as AirtableRecord[]) {
          plantillaNames[r.id] = r.fields[pF.NOMBRE] as string || "Evaluación";
        }
      }
    }

    // ── 5. Build structured results ─────────────────────
    const results: EvalResult[] = evalRecords.map(r => {
      const plantillaArr = (r.fields[eF.PLANTILLA] as string[]) || [];
      const plId = plantillaArr[0] || "";
      return {
        id: r.id,
        nombres: r.fields[eF.NOMBRES] as string || "",
        cedula: r.fields[eF.CEDULA] as string || "",
        cargo: r.fields[eF.CARGO] as string || "",
        plantillaId: plId,
        plantillaNombre: plantillaNames[plId] || "Evaluación",
        puntajeObtenido: Number(r.fields[eF.PUNTAJE_OBT]) || 0,
        puntajeMaximo: Number(r.fields[eF.PUNTAJE_MAX]) || 0,
        porcentaje: Number(r.fields[eF.PORCENTAJE]) || 0,
        estado: r.fields[eF.ESTADO] as string || "",
        intento: Number(r.fields[eF.INTENTO]) || 1,
        fecha: r.fields[eF.FECHA] as string || "",
      };
    });

    // Keep only best attempt per person per plantilla
    const bestByKey: Record<string, EvalResult> = {};
    for (const r of results) {
      const key = `${r.cedula}__${r.plantillaId}`;
      const existing = bestByKey[key];
      if (!existing || r.porcentaje > existing.porcentaje) {
        bestByKey[key] = r;
      }
    }
    const bestResults = Object.values(bestByKey).sort((a, b) => a.nombres.localeCompare(b.nombres));

    // ── 6. Summary stats ────────────────────────────────
    const totalEvaluados = [...new Set(bestResults.map(r => r.cedula))].length;
    const aprobados = bestResults.filter(r => r.estado === "Aprobada").length;
    const noAprobados = bestResults.filter(r => r.estado !== "Aprobada").length;
    const promedioGeneral = bestResults.length > 0
      ? Math.round((bestResults.reduce((s, r) => s + r.porcentaje, 0) / bestResults.length) * 100) / 100
      : 0;

    // ── 7. Generate PDF ─────────────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // Load logo
    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    } catch { /* no logo */ }

    // Format date
    const formatFecha = (raw: string) => {
      if (!raw) return "—";
      try {
        const d = new Date(raw + "T12:00:00");
        return d.toLocaleDateString("es-CO", {
          timeZone: "America/Bogota",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch { return raw; }
    };

    // ── Header ──────────────────────────────────────────
    let y = margin;

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", margin, y, 40, 14);
      } catch { /* skip logo */ }
    }

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Sirius Regenerative Solutions S.A.S. ZOMAC", pageWidth - margin, y + 4, { align: "right" });
    doc.text("Sistema de Gestión de Seguridad y Salud en el Trabajo", pageWidth - margin, y + 8, { align: "right" });

    y += 20;

    // Title
    doc.setFontSize(14);
    doc.setTextColor(1, 84, 172); // #0154AC
    doc.setFont("helvetica", "bold");
    doc.text("Informe de Resultados de Evaluaciones", pageWidth / 2, y, { align: "center" });
    y += 8;

    // Event info
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");

    const eventInfoLines = [
      `Evento: ${nombreEvento}`,
      `Fecha: ${formatFecha(fecha)}  |  Ciudad: ${ciudad}`,
      `Tipo: ${tipo}  |  Conferencista: ${conferencista}`,
    ];

    for (const line of eventInfoLines) {
      const splitLines = doc.splitTextToSize(line, contentWidth);
      doc.text(splitLines, pageWidth / 2, y, { align: "center" });
      y += splitLines.length * 4;
    }

    y += 3;

    // ── Summary box ─────────────────────────────────────
    doc.setDrawColor(1, 84, 172);
    doc.setFillColor(240, 246, 255);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "FD");

    const colW = contentWidth / 4;
    const summaryData = [
      { label: "Total Evaluados", value: String(totalEvaluados) },
      { label: "Aprobados", value: String(aprobados) },
      { label: "No Aprobados", value: String(noAprobados) },
      { label: "Promedio General", value: `${promedioGeneral}%` },
    ];

    for (let i = 0; i < summaryData.length; i++) {
      const cx = margin + colW * i + colW / 2;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(1, 84, 172);
      doc.text(summaryData[i].value, cx, y + 9, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(summaryData[i].label, cx, y + 15, { align: "center" });
    }

    y += 26;

    // ── Results table ───────────────────────────────────
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("Resultados Individuales", margin, y);
    y += 5;

    const tableHead = [["#", "Nombre", "C.C.", "Evaluación", "Puntaje", "%", "Estado"]];
    const tableBody = bestResults.map((r, i) => [
      String(i + 1),
      r.nombres,
      r.cedula,
      r.plantillaNombre,
      `${r.puntajeObtenido.toFixed(2)}/${r.puntajeMaximo.toFixed(2)}`,
      `${r.porcentaje.toFixed(2)}%`,
      r.estado,
    ]);

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [1, 84, 172],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: "auto" },
        2: { halign: "center", cellWidth: 22 },
        3: { cellWidth: "auto" },
        4: { halign: "center", cellWidth: 24 },
        5: { halign: "center", cellWidth: 16 },
        6: { halign: "center", cellWidth: 22 },
      },
      bodyStyles: {
        textColor: [50, 50, 50],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 255],
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 6) {
          const val = data.cell.raw as string;
          if (val === "Aprobada") {
            data.cell.styles.textColor = [22, 163, 74]; // green-600
            data.cell.styles.fontStyle = "bold";
          } else if (val === "No Aprobada") {
            data.cell.styles.textColor = [220, 38, 38]; // red-600
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: margin, right: margin },
    });

    // Get final Y after table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY || y + 50;
    y += 8;

    // ── Per-evaluation breakdown (if multiple plantillas) ──
    const uniquePlantillas = [...new Set(bestResults.map(r => r.plantillaId))];
    if (uniquePlantillas.length > 1) {
      for (const plId of uniquePlantillas) {
        const plResults = bestResults.filter(r => r.plantillaId === plId);
        const plName = plantillaNames[plId] || "Evaluación";
        const plAprobados = plResults.filter(r => r.estado === "Aprobada").length;
        const plProm = plResults.length > 0
          ? Math.round((plResults.reduce((s, r) => s + r.porcentaje, 0) / plResults.length) * 100) / 100
          : 0;

        // Check page space
        if (y > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          y = margin;
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(1, 84, 172);
        doc.text(`${plName}`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(7.5);
        doc.text(`  ${plAprobados}/${plResults.length} aprobados · Promedio: ${plProm}%`, margin + doc.getTextWidth(plName) + 2, y);
        y += 5;

        const subHead = [["#", "Nombre", "C.C.", "Puntaje", "%", "Estado"]];
        const subBody = plResults.map((r, i) => [
          String(i + 1),
          r.nombres,
          r.cedula,
          `${r.puntajeObtenido.toFixed(2)}/${r.puntajeMaximo.toFixed(2)}`,
          `${r.porcentaje.toFixed(2)}%`,
          r.estado,
        ]);

        autoTable(doc, {
          startY: y,
          head: subHead,
          body: subBody,
          theme: "grid",
          styles: {
            fontSize: 7,
            cellPadding: 1.5,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [100, 116, 139], // slate-500
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7,
            halign: "center",
          },
          columnStyles: {
            0: { halign: "center", cellWidth: 8 },
            1: { cellWidth: "auto" },
            2: { halign: "center", cellWidth: 22 },
            3: { halign: "center", cellWidth: 24 },
            4: { halign: "center", cellWidth: 16 },
            5: { halign: "center", cellWidth: 22 },
          },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 5) {
              const val = data.cell.raw as string;
              if (val === "Aprobada") {
                data.cell.styles.textColor = [22, 163, 74];
                data.cell.styles.fontStyle = "bold";
              } else if (val === "No Aprobada") {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = "bold";
              }
            }
          },
          margin: { left: margin, right: margin },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable?.finalY || y + 30;
        y += 8;
      }
    }

    // ── Footer on all pages ─────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      const ph = doc.internal.pageSize.getHeight();
      doc.text(
        `Sirius SG-SST · Informe de Evaluaciones · Generado el ${new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", year: "numeric", month: "long", day: "numeric" })}`,
        pageWidth / 2,
        ph - 8,
        { align: "center" }
      );
      doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, ph - 8, { align: "right" });
    }

    // ── Return PDF ──────────────────────────────────────
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Evaluaciones_${fecha || "informe"}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[evaluaciones-pdf] Error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error al generar PDF" },
      { status: 500 }
    );
  }
}
