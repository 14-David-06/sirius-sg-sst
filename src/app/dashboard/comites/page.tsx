"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ClipboardList, ShieldAlert } from "lucide-react";

const COMITES = [
  {
    slug: "copasst",
    nombre: "COPASST",
    desc: "Comité Paritario de Seguridad y Salud en el Trabajo",
    formato: "FT-SST-008 v001",
    icon: <ShieldAlert className="w-7 h-7 text-blue-400" />,
    iconBg: "bg-blue-500/20 border-blue-400/30",
    cardBg: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-400/20 hover:border-blue-400/35",
    arrowColor: "text-blue-400/50",
    titleHover: "group-hover:text-blue-300",
  },
  {
    slug: "cocolab",
    nombre: "COCOLAB",
    desc: "Comité de Convivencia Laboral",
    formato: "F-TSST-017 v001",
    icon: <ClipboardList className="w-7 h-7 text-emerald-400" />,
    iconBg: "bg-emerald-500/20 border-emerald-400/30",
    cardBg: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-400/20 hover:border-emerald-400/35",
    arrowColor: "text-emerald-400/50",
    titleHover: "group-hover:text-emerald-300",
  },
];

export default function ComitesHubPage() {
  const router = useRouter();

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
          <div className="flex items-center gap-4 py-5">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Dashboard
            </button>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Comités SST</h1>
                <p className="text-xs text-white/50">SG-SST</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Selecciona el comité</h2>
          <p className="mt-1 text-white/50 text-sm">Gestión de actas digitales de los comités obligatorios.</p>
        </div>

        <div className="flex flex-col gap-4">
          {COMITES.map((c) => (
            <button
              key={c.slug}
              onClick={() => router.push(`/dashboard/comites/${c.slug}`)}
              className={`flex items-center gap-5 backdrop-blur-xl rounded-2xl border p-6 text-left transition-all group cursor-pointer ${c.cardBg}`}
            >
              <div className={`w-14 h-14 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${c.iconBg}`}>
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-semibold text-white transition-colors ${c.titleHover}`}>
                    {c.nombre}
                  </h3>
                  <span className="text-xs text-white/50 font-mono">{c.formato}</span>
                </div>
                <p className="text-sm text-white/50 mt-0.5">{c.desc}</p>
              </div>
              <svg className={`w-5 h-5 shrink-0 ${c.arrowColor} group-hover:translate-x-1 transition-transform`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
