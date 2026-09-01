"use client";

// ══════════════════════════════════════════════════════════
// Hub de Inspecciones de Equipos de Emergencia
// Botiquines, extintores, camillas y kits de derrames.
// ══════════════════════════════════════════════════════════

import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { BotonVolver, Cabecera, PaginaInspeccion } from "./_components/ui";

export default function InspeccionesEmergenciaPage() {
  const router = useRouter();

  return (
    <PaginaInspeccion>
      <BotonVolver href="/dashboard/inspecciones" texto="Volver a Inspecciones" />

      <Cabecera
        titulo="Inspecciones de Equipos de Emergencia"
        descripcion="Registra la verificación periódica de los equipos de atención de emergencias."
      />

      {/* Formato general: cubre cualquier equipo del catálogo, sin checklist
          por tipo. */}
      <button
        onClick={() => router.push("/dashboard/inspecciones-equipos")}
        className="w-full flex items-center gap-5 rounded-2xl border border-white/15
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
    </PaginaInspeccion>
  );
}
