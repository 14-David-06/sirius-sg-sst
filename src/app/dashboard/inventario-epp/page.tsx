"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Package,
  Search,
  Filter,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  Box,
  Loader2,
  ImageOff,
  RefreshCw,
  PackagePlus,
  Send,
  ClipboardList,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────
interface InsumoEPP {
  id: string;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockMinimo: number;
  stockActual: number;
  estado: string;
  imagen: { url: string; filename: string; width?: number; height?: number } | null;
  referenciaComercial: string;
  responsable: string;
  categoriaIds: string[];
}

type ViewMode = "grid" | "table";

// ── Componente principal ─────────────────────────────────
export default function InventarioEPPPage() {
  const router = useRouter();
  const [insumos, setInsumos] = useState<InsumoEPP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedInsumo, setSelectedInsumo] = useState<InsumoEPP | null>(null);

  const fetchInsumos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insumos/epp");
      const json = await res.json();
      if (json.success) {
        setInsumos(json.data);
      } else {
        setError(json.message || "Error al cargar inventario");
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsumos();
  }, [fetchInsumos]);

  // ── Filtro de búsqueda ────────────────────────────────
  const filtered = insumos.filter(
    (i) =>
      i.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.codigo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Estadísticas rápidas ──────────────────────────────
  const totalItems = insumos.length;
  const activos = insumos.filter((i) => i.estado === "Activo").length;
  const alertaStock = insumos.filter((i) => (i.stockActual ?? 0) < i.stockMinimo).length;
  const totalUnidades = insumos.reduce((acc, i) => acc + (i.stockActual ?? 0), 0);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Dashboard
              </button>
              <div className="h-8 w-px bg-white/20" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center">
                  <Package className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Inventario de EPPs</h1>
                  <p className="text-xs text-white/50">Sirius Insumos Core</p>
                </div>
              </div>
            </div>

            <button
              onClick={fetchInsumos}
              disabled={loading}
              className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <Box className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Total EPPs</p>
                <p className="text-2xl font-bold text-white">{loading ? "—" : totalItems}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Unidades en stock</p>
                <p className="text-2xl font-bold text-blue-400">{loading ? "—" : totalUnidades}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Activos</p>
                <p className="text-2xl font-bold text-green-400">{loading ? "—" : activos}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Bajo stock mínimo</p>
                <p className="text-2xl font-bold text-red-400">{loading ? "—" : alertaStock}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard/inventario-epp/ingreso")}
            className="flex-1 flex items-center gap-3 bg-teal-500/15 backdrop-blur-xl rounded-xl border border-teal-400/25 p-5 hover:bg-teal-500/25 hover:border-teal-400/40 transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <PackagePlus className="w-6 h-6 text-teal-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-white group-hover:text-teal-300 transition-colors">Ingresar EPP al Inventario</h3>
              <p className="text-xs text-white/40 mt-0.5">Registrar entrada de unidades al stock</p>
            </div>
            <svg className="w-5 h-5 text-teal-400/50 ml-auto group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <button
            onClick={() => router.push("/dashboard/inventario-epp/entrega")}
            className="flex-1 flex items-center gap-3 bg-blue-500/15 backdrop-blur-xl rounded-xl border border-blue-400/25 p-5 hover:bg-blue-500/25 hover:border-blue-400/40 transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Send className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">Entrega de EPP</h3>
              <p className="text-xs text-white/40 mt-0.5">Registrar entrega de EPP a empleados</p>
            </div>
            <svg className="w-5 h-5 text-blue-400/50 ml-auto group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <button
            onClick={() => router.push("/dashboard/inventario-epp/inspeccion")}
            className="flex-1 flex items-center gap-3 bg-purple-500/15 backdrop-blur-xl rounded-xl border border-purple-400/25 p-5 hover:bg-purple-500/25 hover:border-purple-400/40 transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ClipboardList className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">Inspección de EPP</h3>
              <p className="text-xs text-white/40 mt-0.5">Registrar condición de EPP de empleados</p>
            </div>
            <svg className="w-5 h-5 text-purple-400/50 ml-auto group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

        {/* Acciones secundarias */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard/inventario-epp/entregas")}
            className="w-full flex items-center gap-3 bg-orange-500/10 backdrop-blur-xl rounded-xl border border-orange-400/20 p-4 hover:bg-orange-500/20 hover:border-orange-400/35 transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ClipboardList className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-sm text-white group-hover:text-orange-300 transition-colors">Ver todas las entregas</h3>
              <p className="text-xs text-white/40 mt-0.5">Historial de entregas, estados y firmas digitales</p>
            </div>
            <svg className="w-5 h-5 text-orange-400/50 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

        {/* Barra de búsqueda y controles */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-4 py-3 text-sm font-medium transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-teal-500/30 text-teal-300 border-r border-teal-400/30"
                    : "text-white/50 hover:text-white/80 border-r border-white/10"
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-3 text-sm font-medium transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-teal-500/30 text-teal-300"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-teal-400 animate-spin mb-4" />
            <p className="text-white/60">Cargando inventario de EPPs...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-500/10 backdrop-blur-xl border border-red-400/20 rounded-xl p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-300 font-medium mb-2">{error}</p>
            <button
              onClick={fetchInsumos}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Grid view */}
        {!loading && !error && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((insumo) => (
              <button
                key={insumo.id}
                onClick={() => setSelectedInsumo(insumo)}
                className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 overflow-hidden hover:bg-white/15 hover:border-white/25 hover:shadow-2xl hover:shadow-black/20 transition-all group cursor-pointer text-left"
              >
                {/* Imagen */}
                <div className="h-40 bg-white/5 relative flex items-center justify-center overflow-hidden">
                  {insumo.imagen ? (
                    <img
                      src={insumo.imagen.url}
                      alt={insumo.nombre}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <ImageOff className="w-12 h-12 text-white/20" />
                  )}
                  {/* Código badge */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-[10px] font-mono text-white/70 border border-white/10">
                    {insumo.codigo}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 group-hover:text-teal-300 transition-colors">
                    {insumo.nombre}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-medium">
                      {insumo.unidadMedida}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-[11px] font-medium">
                      {insumo.estado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-white/40">Stock actual</span>
                      <span className={`text-lg font-bold ${
                        insumo.stockActual < insumo.stockMinimo ? "text-red-400" : "text-teal-400"
                      }`}>
                        {insumo.stockActual}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] text-white/40">Stock mín.</span>
                      <span className="text-sm font-medium text-white/50">
                        {insumo.stockMinimo}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Table view */}
        {!loading && !error && viewMode === "table" && (
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/50 font-medium">Código</th>
                    <th className="text-left py-3 px-4 text-white/50 font-medium">Nombre</th>
                    <th className="text-left py-3 px-4 text-white/50 font-medium">Unidad</th>
                    <th className="text-right py-3 px-4 text-white/50 font-medium">Stock Actual</th>
                    <th className="text-right py-3 px-4 text-white/50 font-medium">Stock Mín.</th>
                    <th className="text-left py-3 px-4 text-white/50 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((insumo) => (
                    <tr
                      key={insumo.id}
                      onClick={() => setSelectedInsumo(insumo)}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-teal-300 text-xs">{insumo.codigo}</td>
                      <td className="py-3 px-4 text-white font-medium">{insumo.nombre}</td>
                      <td className="py-3 px-4 text-white/60">{insumo.unidadMedida}</td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        insumo.stockActual < insumo.stockMinimo ? "text-red-400" : "text-teal-400"
                      }`}>
                        {insumo.stockActual}
                      </td>
                      <td className="py-3 px-4 text-right text-white/50">
                        {insumo.stockMinimo}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">
                          {insumo.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 text-lg font-medium">
              {searchQuery ? "No se encontraron resultados" : "No hay EPPs registrados"}
            </p>
            <p className="text-white/30 text-sm mt-1">
              {searchQuery
                ? `No hay coincidencias para "${searchQuery}"`
                : "Los registros aparecerán aquí cuando estén disponibles en Airtable"}
            </p>
          </div>
        )}

        {/* Results count */}
        {!loading && !error && filtered.length > 0 && (
          <p className="text-center text-white/30 text-sm mt-6">
            Mostrando {filtered.length} de {totalItems} EPPs
          </p>
        )}
      </main>

      {/* Modal de detalle */}
      {selectedInsumo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedInsumo(null)}
        >
          <div
            className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Imagen grande */}
            <div className="h-56 bg-white/5 relative flex items-center justify-center rounded-t-2xl overflow-hidden">
              {selectedInsumo.imagen ? (
                <img
                  src={selectedInsumo.imagen.url}
                  alt={selectedInsumo.nombre}
                  className="w-full h-full object-contain p-6"
                />
              ) : (
                <ImageOff className="w-16 h-16 text-white/20" />
              )}
              <button
                onClick={() => setSelectedInsumo(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all cursor-pointer"
              >
                ✕
              </button>
              <span className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-xs font-mono text-teal-300 border border-teal-400/20">
                {selectedInsumo.codigo}
              </span>
            </div>

            {/* Detalle */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-1">{selectedInsumo.nombre}</h2>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">
                  {selectedInsumo.estado}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-medium">
                  {selectedInsumo.unidadMedida}
                </span>
              </div>

              {/* Campos */}
              <div className="space-y-3">
                <DetailRow label="Stock Actual" value={String(selectedInsumo.stockActual)} highlight={selectedInsumo.stockActual < selectedInsumo.stockMinimo} />
                <DetailRow label="Stock Mínimo" value={String(selectedInsumo.stockMinimo)} />
                <DetailRow label="Responsable" value={selectedInsumo.responsable || "Sin asignar"} />
                {selectedInsumo.referenciaComercial && (
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-xs text-white/40 mb-1">Referencia Comercial</p>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {selectedInsumo.referenciaComercial}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente auxiliar ──────────────────────────────────
function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <span className="text-sm text-white/40">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-amber-400" : "text-white/80"}`}>
        {value}
      </span>
    </div>
  );
}
