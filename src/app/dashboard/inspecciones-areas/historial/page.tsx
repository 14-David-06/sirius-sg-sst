"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  Loader2,
  Search,
  MapPin,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Fingerprint,
  FileDown,
  PenTool,
  Eraser,
  X,
  Check,
  IdCard,
  ShieldCheck,
  ClipboardList,
  AlertCircle,
} from "lucide-react";

// ══════════════════════════════════════════════════════════
// Tipos
// ══════════════════════════════════════════════════════════
interface InspeccionResumen {
  id: string;
  idInspeccion: string;
  fecha: string;
  inspector: string;
  area: string;
  estado: string;
  observaciones: string;
  cantidadCriterios: number;
  cantidadAcciones: number;
}

interface CriterioDetalle {
  id: string;
  categoria: string;
  criterio: string;
  condicion: string;
  observacion: string;
}

interface AccionCorrectivaDetalle {
  id: string;
  descripcion: string;
  tipo: string;
  responsable: string;
  fechaPropuesta: string;
  estado: string;
}

interface ResponsableDetalle {
  id: string;
  tipo: string;
  nombre: string;
  cedula: string;
  cargo: string;
  firmaHash?: string;
  fechaFirma: string;
}

interface InspeccionDetalle {
  id: string;
  idInspeccion: string;
  fecha: string;
  inspector: string;
  area: string;
  estado: string;
  observaciones: string;
  criterios: CriterioDetalle[];
  acciones: AccionCorrectivaDetalle[];
  responsables: ResponsableDetalle[];
}

interface PersonaValidada {
  id: string;
  idEmpleado: string;
  nombreCompleto: string;
  numeroDocumento: string;
  tipoPersonal: string;
  rol: string;
  fotoPerfil: { url: string; filename: string } | null;
}

type ExportStep = "idle" | "validating-responsable" | "signing-responsable" | "validating-copasst" | "signing-copasst" | "generating";

// Áreas configuradas (sin Guaicaramo)
const AREAS = ["Todas", "Laboratorio", "Pirólisis", "Bodega", "Administrativa"];
const ESTADOS = ["Todos", "Borrador", "Completado"];

// Colores para áreas
const AREA_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Laboratorio: { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-400/25" },
  Pirólisis: { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-400/25" },
  Bodega: { bg: "bg-yellow-500/15", text: "text-yellow-300", border: "border-yellow-400/25" },
  Administrativa: { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-400/25" },
};

// Estilos para estados
const estadoStyles: Record<string, { IconComp: typeof CheckCircle; color: string; bg: string; border: string }> = {
  Completado: {
    IconComp: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/15",
    border: "border-green-400/25",
  },
  Borrador: {
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

// Colores para condiciones de criterios
const CONDICION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Bueno: { bg: "bg-green-500/20", text: "text-green-400", label: "Bueno" },
  Malo: { bg: "bg-red-500/20", text: "text-red-400", label: "Malo" },
  NA: { bg: "bg-white/10", text: "text-white/50", label: "N/A" },
};

// ══════════════════════════════════════════════════════════
// Helpers - Timezone Colombia
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// Componente Principal
// ══════════════════════════════════════════════════════════
export default function HistorialInspeccionesAreasPage() {
  const router = useRouter();
  const [inspecciones, setInspecciones] = useState<InspeccionResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState<string>("Todas");
  const [filterEstado, setFilterEstado] = useState<string>("Todos");

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

  // Exportar Excel general
  const [exporting, setExporting] = useState(false);

  // Modal exportar individual con firmas
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportInspeccionId, setExportInspeccionId] = useState<string | null>(null);
  const [exportInspeccionInfo, setExportInspeccionInfo] = useState<{ id: string; idInspeccion: string; fecha: string; area: string } | null>(null);
  const [exportStep, setExportStep] = useState<ExportStep>("idle");
  const [exportError, setExportError] = useState<string | null>(null);

  // Validación cédula responsable
  const [cedulaResponsable, setCedulaResponsable] = useState("");
  const [responsableValidado, setResponsableValidado] = useState<PersonaValidada | null>(null);
  const [firmaResponsable, setFirmaResponsable] = useState<string | null>(null);

  // Validación cédula COPASST
  const [cedulaCopasst, setCedulaCopasst] = useState("");
  const [copasstValidado, setCopasstValidado] = useState<PersonaValidada | null>(null);
  const [firmaCopasst, setFirmaCopasst] = useState<string | null>(null);

  // ── Fetch inspecciones ────────────────────────────────
  const fetchInspecciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterArea !== "Todas") params.set("area", filterArea);
      if (filterEstado !== "Todos") params.set("estado", filterEstado);

      const res = await fetch(`/api/inspecciones-areas?${params.toString()}`);
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
  }, [filterArea, filterEstado]);

  useEffect(() => {
    fetchInspecciones();
  }, [fetchInspecciones]);

  // ── Cargar detalle al expandir ────────────────────────
  async function loadDetalle(idInspeccion: string) {
    if (detallesCargados[idInspeccion]) return;

    setLoadingDetalle(idInspeccion);
    try {
      const res = await fetch(`/api/inspecciones-areas/${idInspeccion}`);
      const json = await res.json();
      if (json.success) {
        setDetallesCargados((prev) => ({
          ...prev,
          [idInspeccion]: json.data,
        }));
      }
    } catch {
      console.error("Error loading detalle");
    } finally {
      setLoadingDetalle(null);
    }
  }

  // ── Toggle expansión ──────────────────────────────────
  function toggleExpand(idInspeccion: string) {
    if (expandedId === idInspeccion) {
      setExpandedId(null);
    } else {
      setExpandedId(idInspeccion);
      loadDetalle(idInspeccion);
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
      const res = await fetch("/api/inspecciones-areas/descifrar", {
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

  // ── Exportar Excel general ────────────────────────────
  async function handleExportExcel() {
    setExporting(true);
    try {
      const res = await fetch("/api/inspecciones-areas/exportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: filterArea, estado: filterEstado }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`Exportación: ${json.data?.total || 0} registros. Funcionalidad completa próximamente.`);
      } else {
        alert("Error al exportar");
      }
    } catch (err) {
      console.error(err);
      alert("Error al exportar");
    } finally {
      setExporting(false);
    }
  }

  // ── Abrir modal exportar individual ───────────────────
  function openExportModal(insp: InspeccionResumen) {
    setExportInspeccionId(insp.id);
    setExportInspeccionInfo({ id: insp.id, idInspeccion: insp.idInspeccion, fecha: insp.fecha, area: insp.area });
    setShowExportModal(true);
    setExportStep("idle");
    setExportError(null);
    setCedulaResponsable("");
    setResponsableValidado(null);
    setFirmaResponsable(null);
    setCedulaCopasst("");
    setCopasstValidado(null);
    setFirmaCopasst(null);
  }

  function closeExportModal() {
    setShowExportModal(false);
    setExportInspeccionId(null);
    setExportInspeccionInfo(null);
    setExportStep("idle");
    setExportError(null);
  }

  // ── Validar cédula responsable ────────────────────────
  async function validarResponsable() {
    if (!cedulaResponsable.trim()) {
      setExportError("Ingrese el número de cédula");
      return;
    }
    setExportStep("validating-responsable");
    setExportError(null);

    try {
      const res = await fetch("/api/personal/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento: cedulaResponsable }),
      });
      const json = await res.json();
      if (json.success) {
        setResponsableValidado(json.data);
        setExportStep("signing-responsable");
      } else {
        setExportError(json.message || "No se encontró el empleado");
        setExportStep("idle");
      }
    } catch {
      setExportError("Error de conexión");
      setExportStep("idle");
    }
  }

  // ── Validar cédula COPASST ────────────────────────────
  async function validarCopasst() {
    if (!cedulaCopasst.trim()) {
      setExportError("Ingrese el número de cédula");
      return;
    }
    setExportStep("validating-copasst");
    setExportError(null);

    try {
      const res = await fetch("/api/personal/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento: cedulaCopasst }),
      });
      const json = await res.json();
      if (json.success) {
        setCopasstValidado(json.data);
        setExportStep("signing-copasst");
      } else {
        setExportError(json.message || "No se encontró el empleado");
        setExportStep("idle");
      }
    } catch {
      setExportError("Error de conexión");
      setExportStep("idle");
    }
  }

  // ── Confirmar firma responsable ───────────────────────
  function confirmarFirmaResponsable(dataUrl: string) {
    setFirmaResponsable(dataUrl);
    setExportStep("idle");
  }

  // ── Confirmar firma COPASST y generar ─────────────────
  async function confirmarFirmaCopasst(dataUrl: string) {
    setFirmaCopasst(dataUrl);
    setExportStep("generating");

    try {
      const fechaHora = new Date().toLocaleString("es-CO", { timeZone: COLOMBIA_TZ });

      const payload = {
        inspeccionId: exportInspeccionId,
        firmaResponsable: {
          documento: responsableValidado!.numeroDocumento,
          nombre: responsableValidado!.nombreCompleto,
          cargo: responsableValidado!.rol || "Responsable de Inspección",
          firma: firmaResponsable,
          fechaHora,
        },
        firmaCopasst: {
          documento: copasstValidado!.numeroDocumento,
          nombre: copasstValidado!.nombreCompleto,
          cargo: copasstValidado!.rol || "Representante COPASST",
          firma: dataUrl,
          fechaHora,
        },
      };

      const res = await fetch(`/api/inspecciones-areas/exportar/${exportInspeccionInfo?.idInspeccion}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Error al generar");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+?)"/);
      a.download = match?.[1] || `Inspeccion_Area_${exportInspeccionInfo?.idInspeccion || "sin-id"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      closeExportModal();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Error al generar");
      setExportStep("idle");
    }
  }

  // ── Filtros de búsqueda ───────────────────────────────
  const filtered = inspecciones.filter((insp) => {
    const matchSearch =
      !searchQuery ||
      insp.idInspeccion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insp.inspector?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insp.area?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchSearch;
  });

  // ── Contadores para KPIs ──────────────────────────────
  const totalCompletadas = inspecciones.filter((i) => i.estado === "Completado").length;
  const totalConAcciones = inspecciones.filter((i) => i.cantidadAcciones > 0).length;
  const totalCriterios = inspecciones.reduce((sum, i) => sum + (i.cantidadCriterios || 0), 0);
  const estesMes = inspecciones.filter((i) => {
    if (!i.fecha) return false;
    const fechaStr = i.fecha.includes("T") ? i.fecha : i.fecha + "T12:00:00";
    const fecha = new Date(fechaStr);
    const nowColombia = new Date(new Date().toLocaleString("en-US", { timeZone: COLOMBIA_TZ }));
    return fecha.getMonth() === nowColombia.getMonth() && fecha.getFullYear() === nowColombia.getFullYear();
  }).length;

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
                onClick={() => router.push("/dashboard/inspecciones-areas")}
                className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Inspección
              </button>
              <div className="h-8 w-px bg-white/20" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Historial de Inspecciones</h1>
                  <p className="text-xs text-white/50">
                    {inspecciones.length} inspección{inspecciones.length !== 1 ? "es" : ""} de áreas
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
          <div className="bg-orange-500/10 backdrop-blur-xl rounded-xl border border-orange-400/20 p-4">
            <p className="text-[11px] text-orange-300/60 mb-1">Con Acciones</p>
            <p className="text-2xl font-bold text-orange-400">{totalConAcciones}</p>
          </div>
          <div className="bg-purple-500/10 backdrop-blur-xl rounded-xl border border-purple-400/20 p-4">
            <p className="text-[11px] text-purple-300/60 mb-1">Este mes</p>
            <p className="text-2xl font-bold text-purple-400">{estesMes}</p>
          </div>
        </div>

        {/* ── Leyenda de condiciones ──────────────────── */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-3 mb-6">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-white/50 font-medium">Condiciones:</span>
            {Object.entries(CONDICION_STYLES).map(([key, style]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className={`px-2 py-1 rounded ${style.bg} ${style.text} font-semibold text-[10px]`}>
                  {key}
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
                placeholder="Buscar por ID, inspector o área..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-400/50 transition-all"
              />
            </div>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm focus:outline-none focus:border-blue-400/50 transition-all cursor-pointer appearance-none"
            >
              {AREAS.map((a) => (
                <option key={a} value={a} className="bg-gray-900">
                  {a === "Todas" ? "Todas las áreas" : a}
                </option>
              ))}
            </select>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm focus:outline-none focus:border-blue-400/50 transition-all cursor-pointer appearance-none"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e} className="bg-gray-900">
                  {e === "Todos" ? "Todos los estados" : e}
                </option>
              ))}
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
            <MapPin className="w-12 h-12 text-white/15 mx-auto mb-4" />
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
              const areaStyle = AREA_STYLES[insp.area] || { bg: "bg-white/10", text: "text-white/60", border: "border-white/20" };
              const isExpanded = expandedId === insp.idInspeccion;
              const detalle = detallesCargados[insp.idInspeccion];
              const isLoadingDetalle = loadingDetalle === insp.idInspeccion;

              return (
                <div
                  key={insp.id}
                  className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 overflow-hidden transition-all"
                >
                  {/* Cabecera */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-all"
                    onClick={() => toggleExpand(insp.idInspeccion)}
                  >
                    {/* Badge área */}
                    <div className={`w-9 h-9 rounded-lg ${areaStyle.bg} border ${areaStyle.border} flex items-center justify-center ${areaStyle.text} shrink-0`}>
                      <MapPin className="w-4 h-4" />
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">
                          {insp.idInspeccion || insp.id.slice(0, 10)}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${areaStyle.bg} ${areaStyle.text} border ${areaStyle.border}`}>
                          {insp.area}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${est.bg} ${est.color} border ${est.border}`}>
                          {insp.estado || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-white/40 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatFecha(insp.fecha)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {insp.inspector || "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClipboardList className="w-3 h-3" />
                          {insp.cantidadCriterios || 0} criterios
                        </span>
                        {insp.cantidadAcciones > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-medium">
                            {insp.cantidadAcciones} acción{insp.cantidadAcciones !== 1 ? "es" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openExportModal(insp);
                        }}
                        className="p-1.5 rounded-lg bg-green-500/15 border border-green-400/25 text-green-400 hover:bg-green-500/25 transition-all"
                        title="Exportar Excel"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                      <div className={`p-1.5 rounded-lg ${isExpanded ? "bg-blue-500/20" : "bg-white/10"} transition-all`}>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-blue-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-white/40" />
                        )}
                      </div>
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
                        <div className="p-4 space-y-4">
                          {/* Observaciones generales */}
                          {detalle.observaciones && (
                            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                              <p className="text-[10px] text-white/40 mb-1">Observaciones generales</p>
                              <p className="text-white/70 text-sm">{detalle.observaciones}</p>
                            </div>
                          )}

                          {/* Criterios evaluados */}
                          {detalle.criterios && detalle.criterios.length > 0 && (
                            <div>
                              <p className="text-xs text-white/50 font-medium mb-2">Criterios evaluados ({detalle.criterios.length})</p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-white/5">
                                    <tr>
                                      <th className="text-left px-3 py-2 text-white/60 font-medium">Categoría</th>
                                      <th className="text-left px-3 py-2 text-white/60 font-medium">Criterio</th>
                                      <th className="text-center px-2 py-2 text-white/60 font-medium">Condición</th>
                                      <th className="text-left px-3 py-2 text-white/60 font-medium">Obs.</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {detalle.criterios.map((crit) => {
                                      const condStyle = CONDICION_STYLES[crit.condicion] || { bg: "bg-white/10", text: "text-white/50" };
                                      return (
                                        <tr key={crit.id} className="hover:bg-white/5">
                                          <td className="px-3 py-2 text-white/50 text-[10px]">{crit.categoria}</td>
                                          <td className="px-3 py-2 text-white/80 max-w-[200px]">{crit.criterio}</td>
                                          <td className="px-2 py-2 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded ${condStyle.bg} ${condStyle.text} font-semibold text-[10px]`}>
                                              {crit.condicion}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-white/50 max-w-[120px] truncate text-[10px]">
                                            {crit.observacion || "—"}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Acciones correctivas */}
                          {detalle.acciones && detalle.acciones.length > 0 && (
                            <div>
                              <p className="text-xs text-white/50 font-medium mb-2">Acciones correctivas ({detalle.acciones.length})</p>
                              <div className="space-y-2">
                                {detalle.acciones.map((acc) => (
                                  <div key={acc.id} className="p-3 rounded-lg bg-orange-500/10 border border-orange-400/20">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="text-white/80 text-sm">{acc.descripcion}</p>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] text-white/40">
                                          <span className="px-1.5 py-0.5 rounded bg-white/10">{acc.tipo}</span>
                                          <span>Responsable: {acc.responsable}</span>
                                          <span>Fecha propuesta: {formatFecha(acc.fechaPropuesta)}</span>
                                        </div>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                        acc.estado === "Cerrada" ? "bg-green-500/20 text-green-300" :
                                        acc.estado === "En Proceso" ? "bg-yellow-500/20 text-yellow-300" :
                                        "bg-red-500/20 text-red-300"
                                      }`}>
                                        {acc.estado}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Responsables / Firmas */}
                          {detalle.responsables && detalle.responsables.length > 0 && (
                            <div>
                              <p className="text-xs text-white/50 font-medium mb-2">Firmas de responsables ({detalle.responsables.length})</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {detalle.responsables.map((resp) => (
                                  <div key={resp.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                                    <p className="text-[10px] text-white/40 mb-1">{resp.tipo}</p>
                                    <p className="text-white font-medium text-sm">{resp.nombre}</p>
                                    <p className="text-white/50 text-[10px]">{resp.cargo}</p>
                                    {resp.firmaHash ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openFirmaModal(resp.firmaHash!, resp.nombre);
                                        }}
                                        className="mt-2 flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-medium hover:bg-blue-500/30 transition-all cursor-pointer"
                                      >
                                        <Fingerprint className="w-3 h-3" />
                                        Ver firma
                                      </button>
                                    ) : (
                                      <p className="mt-2 text-white/30 text-[10px]">Sin firma</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
          <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <button
              onClick={() => setShowFirmaModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
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

      {/* ═══════════════════════════════════════════════════
          Modal de Exportar con Firmas de Confirmación
      ════════════════════════════════════════════════════ */}
      {showExportModal && (
        <ExportConfirmationModal
          inspeccionInfo={exportInspeccionInfo}
          step={exportStep}
          error={exportError}
          // Responsable
          cedulaResponsable={cedulaResponsable}
          setCedulaResponsable={setCedulaResponsable}
          responsableValidado={responsableValidado}
          firmaResponsable={firmaResponsable}
          onValidarResponsable={validarResponsable}
          onConfirmarFirmaResponsable={confirmarFirmaResponsable}
          // COPASST
          cedulaCopasst={cedulaCopasst}
          setCedulaCopasst={setCedulaCopasst}
          copasstValidado={copasstValidado}
          firmaCopasst={firmaCopasst}
          onValidarCopasst={validarCopasst}
          onConfirmarFirmaCopasst={confirmarFirmaCopasst}
          // Acciones
          onClose={closeExportModal}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Componente Modal de Exportación con Confirmación
// ══════════════════════════════════════════════════════════
function ExportConfirmationModal({
  inspeccionInfo,
  step,
  error,
  cedulaResponsable,
  setCedulaResponsable,
  responsableValidado,
  firmaResponsable,
  onValidarResponsable,
  onConfirmarFirmaResponsable,
  cedulaCopasst,
  setCedulaCopasst,
  copasstValidado,
  firmaCopasst,
  onValidarCopasst,
  onConfirmarFirmaCopasst,
  onClose,
}: {
  inspeccionInfo: { id: string; idInspeccion: string; fecha: string; area: string } | null;
  step: ExportStep;
  error: string | null;
  cedulaResponsable: string;
  setCedulaResponsable: (v: string) => void;
  responsableValidado: PersonaValidada | null;
  firmaResponsable: string | null;
  onValidarResponsable: () => void;
  onConfirmarFirmaResponsable: (dataUrl: string) => void;
  cedulaCopasst: string;
  setCedulaCopasst: (v: string) => void;
  copasstValidado: PersonaValidada | null;
  firmaCopasst: string | null;
  onValidarCopasst: () => void;
  onConfirmarFirmaCopasst: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const showSigningResponsable = step === "signing-responsable";
  const showSigningCopasst = step === "signing-copasst";
  const isValidating = step === "validating-responsable" || step === "validating-copasst";
  const isGenerating = step === "generating";

  const currentPhase = !responsableValidado || !firmaResponsable ? 1 : 2;
  const areaStyle = AREA_STYLES[inspeccionInfo?.area || ""] || { bg: "bg-white/10", text: "text-white/60", border: "border-white/20" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/20 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-400/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Exportar Inspección</h3>
              <p className="text-white/50 text-xs flex items-center gap-2">
                {inspeccionInfo?.idInspeccion}
                <span className={`px-1.5 py-0.5 rounded ${areaStyle.bg} ${areaStyle.text} text-[9px]`}>
                  {inspeccionInfo?.area}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              currentPhase === 1 ? "bg-blue-500/20 text-blue-300 border border-blue-400/30" :
              firmaResponsable ? "bg-green-500/20 text-green-300 border border-green-400/30" : "bg-white/10 text-white/40 border border-white/15"
            }`}>
              {firmaResponsable ? <Check className="w-3 h-3" /> : <span>1</span>}
              <span>Responsable</span>
            </div>
            <div className="flex-1 h-px bg-white/15" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              currentPhase === 2 ? "bg-blue-500/20 text-blue-300 border border-blue-400/30" :
              firmaCopasst ? "bg-green-500/20 text-green-300 border border-green-400/30" : "bg-white/10 text-white/40 border border-white/15"
            }`}>
              {firmaCopasst ? <Check className="w-3 h-3" /> : <span>2</span>}
              <span>COPASST</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/15 border border-red-400/25 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Contenido según paso */}
        <div className="p-4">
          {isGenerating ? (
            <div className="py-8 text-center">
              <Loader2 className="w-10 h-10 text-green-400 animate-spin mx-auto mb-3" />
              <p className="text-white font-medium">Generando archivo Excel...</p>
              <p className="text-white/50 text-sm mt-1">Incluyendo firmas de confirmación</p>
            </div>
          ) : showSigningResponsable ? (
            <SignaturePanel
              personaValidada={responsableValidado!}
              titulo="Firma del Responsable de la Inspección"
              onConfirm={onConfirmarFirmaResponsable}
              onCancel={onClose}
            />
          ) : showSigningCopasst ? (
            <SignaturePanel
              personaValidada={copasstValidado!}
              titulo="Firma del Representante COPASST"
              onConfirm={onConfirmarFirmaCopasst}
              onCancel={onClose}
            />
          ) : currentPhase === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-400/20">
                <IdCard className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Responsable de la Inspección</p>
                  <p className="text-white/50 text-sm">Ingrese su cédula para validar su identidad</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Número de Cédula</label>
                <input
                  type="text"
                  value={cedulaResponsable}
                  onChange={(e) => setCedulaResponsable(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 1234567890"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-lg tracking-wider"
                  disabled={isValidating}
                  autoFocus
                />
              </div>

              <button
                onClick={onValidarResponsable}
                disabled={isValidating || !cedulaResponsable.trim()}
                className="w-full py-3 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 font-semibold hover:bg-blue-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Validar Identidad
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mostrar responsable confirmado */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-400/20">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-green-300 text-xs font-medium">Responsable confirmado</p>
                  <p className="text-white font-medium truncate">{responsableValidado?.nombreCompleto}</p>
                </div>
                <Image
                  src={firmaResponsable!}
                  alt="Firma"
                  width={60}
                  height={30}
                  className="rounded border border-white/20"
                />
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-400/20">
                <IdCard className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Representante COPASST</p>
                  <p className="text-white/50 text-sm">Ingrese su cédula para validar su identidad</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Número de Cédula</label>
                <input
                  type="text"
                  value={cedulaCopasst}
                  onChange={(e) => setCedulaCopasst(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 1234567890"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-lg tracking-wider"
                  disabled={isValidating}
                  autoFocus
                />
              </div>

              <button
                onClick={onValidarCopasst}
                disabled={isValidating || !cedulaCopasst.trim()}
                className="w-full py-3 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 font-semibold hover:bg-purple-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Validar Identidad
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Componente Panel de Firma
// ══════════════════════════════════════════════════════════
function SignaturePanel({
  personaValidada,
  titulo,
  onConfirm,
  onCancel,
}: {
  personaValidada: PersonaValidada;
  titulo: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const hasStrokes = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
    hasStrokes.current = true;
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    hasStrokes.current = false;
    setIsEmpty(true);
  };

  const confirmSignature = () => {
    if (!canvasRef.current || !hasStrokes.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onConfirm(dataUrl);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-400/20">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-green-300 text-xs font-medium">Identidad verificada</p>
          <p className="text-white font-medium truncate">{personaValidada.nombreCompleto}</p>
          <p className="text-white/50 text-[10px]">{personaValidada.rol || "—"}</p>
        </div>
      </div>

      <div>
        <p className="text-sm text-white/70 font-medium mb-2">{titulo}</p>
        <div className="relative rounded-xl overflow-hidden border border-white/20 bg-white">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-[160px] cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 text-sm flex items-center gap-2">
                <PenTool className="w-4 h-4" />
                Firme aquí
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={clearCanvas}
          className="flex-1 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white/60 text-sm font-medium hover:bg-white/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Eraser className="w-4 h-4" />
          Limpiar
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
        <button
          onClick={confirmSignature}
          disabled={isEmpty}
          className="flex-1 py-2.5 rounded-lg bg-green-500/25 border border-green-400/30 text-green-300 text-sm font-semibold hover:bg-green-500/35 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          Confirmar
        </button>
      </div>
    </div>
  );
}
