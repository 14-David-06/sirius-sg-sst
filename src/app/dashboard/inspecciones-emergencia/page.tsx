"use client";

// ══════════════════════════════════════════════════════════
// Hub de Inspecciones de Equipos de Emergencia
// Botiquines, extintores, camillas y kits de derrames.
// ══════════════════════════════════════════════════════════

import { useRouter } from "next/navigation";
import { Briefcase, ClipboardList, Droplets, FireExtinguisher, HeartPulse } from "lucide-react";
import type { TipoInspeccion } from "@/lib/inspecciones-emergencia/types";
import { TIPOS_UI } from "./_components/config";
import { BotonVolver, Cabecera, PaginaInspeccion } from "./_components/ui";

const ICONOS: Record<TipoInspeccion, React.ReactNode> = {
  botiquin: <HeartPulse className="w-7 h-7" />,
  extintor: <FireExtinguisher className="w-7 h-7" />,
  camilla: <Briefcase className="w-7 h-7" />,
  "kit-derrames": <Droplets className="w-7 h-7" />,
};

export default function InspeccionesEmergenciaPage() {
  const router = useRouter();

  return (
    <PaginaInspeccion>
      <BotonVolver href="/dashboard/inspecciones" texto="Volver a Inspecciones" />

      <Cabecera
        titulo="Inspecciones de Equipos de Emergencia"
        descripcion="Registra la verificación periódica de los equipos de atención de emergencias. Cada tipo tiene su propio formato y su historial."
      />

      {/* El módulo general precede a los cuatro formatos específicos: cubre
          cualquier equipo del catálogo, sin checklist por tipo. */}
      <button
        onClick={() => router.push("/dashboard/inspecciones-equipos")}
        className="w-full mb-4 flex items-center gap-5 rounded-2xl border border-white/15
                   bg-white/5 hover:bg-white/10 backdrop-blur-xl p-6 text-left transition-all group"
      >
        <div className="w-14 h-14 rounded-xl border border-white/15 bg-white/5 text-white/70
                        flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <ClipboardList className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white">Inspección general de equipos</h3>
          <p className="text-sm text-white/60 mt-0.5">
            Formato único para cualquier equipo del catálogo de emergencia, sin
            checklist por tipo.
          </p>
        </div>
        <svg
          className="w-5 h-5 shrink-0 text-white/30 group-hover:translate-x-1 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </button>

      <h2 className="text-sm font-medium text-white/50 mb-3">
        Formatos específicos por tipo de equipo
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TIPOS_UI.map((meta) => (
          <div
            key={meta.tipo}
            className={`rounded-2xl border backdrop-blur-xl p-6 transition-all
                        ${meta.acento.fondo} ${meta.acento.borde}`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-xl border flex items-center justify-center shrink-0
                            ${meta.acento.borde} ${meta.acento.texto} bg-white/5`}
              >
                {ICONOS[meta.tipo]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white">{meta.etiqueta}</h3>
                <p className="text-sm text-white/60 mt-1">{meta.descripcion}</p>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => router.push(`/dashboard/inspecciones-emergencia/${meta.slug}`)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                            bg-white/10 hover:bg-white/20 border-white/20 text-white`}
              >
                Nueva inspección
              </button>
              <button
                onClick={() =>
                  router.push(`/dashboard/inspecciones-emergencia/${meta.slug}/historial`)
                }
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15
                           text-white/70 hover:text-white text-sm transition-colors"
              >
                Historial
              </button>
            </div>
          </div>
        ))}
      </div>
    </PaginaInspeccion>
  );
}
