"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ClipboardList, PlusCircle, History, ChevronLeft } from "lucide-react";

export default function RegistrosAsistenciaPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 backdrop-blur-sm">
                <ClipboardList className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Registro de Asistencia</h1>
                <p className="text-xs text-white/60">FT-SST-021 — Capacitaciones, charlas e inducciones</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Nuevo Registro */}
          <button
            onClick={() => router.push("/dashboard/registros-asistencia/nuevo")}
            className="group bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-8 text-left hover:bg-white/20 hover:border-white/30 hover:shadow-2xl hover:shadow-black/20 transition-all cursor-pointer"
          >
            <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center mb-5">
              <PlusCircle className="w-8 h-8 text-purple-300" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Nuevo Registro</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Crea un registro de asistencia para un evento. Carga el personal activo,
              captura las firmas digitales y exporta el formato oficial FT-SST-021.
            </p>
            <div className="mt-6 flex items-center text-sm text-purple-300 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Crear registro
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </button>

          {/* Historial */}
          <button
            onClick={() => router.push("/dashboard/registros-asistencia/historial")}
            className="group bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-8 text-left hover:bg-white/20 hover:border-white/30 hover:shadow-2xl hover:shadow-black/20 transition-all cursor-pointer"
          >
            <div className="w-14 h-14 rounded-xl bg-sirius-azul/20 flex items-center justify-center mb-5">
              <History className="w-8 h-8 text-sirius-cielo" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Historial</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Consulta todos los registros de asistencia anteriores. Visualiza el estado,
              número de asistentes y exporta cualquier registro a Excel.
            </p>
            <div className="mt-6 flex items-center text-sm text-sirius-cielo font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Ver historial
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
