"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  Users,
  Link as LinkIcon,
  Copy,
  Check,
  Plus,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  Lock,
  X,
} from "lucide-react";
import type { Campana, Token } from "@/modules/sociodemografico/domain/entities";

interface Personal {
  id: string;
  nombreCompleto: string;
  numeroDocumento: string;
}

export default function DetalleCampanaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [campanaId, setCampanaId] = useState<string>("");
  const [campana, setCampana] = useState<Campana | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  // Modal de generar tokens
  const [mostrarModal, setMostrarModal] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [personalSeleccionado, setPersonalSeleccionado] = useState<string[]>([]);
  const [generando, setGenerando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setCampanaId(p.id);
      cargarDatos(p.id);
    });
  }, [params]);

  const cargarDatos = async (id: string) => {
    try {
      // Cargar campaña
      const resCampana = await fetch(`/api/socio/campanas/${id}`);
      const dataCampana = await resCampana.json();
      if (!dataCampana.success) throw new Error(dataCampana.error);
      setCampana(dataCampana.data);

      // Cargar tokens
      const resTokens = await fetch(`/api/socio/campanas/${id}/tokens`);
      const dataTokens = await resTokens.json();
      if (dataTokens.success) {
        setTokens(dataTokens.data);
      }

      // Cargar personal activo de Nómina Core (solo lectura)
      try {
        const resPersonal = await fetch("/api/personal");
        const dataPersonal = await resPersonal.json();
        if (dataPersonal.success) {
          setPersonal(dataPersonal.data);
        }
      } catch {
        console.warn("No se pudo cargar personal");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar la campaña");
    } finally {
      setLoading(false);
    }
  };

  const copiarLink = (token: string) => {
    const url = `${window.location.origin}/encuesta/socio/${token}`;
    navigator.clipboard.writeText(url);
    setCopiado(token);
    setTimeout(() => setCopiado(null), 2000);
  };

  const generarTokens = async () => {
    if (personalSeleccionado.length === 0) return;

    setGenerando(true);
    setError(null);
    try {
      const response = await fetch(`/api/socio/campanas/${campanaId}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalIds: personalSeleccionado }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      await cargarDatos(campanaId);
      setMostrarModal(false);
      setPersonalSeleccionado([]);
      setBusqueda("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al generar tokens");
      setMostrarModal(false);
    } finally {
      setGenerando(false);
    }
  };

  const cerrarCampana = async () => {
    if (
      !confirm(
        "¿Está seguro de cerrar esta campaña? Una vez cerrada, no se podrán enviar más respuestas."
      )
    ) {
      return;
    }

    setCerrando(true);
    setError(null);
    try {
      const response = await fetch(`/api/socio/campanas/${campanaId}/cerrar`, {
        method: "POST",
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      await cargarDatos(campanaId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cerrar la campaña");
    } finally {
      setCerrando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!campana) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center max-w-md">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Campaña no encontrada</h2>
          {error && <p className="text-white/60 text-sm mb-4">{error}</p>}
          <button
            onClick={() => router.push("/dashboard/sociodemografico")}
            className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all cursor-pointer"
          >
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  const totalTokens = campana.tokensGenerados || 0;
  const totalRespuestas = campana.respuestasCompletadas || 0;
  const progreso = totalTokens > 0 ? Math.round((totalRespuestas / totalTokens) * 100) : 0;

  // Personal que ya tiene token
  const personalConToken = new Set(tokens.map((t) => t.personalId));
  const personalDisponible = personal.filter((p) => !personalConToken.has(p.id));
  const personalFiltrado = personalDisponible.filter(
    (p) =>
      p.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.numeroDocumento.includes(busqueda)
  );

  return (
    <div className="min-h-screen">
      {/* Fondo */}
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
          <div className="flex flex-wrap items-center justify-between gap-3 py-5">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => router.push("/dashboard/sociodemografico")}
                className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Panel
              </button>
              <div className="h-8 w-px bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-white truncate">{campana.nombre}</h1>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${
                        campana.estado === "Activa"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : "bg-white/10 text-white/50 border border-white/15"
                      }`}
                    >
                      {campana.estado}
                    </span>
                  </div>
                  <p className="text-xs text-white/50">
                    {campana.periodo.replace("_", " ")} {campana.año} ·{" "}
                    {new Date(campana.fechaInicio).toLocaleDateString("es-CO", {
                      timeZone: "America/Bogota",
                    })}{" "}
                    · {campana.creadoPor}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  router.push(`/dashboard/sociodemografico/campanas/${campanaId}/estadisticas`)
                }
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/15 border border-blue-400/25 text-blue-300 text-sm font-semibold hover:bg-blue-500/25 transition-all cursor-pointer"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Estadísticas</span>
              </button>
              {campana.estado === "Activa" && (
                <>
                  <button
                    onClick={() => setMostrarModal(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Generar Tokens</span>
                  </button>
                  <button
                    onClick={cerrarCampana}
                    disabled={cerrando}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-400/25 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span className="hidden sm:inline">{cerrando ? "Cerrando..." : "Cerrar"}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-white flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-4">
            <div className="flex items-center gap-2 mb-1">
              <LinkIcon className="w-4 h-4 text-violet-400" />
              <p className="text-[11px] text-white/40">Tokens Generados</p>
            </div>
            <p className="text-2xl font-bold text-white">{totalTokens}</p>
          </div>
          <div className="bg-emerald-500/10 backdrop-blur-xl rounded-xl border border-emerald-400/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-emerald-400" />
              <p className="text-[11px] text-emerald-300/60">Respuestas Completadas</p>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{totalRespuestas}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-white/40">Participación</p>
              <p className="text-lg font-bold text-white">{progreso}%</p>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  progreso === 100
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    : "bg-gradient-to-r from-violet-500 to-purple-500"
                }`}
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lista de tokens */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-violet-400" />
              Tokens de Acceso
            </h2>
            <button
              onClick={() => cargarDatos(campanaId)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 text-sm font-medium transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>

          {tokens.length === 0 ? (
            <div className="text-center py-14">
              <Users className="w-14 h-14 text-white/15 mx-auto mb-4" />
              <p className="text-white/60 font-medium mb-1">No hay tokens generados</p>
              <p className="text-white/40 text-sm mb-6">
                Genera enlaces únicos para que los colaboradores respondan la encuesta
              </p>
              {campana.estado === "Activa" && (
                <button
                  onClick={() => setMostrarModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Generar Tokens
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => {
                const personalData = personal.find((p) => p.id === token.personalId);
                return (
                  <div
                    key={token.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          token.usado ? "bg-emerald-400" : "bg-yellow-400"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">
                          {personalData?.nombreCompleto || "Colaborador no encontrado"}
                        </p>
                        <p className="text-xs text-white/50">
                          {personalData?.numeroDocumento || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            token.usado
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                              : "bg-yellow-500/15 text-yellow-300 border border-yellow-400/25"
                          }`}
                        >
                          {token.usado ? "Completado" : "Pendiente"}
                        </span>
                        {token.fechaUso && (
                          <p className="text-[11px] text-white/40 mt-1">
                            {new Date(token.fechaUso).toLocaleDateString("es-CO", {
                              timeZone: "America/Bogota",
                            })}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => copiarLink(token.token)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                          copiado === token.token
                            ? "bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
                            : "bg-violet-500/15 border border-violet-400/25 text-violet-300 hover:bg-violet-500/25"
                        }`}
                        title="Copiar enlace de la encuesta"
                      >
                        {copiado === token.token ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline">Copiar link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de generar tokens */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setMostrarModal(false);
              setPersonalSeleccionado([]);
              setBusqueda("");
            }}
          />
          <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/20 w-full max-w-lg flex flex-col max-h-[70vh]">
            {/* Header del modal */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Generar Tokens de Acceso</h3>
                <button
                  onClick={() => {
                    setMostrarModal(false);
                    setPersonalSeleccionado([]);
                    setBusqueda("");
                  }}
                  className="p-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o documento..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  />
                </div>
                {personalDisponible.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/50">
                      {personalSeleccionado.length} de {personalDisponible.length} seleccionados
                    </p>
                    <button
                      onClick={() => {
                        if (personalSeleccionado.length === personalFiltrado.length) {
                          setPersonalSeleccionado([]);
                        } else {
                          setPersonalSeleccionado(personalFiltrado.map((p) => p.id));
                        }
                      }}
                      className="text-xs font-semibold text-violet-300 hover:text-violet-200 transition-colors cursor-pointer"
                    >
                      {personalSeleccionado.length === personalFiltrado.length
                        ? "Deseleccionar todos"
                        : "Seleccionar todos"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de personal */}
            <div className="p-2 flex-1 overflow-y-auto">
              {personalDisponible.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Check className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
                  <p className="text-white/60 text-sm">
                    Todos los colaboradores activos ya tienen un token asignado para esta campaña.
                  </p>
                </div>
              ) : personalFiltrado.length === 0 ? (
                <p className="text-center text-white/40 text-sm py-10">
                  Sin resultados para &quot;{busqueda}&quot;
                </p>
              ) : (
                personalFiltrado.map((p) => {
                  const seleccionado = personalSeleccionado.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setPersonalSeleccionado((prev) =>
                          seleccionado ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                        )
                      }
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left cursor-pointer ${
                        seleccionado ? "bg-violet-500/20 border border-violet-400/30" : "hover:bg-white/10 border border-transparent"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                          seleccionado
                            ? "bg-violet-500 border-violet-400"
                            : "bg-white/5 border-white/25"
                        }`}
                      >
                        {seleccionado && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">{p.nombreCompleto}</p>
                        <p className="text-xs text-white/50">{p.numeroDocumento}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer del modal */}
            <div className="p-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={generarTokens}
                disabled={generando || personalSeleccionado.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {generando && <Loader2 className="w-4 h-4 animate-spin" />}
                {generando
                  ? "Generando..."
                  : `Generar ${personalSeleccionado.length} token${personalSeleccionado.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
