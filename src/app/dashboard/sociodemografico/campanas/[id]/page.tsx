"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Link as LinkIcon,
  Copy,
  Check,
  Plus,
  BarChart3,
  Calendar,
  AlertCircle,
  RefreshCw,
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
  const [personalSeleccionado, setPersonalSeleccionado] = useState<string[]>([]);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setCampanaId(p.id);
      cargarDatos(p.id);
    });
  }, [params]);

  const cargarDatos = async (id: string) => {
    try {
      // Cargar campaña
      const resCampana = await fetch(`/api/socio/campanas?id=${id}`);
      const dataCampana = await resCampana.json();
      if (!dataCampana.success) throw new Error(dataCampana.error);
      setCampana(dataCampana.data[0]);

      // Cargar tokens
      const resTokens = await fetch(`/api/socio/tokens?campanaId=${id}`);
      const dataTokens = await resTokens.json();
      if (dataTokens.success) {
        setTokens(dataTokens.data);
      }

      // Cargar personal
      const resPersonal = await fetch("/api/personal");
      const dataPersonal = await resPersonal.json();
      if (dataPersonal.success) {
        setPersonal(dataPersonal.data);
      }
    } catch (err: any) {
      setError(err.message);
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
    if (personalSeleccionado.length === 0) {
      alert("Seleccione al menos un colaborador");
      return;
    }

    setGenerando(true);
    try {
      const response = await fetch(`/api/socio/campanas/${campanaId}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalIds: personalSeleccionado }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      // Recargar datos
      await cargarDatos(campanaId);
      setMostrarModal(false);
      setPersonalSeleccionado([]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Cargando campaña...</p>
        </div>
      </div>
    );
  }

  if (!campana) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Campaña no encontrada</h2>
          <Link href="/dashboard/sociodemografico/campanas" className="text-violet-400 hover:underline">
            Volver a campañas
          </Link>
        </div>
      </div>
    );
  }

  const progreso = campana.tokensGenerados
    ? Math.round(((campana.respuestasCompletadas || 0) / campana.tokensGenerados) * 100)
    : 0;

  // Personal que ya tiene token
  const personalConToken = tokens.map((t) => t.personalId);
  const personalDisponible = personal.filter((p) => !personalConToken.includes(p.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/sociodemografico/campanas"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a campañas
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{campana.nombre}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    campana.estado === "Activa"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-500/20 text-slate-300"
                  }`}
                >
                  {campana.estado}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-white/60">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {campana.periodo} {campana.año}
                </span>
                <span>Inicio: {new Date(campana.fechaInicio).toLocaleDateString("es-CO")}</span>
                <span>Por: {campana.creadoPor}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/dashboard/sociodemografico/campanas/${campanaId}/estadisticas`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-medium rounded-lg transition-all"
              >
                <BarChart3 className="w-5 h-5" />
                Estadísticas
              </button>
              <button
                onClick={() => setMostrarModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Generar Tokens
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-violet-500/20 rounded-lg">
                <LinkIcon className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Tokens Generados</p>
                <p className="text-3xl font-bold text-white">{campana.tokensGenerados || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-500/20 rounded-lg">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Respuestas Completadas</p>
                <p className="text-3xl font-bold text-white">{campana.respuestasCompletadas || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Progreso General</span>
                <span className="text-2xl font-bold text-white">{progreso}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    progreso === 100
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                      : "bg-gradient-to-r from-violet-500 to-purple-500"
                  }`}
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Lista de tokens */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Tokens de Acceso</h2>
            <button
              onClick={() => cargarDatos(campanaId)}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>

          {tokens.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 mb-4">No hay tokens generados aún</p>
              <button
                onClick={() => setMostrarModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Generar Tokens
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => {
                const personalData = personal.find((p) => p.id === token.personalId);
                return (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          token.usado ? "bg-emerald-500" : "bg-yellow-500"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-white">{personalData?.nombreCompleto || "Desconocido"}</p>
                        <p className="text-sm text-white/60">{personalData?.numeroDocumento || "-"}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            token.usado
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-yellow-500/20 text-yellow-300"
                          }`}
                        >
                          {token.usado ? "✓ Completado" : "⏳ Pendiente"}
                        </span>
                        {token.fechaUso && (
                          <p className="text-xs text-white/50 mt-1">
                            {new Date(token.fechaUso).toLocaleDateString("es-CO")}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => copiarLink(token.token)}
                      className="ml-4 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg transition-all flex items-center gap-2"
                      title="Copiar enlace"
                    >
                      {copiado === token.token ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copiar link
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de generar tokens */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Generar Tokens de Acceso</h3>
            <p className="text-white/60 mb-6">Selecciona los colaboradores que participarán en la encuesta</p>

            {personalDisponible.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                <p className="text-white/70">
                  No hay personal disponible. Todos los colaboradores ya tienen un token asignado.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                {personalDisponible.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={personalSeleccionado.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPersonalSeleccionado((prev) => [...prev, p.id]);
                        } else {
                          setPersonalSeleccionado((prev) => prev.filter((id) => id !== p.id));
                        }
                      }}
                      className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-600"
                    />
                    <div>
                      <p className="font-medium text-white">{p.nombreCompleto}</p>
                      <p className="text-sm text-white/60">{p.numeroDocumento}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {personalDisponible.length > 0 && (
              <div className="mb-6 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  ℹ️ Seleccionados: <strong>{personalSeleccionado.length}</strong> de{" "}
                  <strong>{personalDisponible.length}</strong>
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setPersonalSeleccionado([]);
                }}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all"
              >
                Cancelar
              </button>
              {personalDisponible.length > 0 && (
                <button
                  onClick={generarTokens}
                  disabled={generando || personalSeleccionado.length === 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generando ? "Generando..." : `Generar ${personalSeleccionado.length} Tokens`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
