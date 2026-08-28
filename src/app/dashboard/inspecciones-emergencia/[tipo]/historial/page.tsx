"use client";

// ══════════════════════════════════════════════════════════
// Historial — Inspecciones de equipos de emergencia
// Lista el periodo consultado y descarga el PDF de cada inspección.
// ══════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import {
  ESTADOS_INSPECCION,
  type EstadoInspeccion,
  type InspeccionResumen,
} from "@/lib/inspecciones-emergencia/types";
import { getMetaTipo } from "../../_components/config";
import {
  Aviso,
  BotonPrimario,
  BotonSecundario,
  BotonVolver,
  Cabecera,
  Campo,
  EstadoLista,
  Opciones,
  PaginaInspeccion,
  Panel,
  PildoraEstado,
  Texto,
  formatearFecha,
  hoyColombia,
} from "../../_components/ui";

/** Primer día del mes actual, para que la consulta abra con algo acotado. */
function inicioDelMes(): string {
  return `${hoyColombia().slice(0, 7)}-01`;
}

export default function HistorialInspeccionesPage() {
  const router = useRouter();
  const params = useParams<{ tipo: string }>();
  const meta = getMetaTipo(params?.tipo ?? "");

  const [desde, setDesde] = useState(inicioDelMes);
  const [hasta, setHasta] = useState(hoyColombia);
  const [estado, setEstado] = useState<EstadoInspeccion | "">("");

  const [inspecciones, setInspecciones] = useState<InspeccionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** idInspeccion cuyo PDF se está generando, para deshabilitar solo esa fila. */
  const [descargando, setDescargando] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const slug = meta?.slug;

  const consultar = useCallback(async () => {
    if (!slug) return;
    setCargando(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (desde) qs.set("desde", desde);
      if (hasta) qs.set("hasta", hasta);
      if (estado) qs.set("estado", estado);

      const res = await fetch(`/api/inspecciones-${slug}?${qs.toString()}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudieron cargar las inspecciones");
      }
      setInspecciones(json.data as InspeccionResumen[]);
    } catch (e) {
      console.error(`[inspecciones-${slug}] historial:`, e);
      setError(e instanceof Error ? e.message : "Error inesperado");
      setInspecciones([]);
    } finally {
      setCargando(false);
    }
  }, [slug, desde, hasta, estado, router]);

  useEffect(() => {
    consultar();
    // Solo en el montaje: los filtros se aplican con el botón Consultar, para
    // no disparar una llamada por cada tecla en los campos de fecha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function descargarPdf(insp: InspeccionResumen) {
    if (!slug) return;
    setErrorDescarga(null);
    setDescargando(insp.idInspeccion);
    try {
      const res = await fetch(`/api/inspecciones-${slug}/exportar-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idInspeccion: insp.idInspeccion }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "No se pudo generar el PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `Inspeccion_${meta!.equipoSingular.replace(/\s+/g, "_")}_${insp.idInspeccion}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(`[inspecciones-${slug}] exportar PDF:`, e);
      setErrorDescarga(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setDescargando(null);
    }
  }

  if (!meta) {
    return (
      <PaginaInspeccion>
        <BotonVolver
          href="/dashboard/inspecciones-emergencia"
          texto="Volver a Equipos de Emergencia"
        />
        <Aviso tono="error">El tipo de inspección «{params?.tipo}» no existe.</Aviso>
      </PaginaInspeccion>
    );
  }

  return (
    <PaginaInspeccion>
      <BotonVolver
        href="/dashboard/inspecciones-emergencia"
        texto="Volver a Equipos de Emergencia"
      />

      <Cabecera
        titulo={`Historial — ${meta.etiqueta}`}
        descripcion={`Inspecciones registradas de ${meta.equipoPlural.toLowerCase()}.`}
        acciones={
          <BotonSecundario
            onClick={() => router.push(`/dashboard/inspecciones-emergencia/${meta.slug}`)}
          >
            Nueva inspección
          </BotonSecundario>
        }
      />

      <Panel titulo="Periodo">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <Campo label="Desde">
            <Texto tipo="date" valor={desde} onChange={setDesde} />
          </Campo>
          <Campo label="Hasta">
            <Texto tipo="date" valor={hasta} onChange={setHasta} />
          </Campo>
          <Campo label="Estado">
            <Opciones<EstadoInspeccion>
              valor={estado}
              onChange={setEstado}
              opciones={ESTADOS_INSPECCION}
              placeholder="Todos"
            />
          </Campo>
          <BotonPrimario onClick={consultar} cargando={cargando}>
            Consultar
          </BotonPrimario>
        </div>
      </Panel>

      {errorDescarga && (
        <div className="mb-4">
          <Aviso tono="error">{errorDescarga}</Aviso>
        </div>
      )}

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={inspecciones.length === 0}
        mensajeVacio="No hay inspecciones registradas en el periodo seleccionado."
      />

      {!cargando && !error && inspecciones.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Consecutivo", "Fecha", "Inspector", "Estado", "Elementos", "Observaciones"].map(
                  (t) => (
                    <th
                      key={t}
                      className="px-4 py-3 text-left text-white/60 font-medium whitespace-nowrap"
                    >
                      {t}
                    </th>
                  )
                )}
                <th className="px-4 py-3 text-right text-white/60 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {inspecciones.map((insp) => (
                <tr
                  key={insp.recordId}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                    {insp.idInspeccion}
                  </td>
                  <td className="px-4 py-3 text-white/80 whitespace-nowrap">
                    {formatearFecha(insp.fecha)}
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {insp.inspector || "—"}
                    {insp.cargoInspector && (
                      <span className="block text-white/40 text-xs">{insp.cargoInspector}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PildoraEstado estado={insp.estado} />
                  </td>
                  <td className="px-4 py-3 text-white/70">{insp.detallesCount}</td>
                  <td className="px-4 py-3 text-white/60 max-w-xs">
                    {insp.observaciones || <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => descargarPdf(insp)}
                      disabled={descargando !== null}
                      className="p-1.5 rounded-lg text-white/50 hover:text-blue-300 hover:bg-blue-500/15
                                 transition-colors disabled:opacity-40"
                      aria-label={`Descargar PDF de ${insp.idInspeccion}`}
                    >
                      {descargando === insp.idInspeccion ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PaginaInspeccion>
  );
}
