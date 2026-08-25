"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Briefcase,
  ChevronLeft,
  FileText,
  Heart,
  Loader2,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { SelectorPeriodo, hoyColombia, rangoDelMes } from "./_components/ui";

// ══════════════════════════════════════════════════════════
// Medicina Laboral — Hub Principal
// Gestión integral de salud ocupacional
// ══════════════════════════════════════════════════════════

interface Indicadores {
  diasIncapacidadEnfermedadGeneral: number;
  enfermedadesLaboralesEnProceso: number;
  enfermedadesLaboralesReconocidas: number;
  trabajadoresReubicadosTemporales: number;
  trabajadoresReubicadosDefinitivos: number;
  trabajadoresRehabilitados: number;
}

type SubModulo = {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  status: "active" | "soon";
};

const SUBMODULOS: SubModulo[] = [
  {
    title: "Exámenes Médicos",
    description: "Exámenes ocupacionales de ingreso, periódicos, egreso y reintegro",
    icon: <UserCheck className="w-7 h-7" />,
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    href: "/dashboard/medicina-laboral/examenes",
    status: "active",
  },
  {
    title: "Seguimientos Médicos",
    description: "Seguimientos, restricciones médicas y controles periódicos",
    icon: <Activity className="w-7 h-7" />,
    color: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    href: "/dashboard/medicina-laboral/seguimientos",
    status: "active",
  },
  {
    title: "Incapacidades",
    description: "Registro de incapacidades médicas y licencias",
    icon: <FileText className="w-7 h-7" />,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    href: "/dashboard/medicina-laboral/incapacidades",
    status: "active",
  },
  {
    title: "Reubicaciones Laborales",
    description: "Reubicaciones temporales, definitivas y rehabilitaciones",
    icon: <Briefcase className="w-7 h-7" />,
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
    href: "/dashboard/medicina-laboral/reubicaciones",
    status: "active",
  },
  {
    title: "Enfermedades Laborales",
    description: "Enfermedades en calificación y reconocidas por ARL",
    icon: <Heart className="w-7 h-7" />,
    color: "from-red-500/20 to-rose-500/20 border-red-500/30",
    href: "/dashboard/medicina-laboral/enfermedades-laborales",
    status: "active",
  },
];

export default function MedicinaLaboralPage() {
  const router = useRouter();
  const [hoy] = useState(hoyColombia);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));

  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodo = useMemo(() => rangoDelMes(anio, mes), [anio, mes]);

  const cargarIndicadores = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/medicina-laboral/indicadores?desde=${periodo.desde}&hasta=${periodo.hasta}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudieron cargar los indicadores");
      }
      setIndicadores(json.data.indicadores as Indicadores);
    } catch (e) {
      console.error("[medicina-laboral] cargar indicadores:", e);
      setError(e instanceof Error ? e.message : "Error inesperado");
      setIndicadores(null);
    } finally {
      setCargando(false);
    }
  }, [periodo]);

  useEffect(() => {
    cargarIndicadores();
  }, [cargarIndicadores]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10
                     backdrop-blur-sm border border-white/10 transition-all
                     text-white/70 hover:text-white text-sm inline-flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al dashboard
        </button>

        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl
                        rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-3">
                Medicina Laboral
              </h1>
              <p className="text-white/70 text-lg max-w-2xl">
                Gestión integral de salud ocupacional: exámenes médicos, seguimientos,
                incapacidades, reubicaciones y enfermedades laborales.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-sm border border-green-500/30">
                  Estándar 3.1.6
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm border border-blue-500/30">
                  Resolución 2346/2007
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm border border-purple-500/30">
                  Resolución 1918/2009
                </span>
              </div>
            </div>
            <TrendingUp className="w-16 h-16 text-white/20 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* KPIs del periodo */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-white">
            Indicadores del Informe Mensual
          </h2>
          <SelectorPeriodo anio={anio} mes={mes} setAnio={setAnio} setMes={setMes} />
        </div>

        {cargando && (
          <div className="flex items-center gap-3 py-10 text-white/60 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Calculando indicadores…
          </div>
        )}

        {!cargando && error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        {!cargando && !error && indicadores && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPI
              label="Días incap. enf. general"
              value={indicadores.diasIncapacidadEnfermedadGeneral}
              color="amber"
            />
            <KPI
              label="EL en proceso"
              value={indicadores.enfermedadesLaboralesEnProceso}
              color="orange"
            />
            <KPI
              label="EL reconocidas"
              value={indicadores.enfermedadesLaboralesReconocidas}
              color="red"
            />
            <KPI
              label="Reub. temporales"
              value={indicadores.trabajadoresReubicadosTemporales}
              color="purple"
            />
            <KPI
              label="Reub. definitivas"
              value={indicadores.trabajadoresReubicadosDefinitivos}
              color="pink"
            />
            <KPI
              label="Rehabilitados"
              value={indicadores.trabajadoresRehabilitados}
              color="green"
            />
          </div>
        )}
      </div>

      {/* Submódulos */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold text-white mb-4">
          Gestión de Medicina Laboral
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUBMODULOS.map((modulo) => (
            <ModuleCard key={modulo.title} {...modulo} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Componentes ───────────────────────────────────────────

function ModuleCard({ title, description, icon, color, href, status }: SubModulo) {
  const router = useRouter();

  return (
    <button
      onClick={() => status === "active" && router.push(href)}
      disabled={status === "soon"}
      className={`
        group relative overflow-hidden rounded-2xl p-6 text-left
        bg-gradient-to-br ${color}
        backdrop-blur-xl border transition-all duration-300
        ${
          status === "active"
            ? "hover:scale-105 hover:shadow-2xl cursor-pointer"
            : "opacity-60 cursor-not-allowed"
        }
      `}
    >
      <div className="relative z-10">
        <div className="mb-4 text-white/90">{icon}</div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-white/70 text-sm mb-4">{description}</p>

        {status === "soon" && (
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs border border-white/20">
            Próximamente
          </span>
        )}

        {status === "active" && (
          <span className="inline-flex items-center text-white/80 text-sm group-hover:text-white transition-colors">
            Abrir módulo
            <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </span>
        )}
      </div>
    </button>
  );
}

type KPIProps = {
  label: string;
  value: number;
  color: "amber" | "orange" | "red" | "purple" | "pink" | "green";
};

function KPI({ label, value, color }: KPIProps) {
  const colorClasses = {
    amber: "from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-300",
    orange: "from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-300",
    red: "from-red-500/20 to-rose-500/20 border-red-500/30 text-red-300",
    purple: "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300",
    pink: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-300",
    green: "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300",
  };

  return (
    <div
      className={`
        bg-gradient-to-br ${colorClasses[color]}
        backdrop-blur-xl rounded-xl p-4 border
      `}
    >
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-white/70">{label}</div>
    </div>
  );
}
