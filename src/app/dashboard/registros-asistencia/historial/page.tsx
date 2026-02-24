"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  ClipboardList,
  FileDown,
  PlusCircle,
  CheckCircle,
  Clock,
  CalendarDays,
  List,
  Users,
  BookOpen,
} from "lucide-react";

interface RegistroResumen {
  id: string;
  idRegistro: string;
  nombreEvento: string;
  ciudad: string;
  fecha: string;
  tipo: string;
  area: string;
  nombreConferencista: string;
  estado: string;
  cantidadAsistentes: number;
}

interface Programacion {
  id: string;
  identificador: string;
  mes: string;
  trimestre: string;
  programado: boolean;
  ejecutado: boolean;
  fechaEjecucion: string;
  totalAsistentes: number;
  capacitacionNombre: string;
  capacitacionCodigo: string;
  observaciones: string;
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function HistorialRegistrosPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lista" | "calendario">("lista");

  // ── Lista state ───────────────────────────────────────────
  const [registros, setRegistros] = useState<RegistroResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportandoId, setExportandoId] = useState<string | null>(null);

  // ── Calendario state ──────────────────────────────────────
  const [programacion, setProgramacion] = useState<Programacion[]>([]);
  const [loadingCal, setLoadingCal] = useState(false);
  const [errorCal, setErrorCal] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // "YYYY-MM-DD"

  // ── Fetch: lista ──────────────────────────────────────────
  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/registros-asistencia");
      const json = await res.json();
      if (json.success) setRegistros(json.data);
      else setError(json.message || "Error cargando registros");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch: calendario ─────────────────────────────────────
  const fetchProgramacion = useCallback(async () => {
    if (programacion.length > 0) return; // already loaded
    setLoadingCal(true);
    setErrorCal(null);
    try {
      const res = await fetch("/api/programacion-capacitaciones");
      const json = await res.json();
      if (json.success) setProgramacion(json.data);
      else setErrorCal(json.message || "Error cargando programación");
    } catch {
      setErrorCal("Error de conexión");
    } finally {
      setLoadingCal(false);
    }
  }, [programacion.length]);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  useEffect(() => {
    if (activeTab === "calendario") fetchProgramacion();
  }, [activeTab, fetchProgramacion]);

  // ── Calendar helpers ──────────────────────────────────────
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Programacion[]>();
    programacion.forEach((p) => {
      if (!p.fechaEjecucion) return;
      const list = map.get(p.fechaEjecucion) ?? [];
      list.push(p);
      map.set(p.fechaEjecucion, list);
    });
    return map;
  }, [programacion]);

  const sinFecha = useMemo(
    () => programacion.filter((p) => !p.fechaEjecucion && p.programado),
    [programacion]
  );

  // Build calendar grid (Mon-first)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Mon=0 … Sun=6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [currentYear, currentMonth]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const formatDateKey = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
    setSelectedDate(null);
  };

  // ── Misc helpers ──────────────────────────────────────────
  const formatFecha = (fechaRaw: string) => {
    if (!fechaRaw) return "—";
    try {
      const d = new Date(fechaRaw + "T12:00:00");
      return d.toLocaleDateString("es-CO", {
        timeZone: "America/Bogota",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch { return fechaRaw; }
  };

  const TIPO_COLORS: Record<string, string> = {
    "Inducción":    "bg-blue-500/20 text-blue-300 border-blue-400/30",
    "Capacitación": "bg-purple-500/20 text-purple-300 border-purple-400/30",
    "Charla":       "bg-green-500/20 text-green-300 border-green-400/30",
    "Otro":         "bg-gray-500/20 text-gray-300 border-gray-400/30",
  };

  const exportarExcel = async (registroId: string, nombreEvento: string) => {
    setExportandoId(registroId);
    try {
      const res = await fetch("/api/registros-asistencia/exportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registroRecordId: registroId }),
      });
      if (!res.ok) throw new Error("Error al generar el archivo");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Asistencia_${nombreEvento.replace(/\s+/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setExportandoId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-10">
        <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard/registros-asistencia")}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 backdrop-blur-sm">
                  <ClipboardList className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Historial de Registros</h1>
                  <p className="text-xs text-white/60">Capacitaciones, charlas e inducciones</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Tab switcher */}
              <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
                <button
                  onClick={() => setActiveTab("lista")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "lista"
                      ? "bg-white/20 text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  <List size={15} />
                  <span className="hidden sm:inline">Lista</span>
                </button>
                <button
                  onClick={() => setActiveTab("calendario")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "calendario"
                      ? "bg-white/20 text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  <CalendarDays size={15} />
                  <span className="hidden sm:inline">Calendario</span>
                </button>
              </div>

              <button
                onClick={() => router.push("/dashboard/registros-asistencia/nuevo")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/25 hover:bg-purple-500/35 text-white border border-purple-400/35 transition-all"
              >
                <PlusCircle size={18} />
                <span className="hidden sm:inline">Nuevo Registro</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── LISTA TAB ─────────────────────────────────── */}
        {activeTab === "lista" && (
          <>
            {error && (
              <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/20 border border-red-500/30 text-white">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p>{error}</p>
              </div>
            )}

            {loading ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
              </div>
            ) : registros.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-16 text-center">
                <ClipboardList className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <p className="text-white/60 text-lg">No hay registros de asistencia aún</p>
                <button
                  onClick={() => router.push("/dashboard/registros-asistencia/nuevo")}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-purple-500/25 border border-purple-400/35 text-white font-medium hover:bg-purple-500/35 transition-all"
                >
                  Crear el primero
                </button>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <p className="text-white/60 text-sm">{registros.length} registro{registros.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="bg-purple-500/20 border-b border-white/10">
                        <th className="text-left text-xs font-semibold text-white/80 px-4 py-3">Evento</th>
                        <th className="text-left text-xs font-semibold text-white/80 px-4 py-3 w-28">Fecha</th>
                        <th className="text-left text-xs font-semibold text-white/80 px-4 py-3 w-28">Tipo</th>
                        <th className="text-left text-xs font-semibold text-white/80 px-4 py-3 w-28">Área</th>
                        <th className="text-center text-xs font-semibold text-white/80 px-4 py-3 w-24">Asistentes</th>
                        <th className="text-center text-xs font-semibold text-white/80 px-4 py-3 w-28">Estado</th>
                        <th className="text-center text-xs font-semibold text-white/80 px-4 py-3 w-24">Exportar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registros.map((reg, idx) => (
                        <tr
                          key={reg.id}
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 1 ? "bg-white/[0.02]" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-white">{reg.nombreEvento || "—"}</p>
                            {reg.ciudad && <p className="text-xs text-white/50 mt-0.5">{reg.ciudad}</p>}
                            {reg.nombreConferencista && (
                              <p className="text-xs text-purple-300/70 mt-0.5">Conf: {reg.nombreConferencista}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/70">{formatFecha(reg.fecha)}</td>
                          <td className="px-4 py-3">
                            {reg.tipo ? (
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${TIPO_COLORS[reg.tipo] || TIPO_COLORS["Otro"]}`}>
                                {reg.tipo}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/70">{reg.area || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-lg font-bold text-sirius-cielo">{reg.cantidadAsistentes}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {reg.estado === "Completado" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300 border border-green-400/30">
                                <CheckCircle className="w-3 h-3" />Completado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                                <Clock className="w-3 h-3" />Borrador
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => exportarExcel(reg.id, reg.nombreEvento)}
                              disabled={exportandoId === reg.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sirius-verde/20 border border-sirius-verde/30 text-white text-xs font-medium hover:bg-sirius-verde/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                              {exportandoId === reg.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <FileDown className="w-3 h-3" />
                              )}
                              Excel
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CALENDARIO TAB ────────────────────────────── */}
        {activeTab === "calendario" && (
          <>
            {errorCal && (
              <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/20 border border-red-500/30 text-white">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p>{errorCal}</p>
              </div>
            )}

            {loadingCal ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Calendar card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <button
                      onClick={prevMonth}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="text-center">
                      <h2 className="text-lg font-bold text-white">
                        {MESES[currentMonth]} {currentYear}
                      </h2>
                      <p className="text-xs text-white/50">
                        {programacion.filter((p) => p.fechaEjecucion?.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`)).length} capacitaciones este mes
                      </p>
                    </div>
                    <button
                      onClick={nextMonth}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-5 px-6 py-2.5 border-b border-white/5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      <span className="text-white/60">Ejecutada</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-white/60">Programada</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
                      <span className="text-white/60">Sin ejecutar</span>
                    </div>
                  </div>

                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 border-b border-white/10">
                    {DIAS_SEMANA.map((d) => (
                      <div key={d} className="py-2 text-center text-xs font-semibold text-white/50">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} className="border-r border-b border-white/5 min-h-[80px]" />;
                      }
                      const dateKey = formatDateKey(day);
                      const events = eventsByDate.get(dateKey) ?? [];
                      const isToday = dateKey === today;
                      const isSelected = dateKey === selectedDate;

                      return (
                        <button
                          key={dateKey}
                          onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                          className={`border-r border-b border-white/5 min-h-[80px] p-1.5 text-left transition-all relative ${
                            isSelected
                              ? "bg-purple-500/25 border-purple-500/30"
                              : events.length > 0
                              ? "hover:bg-white/10 cursor-pointer"
                              : "hover:bg-white/5 cursor-default"
                          }`}
                        >
                          {/* Day number */}
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1 ${
                              isToday
                                ? "bg-purple-500 text-white"
                                : "text-white/70"
                            }`}
                          >
                            {day}
                          </span>

                          {/* Event dots / chips */}
                          <div className="flex flex-col gap-0.5">
                            {events.slice(0, 3).map((ev) => (
                              <span
                                key={ev.id}
                                className={`w-full text-[10px] leading-tight px-1 py-0.5 rounded truncate font-medium ${
                                  ev.ejecutado
                                    ? "bg-green-500/25 text-green-300"
                                    : ev.programado
                                    ? "bg-amber-500/25 text-amber-300"
                                    : "bg-white/10 text-white/50"
                                }`}
                              >
                                {ev.identificador}
                              </span>
                            ))}
                            {events.length > 3 && (
                              <span className="text-[10px] text-white/40 px-1">
                                +{events.length - 3} más
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected day detail */}
                {selectedDate && (eventsByDate.get(selectedDate)?.length ?? 0) > 0 && (
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                      <CalendarDays className="w-4 h-4 text-purple-300" />
                      <h3 className="font-semibold text-white">{formatFecha(selectedDate)}</h3>
                      <span className="text-white/40 text-sm">
                        {eventsByDate.get(selectedDate)!.length} capacitación{eventsByDate.get(selectedDate)!.length !== 1 ? "es" : ""}
                      </span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {eventsByDate.get(selectedDate)!.map((ev) => (
                        <div key={ev.id} className="px-6 py-4 flex items-start gap-4">
                          <div
                            className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              ev.ejecutado ? "bg-green-400" : ev.programado ? "bg-amber-400" : "bg-white/30"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{ev.identificador}</p>
                            <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{ev.capacitacionNombre || "—"}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-white/40">{ev.mes} · {ev.trimestre}</span>
                              {ev.totalAsistentes > 0 && (
                                <span className="flex items-center gap-1 text-xs text-sirius-cielo">
                                  <Users size={10} />
                                  {ev.totalAsistentes} asistentes
                                </span>
                              )}
                              <span
                                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                  ev.ejecutado
                                    ? "bg-green-500/20 text-green-300"
                                    : ev.programado
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-white/10 text-white/50"
                                }`}
                              >
                                {ev.ejecutado ? "Ejecutada" : ev.programado ? "Programada" : "Sin estado"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Programadas sin fecha */}
                {sinFecha.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <h3 className="font-semibold text-white">Programadas sin fecha asignada</h3>
                      <span className="text-white/40 text-sm">{sinFecha.length}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {sinFecha.map((ev) => (
                        <div key={ev.id} className="px-6 py-3 flex items-center gap-4">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{ev.identificador}</p>
                            <p className="text-xs text-white/50 truncate">{ev.capacitacionNombre || "—"}</p>
                          </div>
                          <span className="text-xs text-white/40 whitespace-nowrap">{ev.mes} · {ev.trimestre}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
