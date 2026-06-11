"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Módulo de Perfil Sociodemográfico
 * Estándar 1.2.1 — Caracterización de la población trabajadora
 *
 * Funcionalidades:
 * - Gestión de campañas semestrales
 * - Generación de tokens únicos por colaborador
 * - Encuesta digital con 7 secciones
 * - Análisis estadístico y pirámide poblacional
 * - Generación de informes PDF corporativos
 */

type CampanaEstado = "Activa" | "Cerrada";

interface Campana {
  id: string;
  nombre: string;
  periodo: "Semestre_1" | "Semestre_2";
  año: number;
  estado: CampanaEstado;
  fechaInicio: string;
  fechaCierre?: string;
  totalColaboradores: number;
  totalRespuestas: number;
  porcentajeCompletado: number;
}

export default function SociodemograficoPage() {
  const router = useRouter();
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(false);

  // Simulación de datos para desarrollo
  // TODO: Reemplazar con llamadas reales a la API cuando esté implementada
  const campanasDemo: Campana[] = [
    {
      id: "SOCIO-001",
      nombre: "Perfil Sociodemográfico Jun-2026",
      periodo: "Semestre_1",
      año: 2026,
      estado: "Activa",
      fechaInicio: "2026-06-01",
      totalColaboradores: 45,
      totalRespuestas: 0,
      porcentajeCompletado: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Perfil Sociodemográfico</h1>
                <p className="text-sm text-white/60 mt-0.5">
                  Caracterización demográfica · Estándar 1.2.1 · Ley 1581/2012
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 backdrop-blur-xl border border-violet-400/30 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-violet-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                ¿Qué es el Perfil Sociodemográfico?
              </h3>
              <p className="text-white/70 text-sm leading-relaxed mb-4">
                Es la caracterización demográfica y socioeconómica de los trabajadores de Sirius,
                requerida por el Estándar 1.2.1 de la Resolución 0312/2019. Este perfil permite
                identificar condiciones de salud, factores de riesgo y diseñar programas de
                prevención específicos para la población trabajadora.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-xs text-white/50 mb-1">Periodicidad</p>
                  <p className="text-white font-semibold">Semestral</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-xs text-white/50 mb-1">Protección de datos</p>
                  <p className="text-white font-semibold">Ley 1581/2012</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-xs text-white/50 mb-1">Secciones de encuesta</p>
                  <p className="text-white font-semibold">7 secciones</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estado del Módulo */}
        <div className="bg-amber-500/10 backdrop-blur-xl border border-amber-400/30 rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Módulo en Implementación</h2>
              <p className="text-amber-200/70">
                Backend completado al 100%. Frontend en desarrollo activo.
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/sociodemografico/campanas")}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all"
            >
              Ir a Campañas →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Funcionalidades Planificadas */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Funcionalidades Planificadas
              </h3>
              <ul className="space-y-2.5 text-sm text-white/70">
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5">•</span>
                  <span>Creación de campañas semestrales</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5">•</span>
                  <span>Generación automática de links únicos por colaborador</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5">•</span>
                  <span>Encuesta digital de 7 secciones (datos personales, vivienda, educación, trabajo, salud, hábitos, transporte)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5">•</span>
                  <span>Tabulación automática y análisis estadístico</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5">•</span>
                  <span>Pirámide poblacional por edad y género</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5">•</span>
                  <span>Generación de informes PDF corporativos</span>
                </li>
              </ul>
            </div>

            {/* Estado de Implementación */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
                </svg>
                Estado de Implementación
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">Base de datos Airtable</span>
                    <span className="text-sm font-semibold text-emerald-400">100% ✓</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">Backend API (14 endpoints)</span>
                    <span className="text-sm font-semibold text-emerald-400">100% ✓</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">Interfaz de usuario</span>
                    <span className="text-sm font-semibold text-amber-400">75%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400" style={{ width: "75%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">Generación de PDF</span>
                    <span className="text-sm font-semibold text-amber-400">10%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400" style={{ width: "10%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vista Previa de Interfaz Futura */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Vista Previa de la Interfaz
            </h2>
            <p className="text-sm text-white/60 mt-1">
              Así se verá el módulo una vez completado
            </p>
          </div>

          {/* Mock de lista de campañas */}
          <div className="p-6 space-y-4 opacity-50">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-violet-300">S1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Perfil Sociodemográfico Jun-2026</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Semestre 1 · 2026 ·
                    <span className="text-emerald-400 ml-1">● Activa</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">0<span className="text-white/40">/45</span></p>
                  <p className="text-xs text-white/50">respuestas</p>
                </div>
                <button
                  disabled
                  className="px-4 py-2 bg-violet-500/20 text-violet-300 rounded-lg border border-violet-400/30 font-medium text-sm cursor-not-allowed"
                >
                  Administrar
                </button>
              </div>
            </div>

            <div className="text-center py-8 text-white/40 text-sm">
              Las campañas creadas aparecerán aquí
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/40">
            Para más información sobre el estado de desarrollo, consulta{" "}
            <code className="px-2 py-0.5 bg-white/10 rounded text-violet-300">
              ESTADO_MODULO_SOCIODEMOGRAFICO.md
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
