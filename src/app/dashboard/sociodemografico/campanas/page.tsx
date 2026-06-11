"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Plus, Calendar, TrendingUp, FileText, AlertCircle } from "lucide-react";
import type { Campana } from "@/modules/sociodemografico/domain/entities";

export default function CampanasPage() {
  const router = useRouter();
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarCampanas();
  }, []);

  const cargarCampanas = async () => {
    try {
      const response = await fetch("/api/socio/campanas");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Error al cargar campañas");
      }

      setCampanas(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Cargando campañas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Campañas Sociodemográficas</h1>
              <p className="text-white/60">Gestiona y monitorea las campañas de recolección de datos</p>
            </div>
            <Link
              href="/dashboard/sociodemografico/campanas/nueva"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Nueva Campaña
            </Link>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-500/20 rounded-lg">
                  <FileText className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Total Campañas</p>
                  <p className="text-2xl font-bold text-white">{campanas.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Activas</p>
                  <p className="text-2xl font-bold text-white">
                    {campanas.filter((c) => c.estado === "Activa").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Cerradas</p>
                  <p className="text-2xl font-bold text-white">
                    {campanas.filter((c) => c.estado === "Cerrada").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Respuestas</p>
                  <p className="text-2xl font-bold text-white">
                    {campanas.reduce((sum, c) => sum + (c.respuestasCompletadas || 0), 0)}
                  </p>
                </div>
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

        {/* Lista de campañas */}
        {campanas.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-white/40" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No hay campañas creadas</h3>
            <p className="text-white/60 mb-6">Crea tu primera campaña para comenzar a recolectar datos sociodemográficos</p>
            <Link
              href="/dashboard/sociodemografico/campanas/nueva"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Crear Primera Campaña
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {campanas.map((campana) => {
              const progreso = campana.tokensGenerados
                ? Math.round(((campana.respuestasCompletadas || 0) / campana.tokensGenerados) * 100)
                : 0;

              return (
                <div
                  key={campana.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all cursor-pointer"
                  onClick={() => router.push(`/dashboard/sociodemografico/campanas/${campana.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{campana.nombre}</h3>
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
                        <span>
                          Inicio: {new Date(campana.fechaInicio).toLocaleDateString("es-CO")}
                        </span>
                        <span>Por: {campana.creadoPor}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-bold text-white mb-1">
                        {campana.respuestasCompletadas || 0}
                        <span className="text-lg text-white/40">/{campana.tokensGenerados || 0}</span>
                      </div>
                      <p className="text-xs text-white/60">respuestas</p>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/70">Progreso</span>
                      <span className="text-sm font-semibold text-white">{progreso}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
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

                  {/* Botones de acción */}
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/sociodemografico/campanas/${campana.id}`);
                      }}
                      className="flex-1 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 font-medium rounded-lg transition-all text-sm"
                    >
                      Ver Detalle
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/sociodemografico/campanas/${campana.id}/estadisticas`);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-medium rounded-lg transition-all text-sm"
                    >
                      Estadísticas
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
