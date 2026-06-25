"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/presentation/context/SessionContext";
import { FileText, CheckCircle, AlertCircle, Download, FileCheck, ChevronLeft, Loader2, BarChart3 } from "lucide-react";

// ══════════════════════════════════════════════════════════
// Dashboard: Políticas Empresariales
// Consulta y firma de políticas por categoría
// ══════════════════════════════════════════════════════════

type Politica = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  version: string;
  fechaPublicacion: string;
  fechaVigencia: string;
  urlDocumento: string;
  requiereFirma: boolean;
  firmada: boolean;
};

type EstadoFirma = {
  pendientes: Politica[];
  firmadas: Politica[];
  totalPendientes: number;
  totalFirmadas: number;
};

const categorias = [
  { key: "todas", label: "Todas las Políticas", icon: "📋" },
  { key: "Seguridad y Salud", label: "Seguridad y Salud", icon: "🛡️" },
  { key: "Reglamento Interno", label: "Reglamento Interno", icon: "⚖️" },
  { key: "Recursos Humanos", label: "Recursos Humanos", icon: "👥" },
  { key: "General", label: "General", icon: "📄" },
];

export default function PoliticasPage() {
  const router = useRouter();
  const { user } = useSession();
  const [categoriaActual, setCategoriaActual] = useState("todas");
  const [politicas, setPoliticas] = useState<Politica[]>([]);
  const [estadoFirma, setEstadoFirma] = useState<EstadoFirma | null>(null);
  const [loading, setLoading] = useState(true);
  const [politicaSeleccionada, setPoliticaSeleccionada] = useState<Politica | null>(null);
  const [mostrarModalFirma, setMostrarModalFirma] = useState(false);

  useEffect(() => {
    if (user?.idEmpleado) {
      cargarPoliticas();
      cargarEstadoFirma();
    }
  }, [user, categoriaActual]);

  const cargarPoliticas = async () => {
    try {
      setLoading(true);
      const url = categoriaActual === "todas"
        ? "/api/politicas"
        : `/api/politicas?categoria=${encodeURIComponent(categoriaActual)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setPoliticas(data.data);
      }
    } catch (error) {
      console.error("Error al cargar políticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadoFirma = async () => {
    try {
      const res = await fetch(`/api/politicas/estado-firma?idEmpleado=${user?.idEmpleado}`);
      const data = await res.json();

      if (data.success) {
        setEstadoFirma(data.data);
      }
    } catch (error) {
      console.error("Error al cargar estado de firma:", error);
    }
  };

  const estaFirmada = (politicaId: string): boolean => {
    if (!estadoFirma) return false;
    return estadoFirma.firmadas.some((p) => p.id === politicaId);
  };

  const abrirPolitica = (politica: Politica) => {
    if (politica.requiereFirma && !estaFirmada(politica.id)) {
      // Redirigir a la página de firma
      if (user?.idEmpleado) {
        router.push(`/firmar/politica?id=${politica.id}&emp=${user.idEmpleado}`);
      } else {
        setPoliticaSeleccionada(politica);
        setMostrarModalFirma(true);
      }
    } else {
      window.open(politica.urlDocumento, "_blank");
    }
  };

  const descargarPolitica = (politica: Politica) => {
    window.open(politica.urlDocumento, "_blank");
  };

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
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Políticas Empresariales</h1>
                  <p className="text-xs text-white/50">Consulta y firma de políticas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        {estadoFirma && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-white/50">Total Políticas</p>
                  <p className="text-2xl font-bold text-white">{loading ? "—" : politicas.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-white/50">Firmadas</p>
                  <p className="text-2xl font-bold text-green-400">{loading ? "—" : estadoFirma.totalFirmadas}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-white/50">Pendientes</p>
                  <p className="text-2xl font-bold text-amber-400">{loading ? "—" : estadoFirma.totalPendientes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-white/50">Cumplimiento</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {loading ? "—" : estadoFirma.totalFirmadas + estadoFirma.totalPendientes === 0 ? "100%" : Math.round((estadoFirma.totalFirmadas / (estadoFirma.totalFirmadas + estadoFirma.totalPendientes)) * 100) + "%"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros de Categoría */}
        <div className="mb-8">
          <div className="flex rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 p-1 overflow-x-auto">
            {categorias.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategoriaActual(cat.key)}
                className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  categoriaActual === cat.key
                    ? "bg-indigo-500/30 text-indigo-300 border border-indigo-400/30"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Políticas */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <p className="text-white/60">Cargando políticas...</p>
          </div>
        ) : politicas.length === 0 ? (
          <div className="text-center py-16 bg-white/10 backdrop-blur-xl border border-white/15 rounded-xl">
            <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 text-lg font-medium">No hay políticas disponibles</p>
            <p className="text-white/30 text-sm mt-1">
              {categoriaActual === "todas" ? "No hay políticas registradas en el sistema" : `No hay políticas en la categoría "${categoriaActual}"`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {politicas.map((politica) => {
              const firmada = estaFirmada(politica.id);
              return (
                <div
                  key={politica.id}
                  className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-xl p-6 hover:bg-white/15 hover:border-white/25 hover:shadow-2xl hover:shadow-black/20 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-400/30">
                          {politica.codigo}
                        </span>
                        <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">v{politica.version}</span>
                        {firmada && (
                          <span className="flex items-center gap-1 text-xs text-green-300 bg-green-500/20 px-2.5 py-1 rounded-lg border border-green-400/30">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Firmada
                          </span>
                        )}
                        {politica.requiereFirma && !firmada && (
                          <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-400/30">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Requiere Firma
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">{politica.titulo}</h3>
                      <p className="text-white/60 text-sm mb-3 leading-relaxed">{politica.descripcion}</p>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          📂 {politica.categoria}
                        </span>
                        <span className="flex items-center gap-1">
                          📅 Vigente desde: {new Date(politica.fechaVigencia).toLocaleDateString("es-CO")}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => abrirPolitica(politica)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                          politica.requiereFirma && !firmada
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 hover:bg-indigo-500/30"
                            : "bg-white/10 text-white/80 border border-white/15 hover:bg-white/20"
                        }`}
                      >
                        {politica.requiereFirma && !firmada ? (
                          <>
                            <FileCheck className="w-4 h-4" />
                            Leer y Firmar
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            Ver Política
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => descargarPolitica(politica)}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 bg-white/10 text-white/80 border border-white/15 hover:bg-white/20 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Descargar
                      </button>

                      {politica.requiereFirma && (
                        <button
                          onClick={() => router.push(`/dashboard/politicas/firmas?id=${politica.id}`)}
                          className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 bg-green-500/20 text-green-300 border border-green-400/30 hover:bg-green-500/30 cursor-pointer"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Ver Firmas
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Results count */}
        {!loading && politicas.length > 0 && (
          <p className="text-center text-white/30 text-sm mt-6">
            Mostrando {politicas.length} {politicas.length === 1 ? "política" : "políticas"}
            {categoriaActual !== "todas" && ` en la categoría "${categoriaActual}"`}
          </p>
        )}
      </main>

      {/* Modal de Firma */}
      {mostrarModalFirma && politicaSeleccionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setMostrarModalFirma(false)}
        >
          <div
            className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-400/30">
                      {politicaSeleccionada.codigo}
                    </span>
                    <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">v{politicaSeleccionada.version}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {politicaSeleccionada.titulo}
                  </h2>
                  <p className="text-white/60 text-sm">
                    {politicaSeleccionada.descripcion}
                  </p>
                </div>
                <button
                  onClick={() => setMostrarModalFirma(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-300 font-medium text-sm mb-1">
                      Esta política requiere tu firma digital
                    </p>
                    <p className="text-amber-200/80 text-xs leading-relaxed">
                      Para continuar, debes leer y aceptar esta política. Tu firma quedará registrada en el sistema.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/40">Categoría</span>
                  <span className="text-sm font-medium text-white/80">{politicaSeleccionada.categoria}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/40">Fecha de vigencia</span>
                  <span className="text-sm font-medium text-white/80">
                    {new Date(politicaSeleccionada.fechaVigencia).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    window.open(politicaSeleccionada.urlDocumento, "_blank");
                    setMostrarModalFirma(false);
                  }}
                  className="flex-1 px-6 py-3 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-xl hover:bg-indigo-500/30 transition-all font-medium flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Abrir y Firmar Política
                </button>
                <button
                  onClick={() => setMostrarModalFirma(false)}
                  className="px-6 py-3 bg-white/10 text-white/80 border border-white/15 rounded-xl hover:bg-white/20 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
