"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  Users,
  Plus,
  Calendar,
  BarChart3,
  AlertCircle,
  Loader2,
  FileText,
  TrendingUp,
  Link as LinkIcon,
  CheckCircle,
  X,
} from "lucide-react";
import type { Campana } from "@/modules/sociodemografico/domain/entities";

/**
 * Panel principal del módulo de Perfil Sociodemográfico
 * Estándar 1.2.1 — Caracterización de la población trabajadora
 */
export default function SociodemograficoPage() {
  const router = useRouter();
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarCampanas() {
      try {
        const res = await fetch("/api/socio/campanas");
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Error al cargar campañas");
        setCampanas(data.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al cargar campañas");
      } finally {
        setLoading(false);
      }
    }
    cargarCampanas();
  }, []);

  const activas = campanas.filter((c) => c.estado === "Activa").length;
  const totalTokens = campanas.reduce((sum, c) => sum + (c.tokensGenerados || 0), 0);
  const totalRespuestas = campanas.reduce((sum, c) => sum + (c.respuestasCompletadas || 0), 0);

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
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Dashboard
              </button>
              <div className="h-8 w-px bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Perfil Sociodemográfico</h1>
                  <p className="text-xs text-white/50">
                    Estándar 1.2.1 · Resolución 0312/2019 · Ley 1581/2012
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard/sociodemografico/campanas/nueva")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Campaña</span>
            </button>
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <p className="text-[11px] text-white/40">Total Campañas</p>
                </div>
                <p className="text-2xl font-bold text-white">{campanas.length}</p>
              </div>
              <div className="bg-emerald-500/10 backdrop-blur-xl rounded-xl border border-emerald-400/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <p className="text-[11px] text-emerald-300/60">Activas</p>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{activas}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <LinkIcon className="w-4 h-4 text-blue-400" />
                  <p className="text-[11px] text-white/40">Tokens Emitidos</p>
                </div>
                <p className="text-2xl font-bold text-white">{totalTokens}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-violet-400" />
                  <p className="text-[11px] text-white/40">Respuestas Recibidas</p>
                </div>
                <p className="text-2xl font-bold text-white">{totalRespuestas}</p>
              </div>
            </div>

            {/* Lista de campañas */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-400" />
                Campañas de Recolección
              </h2>

              {campanas.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-14 h-14 text-white/15 mx-auto mb-4" />
                  <p className="text-white/60 font-medium mb-1">No hay campañas registradas</p>
                  <p className="text-white/40 text-sm mb-6">
                    Crea la primera campaña semestral para caracterizar la población trabajadora
                  </p>
                  <button
                    onClick={() => router.push("/dashboard/sociodemografico/campanas/nueva")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Crear Primera Campaña
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campanas.map((campana) => {
                    const tokens = campana.tokensGenerados || 0;
                    const respuestas = campana.respuestasCompletadas || 0;
                    const progreso = tokens > 0 ? Math.round((respuestas / tokens) * 100) : 0;

                    return (
                      <div
                        key={campana.id}
                        onClick={() => router.push(`/dashboard/sociodemografico/campanas/${campana.id}`)}
                        className="bg-white/5 rounded-xl border border-white/10 hover:border-white/25 hover:bg-white/[0.07] p-5 transition-all cursor-pointer"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-violet-300">
                                {campana.periodo === "Semestre_1" ? "S1" : "S2"}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-white">{campana.nombre}</h3>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                    campana.estado === "Activa"
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                      : "bg-white/10 text-white/50 border border-white/15"
                                  }`}
                                >
                                  {campana.estado}
                                </span>
                              </div>
                              <p className="text-xs text-white/50 mt-0.5">
                                {campana.periodo.replace("_", " ")} {campana.año} · Inicio:{" "}
                                {new Date(campana.fechaInicio).toLocaleDateString("es-CO", {
                                  timeZone: "America/Bogota",
                                })}{" "}
                                · {campana.creadoPor}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xl font-bold text-white">
                                {respuestas}
                                <span className="text-sm text-white/40">/{tokens}</span>
                              </p>
                              <p className="text-[11px] text-white/40">respuestas</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/dashboard/sociodemografico/campanas/${campana.id}/estadisticas`
                                );
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/15 border border-blue-400/25 text-blue-300 text-sm font-semibold hover:bg-blue-500/25 transition-all cursor-pointer"
                            >
                              <BarChart3 className="w-4 h-4" />
                              <span className="hidden sm:inline">Estadísticas</span>
                            </button>
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                progreso === 100
                                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                  : "bg-gradient-to-r from-violet-500 to-purple-500"
                              }`}
                              style={{ width: `${progreso}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-white/60 w-10 text-right">
                            {progreso}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
