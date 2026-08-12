"use client";

// ══════════════════════════════════════════════════════════
// Reportes preventivos: casi accidentes, actos y condiciones inseguras
// Alimentan tres de las estadísticas legales del informe mensual
// ══════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  ChevronLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  ESTADOS_REPORTE,
  NIVELES_RIESGO,
  TIPOS_REPORTE,
  type EstadoReporte,
  type NivelRiesgo,
  type ReporteCondicion,
  type TipoReporte,
} from "@/lib/accidentes/types";

const claseInput =
  "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400/50";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function hoyColombia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function rangoDelMes(anio: number, mes: number) {
  const mm = String(mes).padStart(2, "0");
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return {
    desde: `${anio}-${mm}-01`,
    hasta: `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

const COLOR_TIPO: Record<TipoReporte, string> = {
  "Casi accidente": "bg-orange-500/20 text-orange-200 border-orange-400/30",
  "Acto inseguro": "bg-amber-500/20 text-amber-200 border-amber-400/30",
  "Condición insegura": "bg-red-500/20 text-red-200 border-red-400/30",
};

export default function ReportesPreventivosPage() {
  const router = useRouter();
  const [hoy] = useState(hoyColombia);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));

  const [reportes, setReportes] = useState<ReporteCondicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const periodo = useMemo(() => rangoDelMes(anio, mes), [anio, mes]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/accidentes/reportes?desde=${periodo.desde}&hasta=${periodo.hasta}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudieron cargar los reportes");
      }
      setReportes(json.data as ReporteCondicion[]);
    } catch (e) {
      console.error("[accidentes] reportes:", e);
      setError(e instanceof Error ? e.message : "Error al cargar los reportes");
    } finally {
      setCargando(false);
    }
  }, [periodo.desde, periodo.hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const conteos = useMemo(() => {
    const contar = (tipo: TipoReporte) =>
      reportes.filter((r) => r.tipo === tipo).length;
    return {
      casiAccidentes: contar("Casi accidente"),
      actosInseguros: contar("Acto inseguro"),
      condicionesInseguras: contar("Condición insegura"),
    };
  }, [reportes]);

  const cambiarEstado = async (
    reporte: ReporteCondicion,
    nuevoEstado: EstadoReporte
  ) => {
    try {
      const res = await fetch(`/api/accidentes/reportes/${reporte.recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: nuevoEstado,
          fechaCierre:
            nuevoEstado === "Cerrado"
              ? reporte.fechaCierre ?? hoyColombia()
              : reporte.fechaCierre,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo actualizar el reporte");
      }
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar el reporte");
    }
  };

  const eliminar = async (reporte: ReporteCondicion) => {
    if (!confirm(`¿Desactivar el reporte ${reporte.idReporte}?`)) return;
    try {
      const res = await fetch(`/api/accidentes/reportes/${reporte.recordId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo desactivar el reporte");
      }
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al desactivar el reporte");
    }
  };

  const anios = useMemo(() => {
    const actual = Number(hoy.slice(0, 4));
    return [actual + 1, actual, actual - 1, actual - 2];
  }, [hoy]);

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-10">
        <Image
          src="/20032025-DSC_3717.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          quality={85}
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard/accidentes")}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Volver</span>
              </button>
              <div className="h-6 w-px bg-white/20" />
              <h1 className="text-xl font-bold text-white">Reportes preventivos</h1>
            </div>
            <button
              onClick={() => setMostrarFormulario((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nuevo reporte
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Periodo y conteos */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Mes
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className={claseInput}
              >
                {MESES.map((nombre, i) => (
                  <option key={nombre} value={i + 1} className="bg-slate-800">
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Año
              </label>
              <select
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className={claseInput}
              >
                {anios.map((a) => (
                  <option key={a} value={a} className="bg-slate-800">
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-6 pb-2 text-sm">
              <span className="text-white/70">
                Casi accidentes:{" "}
                <strong className="text-white">{conteos.casiAccidentes}</strong>
              </span>
              <span className="text-white/70">
                Actos inseguros:{" "}
                <strong className="text-white">{conteos.actosInseguros}</strong>
              </span>
              <span className="text-white/70">
                Condiciones inseguras:{" "}
                <strong className="text-white">{conteos.condicionesInseguras}</strong>
              </span>
            </div>
          </div>
        </div>

        {mostrarFormulario && (
          <FormularioReporte
            onCancelar={() => setMostrarFormulario(false)}
            onCreado={() => {
              setMostrarFormulario(false);
              cargar();
            }}
          />
        )}

        {/* Listado */}
        {cargando ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
          </div>
        ) : reportes.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-12 text-center">
            <p className="text-white/70 font-medium">
              No se registraron reportes en el periodo evaluado
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reportes.map((reporte) => (
              <div
                key={reporte.recordId}
                className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-white/40">
                        {reporte.idReporte}
                      </span>
                      {reporte.tipo && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] border ${
                            COLOR_TIPO[reporte.tipo]
                          }`}
                        >
                          {reporte.tipo}
                        </span>
                      )}
                      {reporte.nivelRiesgo && (
                        <span className="text-[11px] text-white/50">
                          Riesgo {reporte.nivelRiesgo}
                        </span>
                      )}
                      <span className="text-[11px] text-white/40">
                        {formatearFecha(reporte.fechaReporte)}
                      </span>
                    </div>
                    <p className="text-sm text-white/90">{reporte.descripcion}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {reporte.areaLugar || "Sin área"} ·{" "}
                      {reporte.reportanteNombre || "Reportante no registrado"}
                      {reporte.fechaCierre
                        ? ` · Cierre: ${formatearFecha(reporte.fechaCierre)}`
                        : ""}
                    </p>
                    {reporte.accionInmediata && (
                      <p className="text-xs text-white/60 mt-1.5">
                        <span className="text-white/40">Acción inmediata: </span>
                        {reporte.accionInmediata}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={reporte.estado || "Abierto"}
                      onChange={(e) =>
                        cambiarEstado(reporte, e.target.value as EstadoReporte)
                      }
                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                    >
                      {ESTADOS_REPORTE.map((e) => (
                        <option key={e} value={e} className="bg-slate-800">
                          {e}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => eliminar(reporte)}
                      title="Desactivar reporte"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Formulario de nuevo reporte
// ══════════════════════════════════════════════════════════
interface AreaCatalogo {
  recordId: string;
  codigo: string;
  nombre: string;
}

function FormularioReporte({
  onCancelar,
  onCreado,
}: {
  onCancelar: () => void;
  onCreado: () => void;
}) {
  const [areas, setAreas] = useState<AreaCatalogo[]>([]);
  const [tipo, setTipo] = useState<TipoReporte>("Condición insegura");
  const [fechaReporte, setFechaReporte] = useState(hoyColombia);
  const [reportanteNombre, setReportanteNombre] = useState("");
  const [areaLugar, setAreaLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nivelRiesgo, setNivelRiesgo] = useState<NivelRiesgo>("Medio");
  const [accionInmediata, setAccionInmediata] = useState("");
  const [responsableNombre, setResponsableNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/personal/areas");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAreas(json.data as AreaCatalogo[]);
        }
      } catch (e) {
        console.error("[accidentes] cargar áreas:", e);
      }
    })();
  }, []);

  const guardar = async () => {
    setErrorLocal(null);
    if (!descripcion.trim()) {
      setErrorLocal("La descripción del reporte es obligatoria");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch("/api/accidentes/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          fechaReporte,
          reportanteNombre: reportanteNombre || undefined,
          areaLugar: areaLugar || undefined,
          descripcion: descripcion.trim(),
          nivelRiesgo,
          accionInmediata: accionInmediata || undefined,
          responsableNombre: responsableNombre || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo registrar el reporte");
      }
      onCreado();
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : "Error al registrar el reporte");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-6 space-y-4">
      <h2 className="text-base font-semibold text-white">Nuevo reporte</h2>

      {errorLocal && <p className="text-red-300 text-sm">{errorLocal}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Tipo <span className="text-red-300">*</span>
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoReporte)}
            className={claseInput}
          >
            {TIPOS_REPORTE.map((t) => (
              <option key={t} value={t} className="bg-slate-800">
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Fecha <span className="text-red-300">*</span>
          </label>
          <input
            type="date"
            value={fechaReporte}
            onChange={(e) => setFechaReporte(e.target.value)}
            className={claseInput}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Nivel de riesgo
          </label>
          <select
            value={nivelRiesgo}
            onChange={(e) => setNivelRiesgo(e.target.value as NivelRiesgo)}
            className={claseInput}
          >
            {NIVELES_RIESGO.map((n) => (
              <option key={n} value={n} className="bg-slate-800">
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Quién reporta
          </label>
          <input
            type="text"
            value={reportanteNombre}
            onChange={(e) => setReportanteNombre(e.target.value)}
            className={claseInput}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Área
          </label>
          <select
            value={areaLugar}
            onChange={(e) => setAreaLugar(e.target.value)}
            className={claseInput}
          >
            <option value="" className="bg-slate-800">
              Seleccione el área…
            </option>
            {areas.map((area) => (
              <option key={area.recordId} value={area.nombre} className="bg-slate-800">
                {area.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">
          Descripción <span className="text-red-300">*</span>
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className={claseInput}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Acción inmediata
          </label>
          <textarea
            value={accionInmediata}
            onChange={(e) => setAccionInmediata(e.target.value)}
            rows={2}
            className={claseInput}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Responsable del cierre
          </label>
          <input
            type="text"
            value={responsableNombre}
            onChange={(e) => setResponsableNombre(e.target.value)}
            className={claseInput}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancelar}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/15"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {guardando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar reporte
        </button>
      </div>
    </div>
  );
}
