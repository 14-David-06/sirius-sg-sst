"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  Loader2,
  Search,
  ClipboardCheck,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  User,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Fingerprint,
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
  cantidadEmpleados: number;
}

interface EmpleadoDetalle {
  id: string;
  idDetalle: string;
  idEmpleado: string;
  nombreEmpleado: string;
  observaciones: string;
  condiciones: Record<string, string | null>;
  firmaHash?: string;
}

interface InspeccionDetalle {
  id: string;
  idInspeccion: string;
  fecha: string;
  inspector: string;
  estado: string;
  empleados: EmpleadoDetalle[];
  totalEmpleados: number;
}

// Categorías de EPP
const CATEGORIAS_EPP = [
  { id: "casco", label: "Casco", short: "Cas" },
  { id: "proteccion_auditiva", label: "P. Auditiva", short: "Aud" },
  { id: "proteccion_visual", label: "P. Visual", short: "Vis" },
  { id: "proteccion_respiratoria", label: "P. Resp.", short: "Res" },
  { id: "ropa_trabajo", label: "Indument.", short: "Ind" },
  { id: "guantes", label: "Guantes", short: "Gua" },
  { id: "botas_seguridad", label: "Botas", short: "Bot" },
  { id: "proteccion_caidas", label: "P. Caídas", short: "Cai" },
  { id: "otros", label: "Otros", short: "Otr" },
];

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

// Colores para condiciones
const CONDICION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  B: { bg: "bg-green-500/20", text: "text-green-400", label: "Bueno" },
  R: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Regular" },
  M: { bg: "bg-red-500/20", text: "text-red-400", label: "Malo" },
  NA: { bg: "bg-white/10", text: "text-white/50", label: "N/A" },
};

// ══════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════
function formatFecha(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ══════════════════════════════════════════════════════════
// Componente Principal
// ══════════════════════════════════════════════════════════
export default function HistorialInspeccionesPage() {
  const router = useRouter();
  const [inspecciones, setInspecciones] = useState<InspeccionResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  
  // Expansión y detalle
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detallesCargados, setDetallesCargados] = useState<Record<string, InspeccionDetalle>>({});
  const [loadingDetalle, setLoadingDetalle] = useState<string | null>(null);

  // Modal firma
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [selectedFirma, setSelectedFirma] = useState<{ hash: string; nombre: string } | null>(null);
  const [firmaDescifrada, setFirmaDescifrada] = useState<string | null>(null);
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptError, setDecryptError] = useState("");

  // Exportar
  const [exporting, setExporting] = useState(false);

  // ── Fetch inspecciones ────────────────────────────────
  const fetchInspecciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inspecciones-epp");
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

  // ── Cargar detalle al expandir ────────────────────────
  async function loadDetalle(inspeccionId: string) {
    if (detallesCargados[inspeccionId]) return;
    
    setLoadingDetalle(inspeccionId);
    try {
      const res = await fetch(`/api/inspecciones-epp/${inspeccionId}`);
      const json = await res.json();
      if (json.success) {
        setDetallesCargados((prev) => ({
          ...prev,
          [inspeccionId]: json.data,
        }));
      }
    } catch {
      console.error("Error loading detalle");
    } finally {
      setLoadingDetalle(null);
    }
  }

  // ── Toggle expansión ──────────────────────────────────
  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadDetalle(id);
    }
  }

  // ── Descifrar firma ───────────────────────────────────
  async function openFirmaModal(hash: string, nombre: string) {
    setSelectedFirma({ hash, nombre });
    setFirmaDescifrada(null);
    setDecryptError("");
    setShowFirmaModal(true);
    setDecryptLoading(true);

    try {
      const res = await fetch("/api/inspecciones-epp/descifrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashFirma: hash }),
      });
      const json = await res.json();
      if (json.success) {
        setFirmaDescifrada(json.firma.signatureDataUrl);
      } else {
        setDecryptError(json.message || "Error al descifrar");
      }
    } catch {
      setDecryptError("Error de conexión");
    } finally {
      setDecryptLoading(false);
    }
  }

  // ── Exportar Excel ────────────────────────────────────
  async function handleExportExcel() {
    setExporting(true);
    try {
      const res = await fetch("/api/inspecciones-epp/exportar");
      if (!res.ok) throw new Error("Error al generar");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+?)"/);
      a.download = match?.[1] || `Inspecciones_EPP_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error al exportar");
    } finally {
      setExporting(false);
    }
  }

  // ── Filtros ───────────────────────────────────────────
  const filtered = inspecciones.filter((insp) => {
    const matchSearch =
      !searchQuery ||
      insp.idInspeccion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insp.inspector?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchEstado = filterEstado === "todos" || insp.estado === filterEstado;

    return matchSearch && matchEstado;
  });

  // ── Contadores ────────────────────────────────────────
  const totalCompletadas = inspecciones.filter((i) => i.estado === "Completada").length;
  const totalEmpleadosInspeccionados = inspecciones.reduce((sum, i) => sum + (i.cantidadEmpleados || 0), 0);

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
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
                onClick={() => router.push("/dashboard/inventario-epp/inspeccion")}
                className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Inspección
              </button>
              <div className="h-8 w-px bg-white/20" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">
                    Historial de Inspecciones
                  </h1>
                  <p className="text-xs text-white/50">
                    {inspecciones.length} inspección{inspecciones.length !== 1 ? "es" : ""} registrada{inspecciones.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                disabled={exporting || loading || inspecciones.length === 0}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/15 border border-green-400/25 text-green-300 text-sm font-semibold hover:bg-green-500/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{exporting ? "Exportando..." : "Excel"}</span>
              </button>
              <button
                onClick={fetchInspecciones}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white/60 text-sm hover:bg-white/20 transition-all cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── KPIs ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-4">
            <p className="text-[11px] text-white/40 mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{inspecciones.length}</p>
          </div>
          <div className="bg-green-500/10 backdrop-blur-xl rounded-xl border border-green-400/20 p-4">
            <p className="text-[11px] text-green-300/60 mb-1">Completadas</p>
            <p className="text-2xl font-bold text-green-400">{totalCompletadas}</p>
          </div>
          <div className="bg-blue-500/10 backdrop-blur-xl rounded-xl border border-blue-400/20 p-4">
            <p className="text-[11px] text-blue-300/60 mb-1">Empleados</p>
            <p className="text-2xl font-bold text-blue-400">{totalEmpleadosInspeccionados}</p>
          </div>
          <div className="bg-purple-500/10 backdrop-blur-xl rounded-xl border border-purple-400/20 p-4">
            <p className="text-[11px] text-purple-300/60 mb-1">Este mes</p>
            <p className="text-2xl font-bold text-purple-400">
              {inspecciones.filter((i) => {
                if (!i.fecha) return false;
                const fecha = new Date(i.fecha);
                const now = new Date();
                return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
        </div>

        {/* ── Leyenda ─────────────────────────────────── */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-3 mb-6">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-white/50 font-medium">Condiciones:</span>
            {Object.entries(CONDICION_STYLES).map(([key, style]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className={`w-6 h-6 rounded ${style.bg} ${style.text} flex items-center justify-center font-bold text-[10px]`}>
                  {key === "NA" ? "N/A" : key}
                </span>
                <span className="text-white/60">{style.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Búsqueda y filtros ──────────────────────── */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Buscar por ID o inspector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-400/50 transition-all"
              />
            </div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm focus:outline-none focus:border-blue-400/50 transition-all cursor-pointer appearance-none"
            >
              <option value="todos" className="bg-gray-900">Todos los estados</option>
              <option value="Completada" className="bg-gray-900">Completada</option>
              <option value="Pendiente" className="bg-gray-900">Pendiente</option>
            </select>
          </div>
        </div>

        {/* ── Loading ─────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}

        {/* ── Error ───────────────────────────────────── */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-400/20 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Error</p>
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={fetchInspecciones}
              className="mt-4 px-4 py-2 rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition-all cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ── Sin resultados ──────────────────────────── */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <ClipboardCheck className="w-12 h-12 text-white/15 mx-auto mb-4" />
            <p className="text-white/40 text-sm">
              {inspecciones.length === 0
                ? "No hay inspecciones registradas"
                : "No se encontraron inspecciones con esos filtros"}
            </p>
          </div>
        )}

        {/* ── Lista de inspecciones ───────────────────── */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((insp) => {
              const est = estadoStyles[insp.estado] || defaultEstadoStyle;
              const isExpanded = expandedId === insp.id;
              const detalle = detallesCargados[insp.id];
              const isLoadingDetalle = loadingDetalle === insp.id;

              return (
                <div
                  key={insp.id}
                  className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 overflow-hidden transition-all"
                >
                  {/* Cabecera */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-all"
                    onClick={() => toggleExpand(insp.id)}
                  >
                    {/* Estado badge */}
                    <div
                      className={`w-9 h-9 rounded-lg ${est.bg} border ${est.border} flex items-center justify-center ${est.color} shrink-0`}
                    >
                      <est.IconComp className="w-4 h-4" />
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-white truncate">
                          {insp.idInspeccion || insp.id.slice(0, 10)}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${est.bg} ${est.color} border ${est.border}`}
                        >
                          {insp.estado || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-white/40">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatFecha(insp.fecha)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {insp.inspector || "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {insp.cantidadEmpleados || 0} empleado{(insp.cantidadEmpleados || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Botón expandir */}
                    <div className={`p-1.5 rounded-lg ${isExpanded ? "bg-blue-500/20" : "bg-white/10"} transition-all`}>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-blue-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-white/40" />
                      )}
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="border-t border-white/10">
                      {isLoadingDetalle ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                        </div>
                      ) : detalle ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-white/5">
                              <tr>
                                <th className="text-left px-3 py-2 text-white/60 font-medium">Empleado</th>
                                {CATEGORIAS_EPP.map((cat) => (
                                  <th key={cat.id} className="text-center px-1 py-2 text-white/60 font-medium">
                                    <span className="hidden sm:inline">{cat.short}</span>
                                    <span className="sm:hidden">{cat.short.charAt(0)}</span>
                                  </th>
                                ))}
                                <th className="text-center px-2 py-2 text-white/60 font-medium">Firma</th>
                                <th className="text-left px-3 py-2 text-white/60 font-medium">Obs.</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {detalle.empleados.map((emp) => (
                                <tr key={emp.id} className="hover:bg-white/5">
                                  <td className="px-3 py-2">
                                    <div className="text-white font-medium text-xs">{emp.nombreEmpleado}</div>
                                    <div className="text-white/40 text-[10px]">{emp.idEmpleado}</div>
                                  </td>
                                  {CATEGORIAS_EPP.map((cat) => {
                                    const cond = emp.condiciones[cat.id];
                                    const style = cond ? CONDICION_STYLES[cond] : null;
                                    return (
                                      <td key={cat.id} className="text-center px-1 py-2">
                                        {cond ? (
                                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${style?.bg} ${style?.text} font-bold text-[9px]`}>
                                            {cond === "NA" ? "N/A" : cond}
                                          </span>
                                        ) : (
                                          <span className="text-white/20 text-[10px]">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="text-center px-2 py-2">
                                    {emp.firmaHash ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openFirmaModal(emp.firmaHash!, emp.nombreEmpleado);
                                        }}
                                        className="p-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all cursor-pointer"
                                        title="Ver firma"
                                      >
                                        <Fingerprint className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-white/20 text-[10px]">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-white/50 max-w-[120px] truncate text-[10px]">
                                    {emp.observaciones || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-white/40 text-sm">
                          Error al cargar detalles
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

      {/* ═══════════════════════════════════════════════════
          Modal de Firma
      ════════════════════════════════════════════════════ */}
      {showFirmaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFirmaModal(false)}
          />
          <div className="relative bg-sirius-imperial/95 backdrop-blur-xl rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <button
              onClick={() => setShowFirmaModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Firma Digital</h3>
                <p className="text-white/50 text-sm">{selectedFirma?.nombre}</p>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl border border-white/15 p-4 min-h-[200px] flex items-center justify-center">
              {decryptLoading ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                  <p className="text-white/50 text-sm">Descifrando firma AES-256...</p>
                </div>
              ) : decryptError ? (
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-red-300 text-sm">{decryptError}</p>
                </div>
              ) : firmaDescifrada ? (
                <div className="text-center">
                  <Image
                    src={firmaDescifrada}
                    alt="Firma digital"
                    width={300}
                    height={150}
                    className="mx-auto rounded-lg"
                  />
                  <p className="text-green-400 text-xs mt-3 flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Firma descifrada con AES-256-CBC
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
