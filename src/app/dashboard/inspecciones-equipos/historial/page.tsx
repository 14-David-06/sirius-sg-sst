"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  Loader2,
  Search,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Flame,
  MapPin,
} from "lucide-react";

// ══════════════════════════════════════════════════════════
// Tipos
// ══════════════════════════════════════════════════════════
interface InspeccionResumen {
  id: string;
  idInspeccion: string;
  fecha: string;
  inspector: string;
  estado: string;
  observaciones: string;
}

interface DetalleEquipo {
  id: string;
  idDetalle: string;
  categoria: string;
  area: string;
  estadoGeneral: string | null;
  senalizacion: string | null;
  accesibilidad: string | null;
  presionManometro: string | null;
  manguera: string | null;
  pinSeguridad: string | null;
  soporteBase: string | null;
  completitudElementos: string | null;
  estadoContenedor: string | null;
  estructura: string | null;
  correasArnes: string | null;
  fechaVencimiento: string | null;
  observaciones: string;
  equipoNombre: string;
  equipoCodigo: string;
}

// Estilos para estados
const estadoStyles: Record<
  string,
  { IconComp: typeof CheckCircle; color: string; bg: string; border: string }
> = {
  Completada: {
    IconComp: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/15",
    border: "border-green-400/25",
  },
  Pendiente: {
    IconComp: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-400/25",
  },
};

const defaultEstadoStyle = {
  IconComp: Clock,
  color: "text-white/50",
  bg: "bg-white/10",
  border: "border-white/15",
};

const CONDICION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Bueno: { bg: "bg-green-500/20", text: "text-green-400", label: "Bueno" },
  Malo:  { bg: "bg-red-500/20",   text: "text-red-400",   label: "Malo" },
  NA:    { bg: "bg-white/10",     text: "text-white/50",  label: "N/A" },
};

const CATEGORIA_CONFIG: Record<string, { color: string; bgColor: string; icon: string }> = {
  Extintor:        { color: "text-red-400",    bgColor: "bg-red-500/20",    icon: "🧯" },
  Botiquín:        { color: "text-green-400",  bgColor: "bg-green-500/20",  icon: "🩹" },
  Camilla:         { color: "text-blue-400",   bgColor: "bg-blue-500/20",   icon: "🛏️" },
  "Kit Derrames":  { color: "text-yellow-400", bgColor: "bg-yellow-500/20", icon: "⚠️" },
};

// Helpers
const COLOMBIA_TZ = "America/Bogota";

function formatFecha(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    const dateStr = iso.includes("T") ? iso : iso + "T12:00:00";
    return new Date(dateStr).toLocaleDateString("es-CO", {
      timeZone: COLOMBIA_TZ,
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function getCriteriosVisibles(categoria: string) {
  const criterios: { key: string; label: string }[] = [
    { key: "estadoGeneral", label: "Estado General" },
    { key: "senalizacion", label: "Señalización" },
    { key: "accesibilidad", label: "Accesibilidad" },
  ];

  switch (categoria) {
    case "Extintor":
      criterios.push(
        { key: "presionManometro", label: "Presión" },
        { key: "manguera", label: "Manguera" },
        { key: "pinSeguridad", label: "Pin Seg." },
        { key: "soporteBase", label: "Soporte" }
      );
      break;
    case "Botiquín":
    case "Kit Derrames":
      criterios.push(
        { key: "completitudElementos", label: "Completitud" },
        { key: "estadoContenedor", label: "Contenedor" }
      );
      break;
    case "Camilla":
      criterios.push(
        { key: "estructura", label: "Estructura" },
        { key: "correasArnes", label: "Correas" }
      );
      break;
  }
  return criterios;
}

// ══════════════════════════════════════════════════════════
// Componente Principal
// ══════════════════════════════════════════════════════════
export default function HistorialInspeccionesEquiposPage() {
  const router = useRouter();
  const [inspecciones, setInspecciones] = useState<InspeccionResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");

  // Expansión y detalle
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detallesCargados, setDetallesCargados] = useState<Record<string, DetalleEquipo[]>>({});
  const [loadingDetalle, setLoadingDetalle] = useState<string | null>(null);

  // Fetch inspecciones
  const fetchInspecciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inspecciones-equipos");
      const json = await res.json();
      if (json.success) {
        setInspecciones(json.data || []);
      } else {
        setError(json.message || "Error al cargar inspecciones");
      }
    } catch {
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspecciones();
  }, [fetchInspecciones]);

  // Cargar detalle al expandir
  async function loadDetalle(inspeccionId: string) {
    if (detallesCargados[inspeccionId]) return;

    setLoadingDetalle(inspeccionId);
    try {
      const res = await fetch(`/api/inspecciones-equipos/${inspeccionId}`);
      const json = await res.json();
      if (json.success) {
        setDetallesCargados((prev) => ({
          ...prev,
          [inspeccionId]: json.data?.detalles || [],
        }));
      }
    } catch {
      console.error("Error loading detalle");
    } finally {
      setLoadingDetalle(null);
    }
  }

  // Toggle expansión
  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadDetalle(id);
    }
  }

  // Filtros
  const filtered = inspecciones.filter((insp) => {
    const matchSearch =
      !searchQuery ||
      insp.idInspeccion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insp.inspector?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchEstado = filterEstado === "todos" || insp.estado === filterEstado;

    return matchSearch && matchEstado;
  });

  // Contadores
  const totalCompletadas = inspecciones.filter((i) => i.estado === "Completada").length;

  return (
    <div className="min-h-screen relative">
      {/* Background */}
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

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard/inspecciones-equipos")}
                className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Inspección
              </button>
              <div className="h-8 w-px bg-white/20" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">
                    Historial de Inspecciones
                  </h1>
                  <p className="text-xs text-white/50">Equipos de Emergencia</p>
                </div>
              </div>
            </div>
            <button
              onClick={fetchInspecciones}
              disabled={loading}
              className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-white/50 mb-1">Total Inspecciones</p>
            <p className="text-2xl font-bold text-white">{inspecciones.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <p className="text-xs text-white/50 mb-1">Completadas</p>
            <p className="text-2xl font-bold text-green-400">{totalCompletadas}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-white/50 mb-1">Pendientes</p>
            <p className="text-2xl font-bold text-amber-400">
              {inspecciones.length - totalCompletadas}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID o inspector..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/90 placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/50"
            />
          </div>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/50 appearance-none cursor-pointer"
          >
            <option value="todos" className="bg-slate-800">
              Todos los estados
            </option>
            <option value="Completada" className="bg-slate-800">
              Completadas
            </option>
            <option value="Pendiente" className="bg-slate-800">
              Pendientes
            </option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm flex-1">{error}</p>
            <button
              onClick={fetchInspecciones}
              className="px-3 py-1 rounded-lg bg-white/10 text-xs text-white/80 hover:bg-white/20 transition-all cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
            <Flame className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No se encontraron inspecciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((insp) => {
              const estilo = estadoStyles[insp.estado] || defaultEstadoStyle;
              const { IconComp } = estilo;
              const isExpanded = expandedId === insp.id;
              const detalles = detallesCargados[insp.id];

              return (
                <div
                  key={insp.id}
                  className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
                >
                  {/* Row principal */}
                  <button
                    onClick={() => toggleExpand(insp.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <div className={`w-10 h-10 rounded-lg ${estilo.bg} border ${estilo.border} flex items-center justify-center shrink-0`}>
                      <IconComp className={`w-5 h-5 ${estilo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {insp.idInspeccion || "Sin ID"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${estilo.bg} ${estilo.color} border ${estilo.border}`}>
                          {insp.estado}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatFecha(insp.fecha)}
                        </span>
                        <span>Inspector: {insp.inspector || "—"}</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-white/40 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/40 shrink-0" />
                    )}
                  </button>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="border-t border-white/10">
                      {loadingDetalle === insp.id ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                        </div>
                      ) : !detalles || detalles.length === 0 ? (
                        <div className="p-6 text-center text-white/40 text-sm">
                          No se encontraron detalles para esta inspección
                        </div>
                      ) : (
                        <div className="p-4 space-y-3">
                          {/* Agrupar por área */}
                          {Object.entries(
                            detalles.reduce(
                              (acc, det) => {
                                const area = det.area || "Sin Área";
                                if (!acc[area]) acc[area] = [];
                                acc[area].push(det);
                                return acc;
                              },
                              {} as Record<string, DetalleEquipo[]>
                            )
                          )
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([area, equiposArea]) => (
                              <div
                                key={area}
                                className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
                              >
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/5">
                                  <MapPin className="w-4 h-4 text-white/50" />
                                  <span className="text-sm font-semibold text-white/80">
                                    {area}
                                  </span>
                                  <span className="text-xs text-white/40">
                                    ({equiposArea.length})
                                  </span>
                                </div>

                                <div className="divide-y divide-white/5">
                                  {equiposArea.map((det) => {
                                    const catCfg =
                                      CATEGORIA_CONFIG[det.categoria] || CATEGORIA_CONFIG.Extintor;
                                    const criterios = getCriteriosVisibles(det.categoria);

                                    return (
                                      <div key={det.id} className="px-4 py-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-sm">{catCfg.icon}</span>
                                          <span className="text-sm font-medium text-white">
                                            {det.equipoNombre || det.equipoCodigo || det.idDetalle}
                                          </span>
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${catCfg.bgColor} ${catCfg.color}`}
                                          >
                                            {det.categoria}
                                          </span>
                                          {det.fechaVencimiento && (
                                            <span className="text-[10px] text-white/40">
                                              Vence: {formatFecha(det.fechaVencimiento)}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 mb-1">
                                          {criterios.map((c) => {
                                            const val =
                                              det[c.key as keyof DetalleEquipo] as string | null;
                                            const style = val
                                              ? CONDICION_STYLES[val] || {
                                                  bg: "bg-white/5",
                                                  text: "text-white/30",
                                                  label: val,
                                                }
                                              : {
                                                  bg: "bg-white/5",
                                                  text: "text-white/20",
                                                  label: "—",
                                                };

                                            return (
                                              <span
                                                key={c.key}
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${style.bg}`}
                                                title={c.label}
                                              >
                                                <span className="text-white/40">{c.label}:</span>
                                                <span className={`font-semibold ${style.text}`}>
                                                  {style.label}
                                                </span>
                                              </span>
                                            );
                                          })}
                                        </div>

                                        {det.observaciones && (
                                          <p className="text-[10px] text-white/40 mt-1">
                                            📝 {det.observaciones}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
