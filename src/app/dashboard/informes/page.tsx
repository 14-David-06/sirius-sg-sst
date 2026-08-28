"use client";

// ══════════════════════════════════════════════════════════
// Informe mensual de gestión SST
// Consulta el consolidado del mes y descarga el PDF del formato.
// ══════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Download, FileText, Loader2 } from "lucide-react";
import type { InformeMensual } from "@/lib/informes/types";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CLASE_CONTROL =
  "px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm " +
  "focus:outline-none focus:border-blue-400/60 focus:bg-white/10 transition-colors";

function hoyColombia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return "—";
  return `${dia}/${mes}/${anio}`;
}

export default function InformeMensualPage() {
  const router = useRouter();
  const [hoy] = useState(hoyColombia);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));

  const [informe, setInforme] = useState<InformeMensual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/informes/mensual?mes=${mes}&anio=${anio}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo generar el informe");
      }
      setInforme(json.data as InformeMensual);
    } catch (e) {
      console.error("[informe-mensual] consultar:", e);
      setError(e instanceof Error ? e.message : "Error inesperado");
      setInforme(null);
    } finally {
      setCargando(false);
    }
  }, [mes, anio, router]);

  useEffect(() => {
    consultar();
  }, [consultar]);

  async function descargarPdf() {
    setDescargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/informes/mensual/pdf?mes=${mes}&anio=${anio}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "No se pudo generar el PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `Informe_Gestion_SST_${anio}-${String(mes).padStart(2, "0")}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[informe-mensual] PDF:", e);
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setDescargando(false);
    }
  }

  const anios = Array.from({ length: 6 }, (_, i) => Number(hoy.slice(0, 4)) - 4 + i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-sm
                     border border-white/10 transition-all text-white/70 hover:text-white
                     text-sm inline-flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al Dashboard
        </button>

        <div
          className="mb-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl
                     rounded-2xl p-8 border border-white/20 shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
              <FileText className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-white mb-2">
                Informe mensual de gestión SST
              </h1>
              <p className="text-white/70 max-w-3xl">
                Consolida accidentes, medicina laboral, inspecciones y actividades de
                promoción y prevención del mes. Los 18 indicadores legales salen de los
                módulos, no se recalculan aquí.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className={CLASE_CONTROL}
            >
              {MESES.map((nombre, i) => (
                <option key={nombre} value={i + 1} className="bg-slate-800">
                  {nombre}
                </option>
              ))}
            </select>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className={CLASE_CONTROL}
            >
              {anios.map((a) => (
                <option key={a} value={a} className="bg-slate-800">
                  {a}
                </option>
              ))}
            </select>

            <button
              onClick={descargarPdf}
              disabled={cargando || descargando || !informe}
              className="px-4 py-2 rounded-lg bg-blue-500/25 hover:bg-blue-500/35 border border-blue-400/40
                         text-blue-100 text-sm font-medium transition-colors disabled:opacity-50
                         inline-flex items-center gap-2"
            >
              {descargando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Descargar PDF
            </button>
          </div>
        </div>

        {cargando && (
          <div className="flex items-center justify-center gap-3 py-16 text-white/60">
            <Loader2 className="w-5 h-5 animate-spin" />
            Consolidando el informe…
          </div>
        )}

        {error && !cargando && (
          <div className="px-4 py-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        {informe && !cargando && (
          <>
            {informe.seccionesIncompletas.length > 0 && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm">
                <p className="font-medium">
                  Informe incompleto — estas consultas no se pudieron leer:
                </p>
                <ul className="mt-1 list-disc list-inside text-amber-200/80">
                  {informe.seccionesIncompletas.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            <Seccion titulo="Estadísticas legales">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-white/60 font-medium">
                        Indicador
                      </th>
                      <th className="px-4 py-3 text-right text-white/60 font-medium w-24">
                        Valor
                      </th>
                      <th className="px-4 py-3 text-left text-white/60 font-medium w-48">
                        Fuente
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.estadisticasLegales.map((f) => (
                      <tr
                        key={f.indicador}
                        className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-white/80">{f.indicador}</td>
                        <td className="px-4 py-2.5 text-right text-white font-semibold tabular-nums">
                          {f.valor}
                        </td>
                        <td className="px-4 py-2.5 text-white/40 text-xs">{f.origen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Seccion>

            <Seccion titulo="Consolidado de inspecciones">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {informe.inspecciones.porTipo.map((t) => (
                  <div
                    key={t.tipo}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {t.cantidad}
                    </p>
                    <p className="text-white/50 text-xs mt-0.5">{t.etiqueta}</p>
                  </div>
                ))}
              </div>
              <p className="text-white/60 text-sm">
                Total del periodo:{" "}
                <span className="text-white font-semibold">
                  {informe.inspecciones.total}
                </span>{" "}
                inspecciones.
              </p>
            </Seccion>

            <Seccion titulo="Actividades de promoción y prevención">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4">
                <Kpi valor={informe.actividades.total} etiqueta="Total" destacado />
                <Kpi valor={informe.actividades.capacitaciones} etiqueta="Capacitaciones" />
                <Kpi valor={informe.actividades.inducciones} etiqueta="Inducciones" />
                <Kpi valor={informe.actividades.reinducciones} etiqueta="Reinducciones" />
                <Kpi valor={informe.actividades.inspecciones} etiqueta="Inspecciones" />
                <Kpi valor={informe.actividades.reunionesComite} etiqueta="Comités" />
              </div>

              {informe.actividades.filas.length === 0 ? (
                <p className="text-white/40 text-sm">
                  No hay actividades registradas en el periodo.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        {["Fecha", "Origen", "Actividad", "Responsable", "Particip."].map(
                          (t) => (
                            <th
                              key={t}
                              className="px-4 py-3 text-left text-white/60 font-medium whitespace-nowrap"
                            >
                              {t}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {informe.actividades.filas.map((f, i) => (
                        <tr
                          key={`${f.origen}-${f.fecha}-${i}`}
                          className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-white/70 whitespace-nowrap">
                            {formatearFecha(f.fecha)}
                          </td>
                          <td className="px-4 py-2.5 text-white/50 text-xs whitespace-nowrap">
                            {f.origen}
                          </td>
                          <td className="px-4 py-2.5 text-white/80">{f.descripcion}</td>
                          <td className="px-4 py-2.5 text-white/60">{f.responsable}</td>
                          <td className="px-4 py-2.5 text-white/70 tabular-nums">
                            {f.participantes ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Seccion>
          </>
        )}
      </div>
    </div>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{titulo}</h2>
      {children}
    </section>
  );
}

function Kpi({
  valor,
  etiqueta,
  destacado,
}: {
  valor: number;
  etiqueta: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        destacado
          ? "border-blue-400/30 bg-blue-500/15"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-2xl font-bold text-white tabular-nums">{valor}</p>
      <p className="text-white/50 text-xs mt-0.5">{etiqueta}</p>
    </div>
  );
}
