"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Heart,
  Activity,
  Users,
  Target,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Shield,
  ChevronLeft,
} from "lucide-react";

type SectionKey = "intro" | "diagnostico" | "programa" | "actividades" | "cronograma";

const sections: Record<SectionKey, { title: string; icon: typeof Heart; color: string }> = {
  intro: {
    title: "Cuidando Juntos Nuestra Salud",
    icon: Heart,
    color: "from-cyan-400 to-blue-600",
  },
  diagnostico: {
    title: "Diagnóstico de Salud",
    icon: Activity,
    color: "from-blue-500 to-indigo-600",
  },
  programa: {
    title: "Programa de Vigilancia",
    icon: Shield,
    color: "from-indigo-500 to-purple-600",
  },
  actividades: {
    title: "Actividades de Promoción",
    icon: Sparkles,
    color: "from-green-400 to-emerald-600",
  },
  cronograma: {
    title: "Cronograma 2025",
    icon: Calendar,
    color: "from-purple-500 to-pink-600",
  },
};

export default function PVEPage() {
  const [selectedSection, setSelectedSection] = useState<SectionKey>("intro");
  const router = useRouter();

  return (
    <div className="min-h-screen relative">
      {/* Background image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/20032025-DSC_3717.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          quality={85}
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <Image src="/logo.png" alt="Sirius" width={240} height={64} className="h-16 w-auto" priority />
              <div className="hidden sm:block h-8 w-px bg-white/20" />
              <p className="hidden sm:block text-sm font-semibold text-white/70 tracking-wide uppercase">
                PVE Osteomuscular
              </p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              Volver al Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Title card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2" style={{ textShadow: "0 2px 15px rgba(0,0,0,0.4)" }}>
                Programa de Vigilancia Epidemiológica
              </h1>
              <p className="text-white/60 text-lg">Osteomuscular 2025 — SIRIUS Regenerative Solutions</p>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="text-cyan-400" size={32} />
              <Heart className="text-green-400 animate-pulse" size={32} />
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-green-400 rounded-full" />
        </div>

        {/* Navigation Pills */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-4 mb-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {(Object.entries(sections) as [SectionKey, (typeof sections)[SectionKey]][]).map(([key, section]) => {
              const Icon = section.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedSection(key)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 cursor-pointer ${
                    selectedSection === key
                      ? `bg-gradient-to-r ${section.color} text-white shadow-lg`
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/10"
                  }`}
                >
                  <Icon size={20} />
                  {section.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div>
          {selectedSection === "intro" && <IntroSection />}
          {selectedSection === "diagnostico" && <DiagnosticoSection />}
          {selectedSection === "programa" && <ProgramaSection />}
          {selectedSection === "actividades" && <ActividadesSection />}
          {selectedSection === "cronograma" && <CronogramaSection />}
        </div>
      </main>
    </div>
  );
}

/* ─── Glass card helper ─── */
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-8 ${className}`}>
    {children}
  </div>
);

const GlassCardSmall = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-6 ${className}`}>
    {children}
  </div>
);

const StatCard = ({ value, label, color = "text-cyan-400" }: { value: string; label: string; color?: string }) => (
  <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-4 shadow-md">
    <div className={`text-3xl font-bold ${color} mb-2`}>{value}</div>
    <p className="text-white/60 text-sm">{label}</p>
  </div>
);

/* ─── SECTIONS ─── */

const IntroSection = () => (
  <div className="grid md:grid-cols-2 gap-6">
    <div className="bg-gradient-to-br from-cyan-500/80 to-blue-600/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 text-white border border-white/15">
      <Heart className="mb-4 animate-pulse" size={48} />
      <h2 className="text-3xl font-bold mb-4">Nuestra Misión</h2>
      <p className="text-lg leading-relaxed mb-6">
        En SIRIUS, regeneramos no solo el ambiente, sino también la salud de nuestro equipo. Este programa nace del amor
        y compromiso con tu bienestar integral.
      </p>
      <div className="bg-white/20 rounded-xl p-4">
        <p className="italic text-white/90">
          &ldquo;Cuidar la salud de nuestro equipo es regenerar desde adentro&rdquo;
        </p>
      </div>
    </div>

    <GlassCard>
      <h3 className="font-bold text-2xl mb-6 text-white flex items-center gap-2">
        <Users className="text-cyan-400" />
        Equipo SIRIUS - 18 Personas
      </h3>
      <div className="space-y-4">
        <div className="bg-white/10 rounded-xl p-4 border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-white/80">Administrativos</span>
            <span className="bg-blue-500/30 text-blue-300 px-3 py-1 rounded-full text-sm font-bold">13</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <div className="bg-gradient-to-r from-blue-400 to-cyan-400 h-3 rounded-full" style={{ width: "72%" }} />
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-4 border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-white/80">Auxiliares Operativos</span>
            <span className="bg-green-500/30 text-green-300 px-3 py-1 rounded-full text-sm font-bold">5</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <div className="bg-gradient-to-r from-green-400 to-emerald-400 h-3 rounded-full" style={{ width: "28%" }} />
          </div>
        </div>
      </div>
    </GlassCard>

    <GlassCard>
      <h3 className="font-bold text-2xl mb-6 text-white flex items-center gap-2">
        <Target className="text-purple-400" />
        Perfil del Equipo
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <StatCard value="18-50" label="Rango de edad en años" color="text-blue-400" />
        <StatCard value="47%" label="Mujeres en el equipo" color="text-pink-400" />
        <StatCard value="53%" label="Hombres en el equipo" color="text-cyan-400" />
        <StatCard value="5" label="Trabajan en campo activo" color="text-green-400" />
      </div>
    </GlassCard>

    <GlassCard>
      <h3 className="font-bold text-2xl mb-4 text-white flex items-center gap-2">
        <AlertCircle className="text-amber-400" />
        Enfoque Principal
      </h3>
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-6 border border-amber-500/30">
        <h4 className="text-2xl font-bold text-amber-400 mb-3">Riesgo Biomecánico Osteomuscular</h4>
        <p className="text-white/70 leading-relaxed">
          Nuestro diagnóstico identifica que el equipo está expuesto a posturas prolongadas, movimientos repetitivos y
          manipulación manual de cargas, especialmente en labores de campo de regeneración ambiental.
        </p>
      </div>
    </GlassCard>
  </div>
);

const DiagnosticoSection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-blue-500/80 to-indigo-600/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 text-white border border-white/15">
      <Activity className="mb-4" size={48} />
      <h2 className="text-3xl font-bold mb-4">Diagnóstico de Condiciones de Salud 2025</h2>
      <p className="text-xl opacity-90">Basado en exámenes médicos ocupacionales y análisis de riesgo</p>
    </div>

    <div className="grid md:grid-cols-3 gap-6">
      <GlassCardSmall>
        <div className="text-5xl font-bold text-cyan-400 mb-3">83.33%</div>
        <p className="text-white/70 text-lg">Recomendación con Énfasis Osteomuscular</p>
        <div className="mt-3 bg-cyan-500/20 rounded-lg p-3 border border-cyan-500/30">
          <p className="text-cyan-300 text-sm">15 de 18 trabajadores requieren vigilancia especial</p>
        </div>
      </GlassCardSmall>

      <GlassCardSmall>
        <div className="text-5xl font-bold text-green-400 mb-3">94.44%</div>
        <p className="text-white/70 text-lg">Requieren EPP Específico</p>
        <div className="mt-3 bg-green-500/20 rounded-lg p-3 border border-green-500/30">
          <p className="text-green-300 text-sm">17 de 18 necesitan protección ergonómica</p>
        </div>
      </GlassCardSmall>

      <GlassCardSmall>
        <div className="text-5xl font-bold text-purple-400 mb-3">100%</div>
        <p className="text-white/70 text-lg">Cobertura del Programa</p>
        <div className="mt-3 bg-purple-500/20 rounded-lg p-3 border border-purple-500/30">
          <p className="text-purple-300 text-sm">Todos los 18 trabajadores incluidos</p>
        </div>
      </GlassCardSmall>
    </div>

    <GlassCard>
      <h3 className="font-bold text-2xl mb-6 text-white flex items-center gap-2">
        <TrendingUp className="text-red-400" />
        Factores de Riesgo Identificados
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { label: "Posturas prolongadas (sentado/de pie)", pct: "89%", color: "from-red-400 to-rose-400" },
          { label: "Movimientos repetitivos (digitación/campo)", pct: "72%", color: "from-orange-400 to-amber-400" },
          { label: "Manipulación manual de cargas", pct: "28%", color: "from-yellow-400 to-orange-400" },
          { label: "Posturas forzadas en campo", pct: "28%", color: "from-blue-400 to-cyan-400" },
        ].map((risk) => (
          <div key={risk.label} className="bg-white/10 rounded-xl p-4 border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-white/80">{risk.label}</span>
              <span className="font-bold text-white">{risk.pct}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div className={`bg-gradient-to-r ${risk.color} h-3 rounded-full`} style={{ width: risk.pct }} />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>

    <GlassCard>
      <h3 className="font-bold text-2xl mb-6 text-white flex items-center gap-2">
        <CheckCircle className="text-green-400" />
        Hallazgos Positivos
      </h3>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-green-500/20 rounded-xl p-5 text-center border border-green-500/30">
          <div className="text-3xl font-bold text-green-400 mb-2">0</div>
          <p className="text-white/70 font-semibold">Enfermedades laborales diagnosticadas</p>
        </div>
        <div className="bg-blue-500/20 rounded-xl p-5 text-center border border-blue-500/30">
          <div className="text-3xl font-bold text-blue-400 mb-2">100%</div>
          <p className="text-white/70 font-semibold">Aptos para trabajar</p>
        </div>
        <div className="bg-purple-500/20 rounded-xl p-5 text-center border border-purple-500/30">
          <div className="text-3xl font-bold text-purple-400 mb-2">Bajo</div>
          <p className="text-white/70 font-semibold">Nivel de ausentismo actual</p>
        </div>
      </div>
    </GlassCard>
  </div>
);

const ProgramaSection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-indigo-500/80 to-purple-600/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 text-white border border-white/15">
      <Shield className="mb-4" size={48} />
      <h2 className="text-3xl font-bold mb-4">Programa de Vigilancia Epidemiológica</h2>
      <p className="text-xl opacity-90">Sistema integral de prevención y control del riesgo osteomuscular</p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <GlassCard>
        <h3 className="font-bold text-2xl mb-4 text-white flex items-center gap-2">
          <Target className="text-blue-400" />
          Objetivo General
        </h3>
        <p className="text-white/70 text-lg leading-relaxed">
          Prevenir y controlar los desórdenes musculoesqueléticos en los trabajadores de SIRIUS mediante la
          identificación temprana, intervención oportuna y seguimiento continuo de factores de riesgo biomecánico.
        </p>
      </GlassCard>

      <GlassCard>
        <h3 className="font-bold text-2xl mb-4 text-white flex items-center gap-2">
          <ArrowRight className="text-green-400" />
          Objetivos Específicos
        </h3>
        <ul className="space-y-3 text-white/70">
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-400 mt-1 flex-shrink-0" size={18} />
            <span>Identificar precozmente síntomas osteomusculares</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-400 mt-1 flex-shrink-0" size={18} />
            <span>Implementar medidas de intervención ergonómica</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-400 mt-1 flex-shrink-0" size={18} />
            <span>Reducir la incidencia de patologías osteomusculares</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-400 mt-1 flex-shrink-0" size={18} />
            <span>Fomentar cultura de autocuidado y prevención</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-green-400 mt-1 flex-shrink-0" size={18} />
            <span>Cumplir normatividad vigente (Res. 0312/2019)</span>
          </li>
        </ul>
      </GlassCard>
    </div>

    <GlassCard>
      <h3 className="font-bold text-2xl mb-6 text-white">Componentes del Programa</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border-l-4 border-blue-400 bg-blue-500/10 rounded-r-xl p-6">
          <h4 className="font-bold text-xl mb-3 text-blue-300">1. Vigilancia Epidemiológica</h4>
          <ul className="space-y-2 text-white/70">
            <li>• Evaluaciones médicas ocupacionales periódicas (cada 12 meses)</li>
            <li>• Encuestas de síntomas osteomusculares (cuatrimestral)</li>
            <li>• Inspecciones ergonómicas de puestos de trabajo</li>
            <li>• Análisis de tareas críticas con metodología REBA/RULA</li>
          </ul>
        </div>

        <div className="border-l-4 border-green-400 bg-green-500/10 rounded-r-xl p-6">
          <h4 className="font-bold text-xl mb-3 text-green-300">2. Intervención y Control</h4>
          <ul className="space-y-2 text-white/70">
            <li>• Pausas activas dirigidas (2 veces por jornada - 10 minutos)</li>
            <li>• Escuela de espalda y mecánica corporal (mensual)</li>
            <li>• Ajustes ergonómicos en estaciones de trabajo</li>
            <li>• Rotación de tareas para reducir exposición</li>
            <li>• Suministro y capacitación en uso de EPP ergonómico</li>
          </ul>
        </div>

        <div className="border-l-4 border-purple-400 bg-purple-500/10 rounded-r-xl p-6">
          <h4 className="font-bold text-xl mb-3 text-purple-300">3. Capacitación y Sensibilización</h4>
          <ul className="space-y-2 text-white/70">
            <li>• Inducción y reinducción en riesgo biomecánico</li>
            <li>• Talleres de higiene postural (trimestral)</li>
            <li>• Técnicas de levantamiento seguro de cargas</li>
            <li>• Autocuidado y señales de alerta temprana</li>
            <li>• Ejercicios de fortalecimiento y estiramiento</li>
          </ul>
        </div>

        <div className="border-l-4 border-orange-400 bg-orange-500/10 rounded-r-xl p-6">
          <h4 className="font-bold text-xl mb-3 text-orange-300">4. Seguimiento y Mejora</h4>
          <ul className="space-y-2 text-white/70">
            <li>• Indicadores de ausentismo y morbilidad osteomuscular</li>
            <li>• Comité de seguimiento mensual</li>
            <li>• Auditorías de cumplimiento de medidas preventivas</li>
            <li>• Actualización continua según hallazgos</li>
            <li>• Retroalimentación participativa del equipo</li>
          </ul>
        </div>
      </div>
    </GlassCard>

    <GlassCard>
      <h3 className="font-bold text-2xl mb-4 text-white flex items-center gap-2">
        <Users className="text-cyan-400" />
        Población Objetivo
      </h3>
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard value="100%" label="De los trabajadores participarán en el programa" color="text-blue-400" />
        <StatCard value="15" label="Trabajadores con énfasis osteomuscular (prioritarios)" color="text-green-400" />
        <StatCard value="5" label="Auxiliares operativos (mayor exposición)" color="text-purple-400" />
      </div>
    </GlassCard>
  </div>
);

const ActividadesSection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-green-500/80 to-emerald-600/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 text-white border border-white/15">
      <Sparkles className="mb-4" size={48} />
      <h2 className="text-3xl font-bold mb-4">Actividades de Promoción y Prevención</h2>
      <p className="text-xl opacity-90">&ldquo;Pequeñas acciones, grandes cambios&rdquo;</p>
    </div>

    <div className="grid gap-6">
      {/* Nivel Individual */}
      <GlassCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-500/20 rounded-full p-3 border border-blue-500/30">
            <Heart className="text-blue-400" size={32} />
          </div>
          <h3 className="font-bold text-2xl text-white">Nivel Individual - Tu Bienestar</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <GlassCardSmall className="border-l-4 border-l-blue-400">
            <h4 className="font-semibold text-lg mb-3 text-white">🧘 Pausas Activas Inteligentes</h4>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• <strong className="text-white/90">Frecuencia:</strong> 2 veces por jornada (10:00 AM y 3:00 PM)</li>
              <li>• <strong className="text-white/90">Duración:</strong> 10 minutos guiados</li>
              <li>• <strong className="text-white/90">Contenido:</strong> Estiramientos cervicales, lumbares, extremidades</li>
              <li>• <strong className="text-white/90">Líder rotativo:</strong> Cada semana un compañero diferente</li>
              <li>• <strong className="text-white/90">Música motivacional:</strong> Ambiente relajante</li>
            </ul>
          </GlassCardSmall>

          <GlassCardSmall className="border-l-4 border-l-green-400">
            <h4 className="font-semibold text-lg mb-3 text-white">💪 Fortalecimiento Personal</h4>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• <strong className="text-white/90">Ejercicios Core:</strong> Rutina de 5 minutos diarios</li>
              <li>• <strong className="text-white/90">Estiramiento matutino:</strong> Antes de iniciar labores</li>
              <li>• <strong className="text-white/90">Hidratación consciente:</strong> Recordatorios cada 2 horas</li>
              <li>• <strong className="text-white/90">Postura mindfulness:</strong> Automonitoreo postural</li>
              <li>• <strong className="text-white/90">App SIRIUS Wellness:</strong> Seguimiento personalizado</li>
            </ul>
          </GlassCardSmall>

          <GlassCardSmall className="border-l-4 border-l-purple-400">
            <h4 className="font-semibold text-lg mb-3 text-white">🎯 Autocuidado Consciente</h4>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• <strong className="text-white/90">Escucha tu cuerpo:</strong> Identificar señales tempranas</li>
              <li>• <strong className="text-white/90">Reporta molestias:</strong> Sin miedo, con confianza</li>
              <li>• <strong className="text-white/90">Descansos de calidad:</strong> Sueño reparador (7-8 horas)</li>
              <li>• <strong className="text-white/90">Nutrición balanceada:</strong> Alimentación antiinflamatoria</li>
              <li>• <strong className="text-white/90">Gestión del estrés:</strong> Técnicas de respiración</li>
            </ul>
          </GlassCardSmall>

          <GlassCardSmall className="border-l-4 border-l-amber-400">
            <h4 className="font-semibold text-lg mb-3 text-white">📱 Herramientas Digitales</h4>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• <strong className="text-white/90">Videos educativos:</strong> Biblioteca digital de ejercicios</li>
              <li>• <strong className="text-white/90">Recordatorios inteligentes:</strong> Notificaciones de pausas</li>
              <li>• <strong className="text-white/90">Consulta virtual:</strong> Asesoría de fisioterapia online</li>
              <li>• <strong className="text-white/90">Registro de síntomas:</strong> App de seguimiento</li>
              <li>• <strong className="text-white/90">Retos mensuales:</strong> Gamificación del bienestar</li>
            </ul>
          </GlassCardSmall>
        </div>
      </GlassCard>

      {/* Nivel Grupal */}
      <GlassCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-500/20 rounded-full p-3 border border-green-500/30">
            <Users className="text-green-400" size={32} />
          </div>
          <h3 className="font-bold text-2xl text-white">Nivel Grupal - Juntos Somos Más Fuertes</h3>
        </div>

        <div className="space-y-4">
          <GlassCardSmall>
            <h4 className="font-semibold text-xl mb-4 text-white">🏫 Escuela de Espalda SIRIUS</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                <div className="font-bold text-green-400 mb-2">Módulo 1</div>
                <p className="text-sm text-white/70"><strong className="text-white/90">Anatomía Básica:</strong> Conoce tu columna vertebral</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                <div className="font-bold text-green-400 mb-2">Módulo 2</div>
                <p className="text-sm text-white/70"><strong className="text-white/90">Higiene Postural:</strong> Posturas en el trabajo y hogar</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                <div className="font-bold text-green-400 mb-2">Módulo 3</div>
                <p className="text-sm text-white/70"><strong className="text-white/90">Levantamiento Seguro:</strong> Técnicas de manipulación</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/50 italic">📅 Frecuencia: Mensual | ⏱️ Duración: 2 horas | 👥 Presencial + Virtual</p>
          </GlassCardSmall>

          <GlassCardSmall>
            <h4 className="font-semibold text-xl mb-4 text-white">🎪 Ferias y Eventos de Salud</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {[
                  { n: "1", title: "Día del Bienestar (Trimestral)", desc: "Evaluaciones, masajes, actividades recreativas" },
                  { n: "2", title: "Semana de la Salud Osteomuscular", desc: "Charlas, demostraciones, concursos" },
                ].map((e) => (
                  <div key={e.n} className="flex items-start gap-3">
                    <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">{e.n}</div>
                    <div>
                      <p className="font-semibold text-white">{e.title}</p>
                      <p className="text-sm text-white/60">{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[
                  { n: "3", title: "Desafío SIRIUS Activo", desc: "Competencia amistosa de actividad física" },
                  { n: "4", title: "Encuentros de Estiramiento", desc: "Sesiones grupales cada viernes" },
                ].map((e) => (
                  <div key={e.n} className="flex items-start gap-3">
                    <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">{e.n}</div>
                    <div>
                      <p className="font-semibold text-white">{e.title}</p>
                      <p className="text-sm text-white/60">{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCardSmall>

          <GlassCardSmall>
            <h4 className="font-semibold text-xl mb-4 text-white">🎓 Capacitaciones Especializadas</h4>
            <div className="grid md:grid-cols-4 gap-3">
              {["🪑 Ergonomía en Oficina", "🌾 Trabajo en Campo", "📦 Manejo de Cargas", "🧠 Mindfulness Laboral"].map((c) => (
                <div key={c} className="bg-white/10 rounded-lg p-3 border border-white/10 text-center">
                  <div className="text-2xl mb-2">{c.split(" ")[0]}</div>
                  <p className="text-sm font-semibold text-white/70">{c.split(" ").slice(1).join(" ")}</p>
                </div>
              ))}
            </div>
          </GlassCardSmall>
        </div>
      </GlassCard>

      {/* Nivel Organizacional */}
      <GlassCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-500/20 rounded-full p-3 border border-purple-500/30">
            <Shield className="text-purple-400" size={32} />
          </div>
          <h3 className="font-bold text-2xl text-white">Nivel Organizacional - Compromiso Institucional</h3>
        </div>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <GlassCardSmall className="border-l-4 border-l-purple-400">
              <h4 className="font-semibold text-lg mb-3 text-white">🏗️ Mejoras Ergonómicas</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>✓ Sillas ergonómicas ajustables</li>
                <li>✓ Apoyapiés y apoyamuñecas</li>
                <li>✓ Monitores a altura adecuada</li>
                <li>✓ Iluminación apropiada</li>
                <li>✓ Herramientas de campo ergonómicas</li>
                <li>✓ Superficies de trabajo ajustables</li>
              </ul>
            </GlassCardSmall>

            <GlassCardSmall className="border-l-4 border-l-cyan-400">
              <h4 className="font-semibold text-lg mb-3 text-white">📋 Políticas de Salud</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>✓ Política de pausas obligatorias</li>
                <li>✓ Rotación de tareas pesadas</li>
                <li>✓ Límites de carga manual (25 kg máx)</li>
                <li>✓ Derecho a reportar molestias</li>
                <li>✓ Evaluaciones periódicas garantizadas</li>
                <li>✓ Tiempo para ejercicios preventivos</li>
              </ul>
            </GlassCardSmall>
          </div>

          <GlassCardSmall>
            <h4 className="font-semibold text-xl mb-4 text-white flex items-center gap-2">
              <Sparkles className="text-green-400" />
              Programa de Incentivos &ldquo;SIRIUS Saludable&rdquo;
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { emoji: "🏆", title: "Empleado del Mes", desc: "Mejor adherencia a pausas activas" },
                { emoji: "🎁", title: "Premios Trimestrales", desc: "Kit de bienestar para equipos destacados" },
                { emoji: "🌟", title: "Reconocimiento Anual", desc: "Certificación en cultura de prevención" },
              ].map((i) => (
                <div key={i.title} className="bg-white/10 rounded-lg p-4 border border-white/10">
                  <div className="text-3xl mb-2">{i.emoji}</div>
                  <p className="font-semibold text-white mb-1">{i.title}</p>
                  <p className="text-xs text-white/60">{i.desc}</p>
                </div>
              ))}
            </div>
          </GlassCardSmall>

          <GlassCardSmall>
            <h4 className="font-semibold text-xl mb-4 text-white">📊 Indicadores de Seguimiento</h4>
            <div className="grid md:grid-cols-4 gap-3">
              <StatCard value="0" label="Lesiones objetivo 2025" color="text-blue-400" />
              <StatCard value="95%" label="Participación en pausas" color="text-green-400" />
              <StatCard value="100%" label="Cobertura capacitación" color="text-purple-400" />
              <StatCard value="↓50%" label="Reducción ausentismo" color="text-orange-400" />
            </div>
          </GlassCardSmall>
        </div>
      </GlassCard>
    </div>

    <div className="bg-gradient-to-r from-pink-500/80 via-rose-500/80 to-red-500/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 text-white border border-white/15">
      <h3 className="font-bold text-2xl mb-4 flex items-center gap-2">
        <Heart className="animate-pulse" />
        Nuestro Compromiso Contigo
      </h3>
      <p className="text-lg leading-relaxed">
        En SIRIUS creemos que un equipo saludable es un equipo feliz y productivo. Cada actividad está diseñada con amor
        y ciencia para que trabajes cómodo, seguro y lleno de energía. Porque regenerar el planeta empieza por cuidar a
        quienes lo hacen posible: ¡TÚ! 🌱✨
      </p>
    </div>
  </div>
);

const CronogramaSection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-orange-500/80 to-pink-600/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 text-white border border-white/15">
      <Calendar className="mb-4" size={48} />
      <h2 className="text-3xl font-bold mb-4">Cronograma de Actividades 2025</h2>
      <p className="text-xl opacity-90">&ldquo;Un año de bienestar planificado&rdquo;</p>
    </div>

    <GlassCard>
      <div className="space-y-6">
        {/* Q1 */}
        <div className="border-l-4 border-blue-400 bg-blue-500/10 rounded-r-xl p-6">
          <h3 className="font-bold text-xl mb-4 text-blue-300 flex items-center gap-2">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Q1</span>
            Enero - Marzo: Inicio y Sensibilización
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                month: "Enero",
                items: ["Lanzamiento del programa", "Inducción general (Semana 2)", "Evaluaciones iniciales", "Configuración de espacios"],
              },
              {
                month: "Febrero",
                items: ["Escuela de espalda - Módulo 1", "Pausas activas diarias inicio", "Inspecciones ergonómicas", "Encuesta de síntomas #1"],
              },
              {
                month: "Marzo",
                items: ["Escuela de espalda - Módulo 2", "Día del Bienestar #1", "Ajustes ergonómicos fase 1", "Comité de seguimiento #1"],
              },
            ].map((q) => (
              <div key={q.month} className="bg-white/10 rounded-lg p-4 border border-white/10">
                <div className="font-semibold text-blue-300 mb-2">📅 {q.month}</div>
                <ul className="text-sm space-y-1 text-white/70">
                  {q.items.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Q2 */}
        <div className="border-l-4 border-green-400 bg-green-500/10 rounded-r-xl p-6">
          <h3 className="font-bold text-xl mb-4 text-green-300 flex items-center gap-2">
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">Q2</span>
            Abril - Junio: Fortalecimiento
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                month: "Abril",
                items: ["Escuela de espalda - Módulo 3", "Capacitación: Trabajo en campo", "Desafío SIRIUS Activo inicia", "Evaluación de indicadores"],
              },
              {
                month: "Mayo",
                items: ["Semana de Salud Osteomuscular", "Encuesta de síntomas #2", "Talleres de mindfulness", "Auditoría de pausas activas"],
              },
              {
                month: "Junio",
                items: ["Día del Bienestar #2", "Revisión médica semestral", "Premiación trimestre 1 y 2", "Comité de seguimiento #2"],
              },
            ].map((q) => (
              <div key={q.month} className="bg-white/10 rounded-lg p-4 border border-white/10">
                <div className="font-semibold text-green-300 mb-2">📅 {q.month}</div>
                <ul className="text-sm space-y-1 text-white/70">
                  {q.items.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Q3 */}
        <div className="border-l-4 border-purple-400 bg-purple-500/10 rounded-r-xl p-6">
          <h3 className="font-bold text-xl mb-4 text-purple-300 flex items-center gap-2">
            <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">Q3</span>
            Julio - Septiembre: Consolidación
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                month: "Julio",
                items: ["Reinducción general", "Capacitación: Ergonomía oficina", "Ajustes ergonómicos fase 2", "Lanzamiento app wellness"],
              },
              {
                month: "Agosto",
                items: ["Escuela de espalda - Repaso", "Encuesta de síntomas #3", "Jornada de masajes relajantes", "Evaluación de adherencia"],
              },
              {
                month: "Septiembre",
                items: ["Día del Bienestar #3", "Desafío SIRIUS Activo #2", "Premiación trimestre 3", "Comité de seguimiento #3"],
              },
            ].map((q) => (
              <div key={q.month} className="bg-white/10 rounded-lg p-4 border border-white/10">
                <div className="font-semibold text-purple-300 mb-2">📅 {q.month}</div>
                <ul className="text-sm space-y-1 text-white/70">
                  {q.items.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Q4 */}
        <div className="border-l-4 border-orange-400 bg-orange-500/10 rounded-r-xl p-6">
          <h3 className="font-bold text-xl mb-4 text-orange-300 flex items-center gap-2">
            <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm">Q4</span>
            Octubre - Diciembre: Cierre y Proyección
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                month: "Octubre",
                items: ["Capacitación: Manejo de cargas", "Inspección ergonómica final", "Encuesta de satisfacción", "Preparación informe anual"],
              },
              {
                month: "Noviembre",
                items: ["Evaluaciones médicas finales", "Encuesta de síntomas #4", "Análisis de indicadores año", "Comité de seguimiento #4"],
              },
              {
                month: "Diciembre",
                items: ["Día del Bienestar #4 (cierre)", "Reconocimientos anuales", "Presentación resultados 2025", "Planeación programa 2026"],
              },
            ].map((q) => (
              <div key={q.month} className="bg-white/10 rounded-lg p-4 border border-white/10">
                <div className="font-semibold text-orange-300 mb-2">📅 {q.month}</div>
                <ul className="text-sm space-y-1 text-white/70">
                  {q.items.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>

    {/* Actividades Permanentes */}
    <GlassCard className="border-2 border-cyan-500/30">
      <h3 className="font-bold text-2xl mb-6 text-white">🔄 Actividades Permanentes (Todo el Año)</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-lg mb-3 text-cyan-400">Diarias</h4>
          <ul className="space-y-2">
            {["Pausas activas (10:00 AM y 3:00 PM)", "Recordatorios de hidratación", "Monitoreo postural"].map((a) => (
              <li key={a} className="flex items-center gap-2 text-white/70">
                <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-lg mb-3 text-blue-400">Semanales</h4>
          <ul className="space-y-2">
            {["Encuentros de estiramiento (viernes)", "Cápsulas educativas digitales", "Reporte de síntomas (opcional)"].map((a) => (
              <li key={a} className="flex items-center gap-2 text-white/70">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GlassCard>

    {/* Responsables */}
    <GlassCard>
      <h3 className="font-bold text-2xl mb-6 text-white">👥 Equipo Responsable</h3>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { emoji: "👨‍⚕️", role: "Médico Ocupacional", desc: "Coordinación general" },
          { emoji: "💼", role: "Coordinador SST", desc: "Seguimiento y control" },
          { emoji: "🤝", role: "Líderes de Área", desc: "Implementación" },
          { emoji: "⭐", role: "Todos Nosotros", desc: "Participación activa" },
        ].map((r) => (
          <div key={r.role} className="text-center p-4 bg-white/10 rounded-xl border border-white/10">
            <div className="text-4xl mb-2">{r.emoji}</div>
            <div className="font-semibold text-white">{r.role}</div>
            <div className="text-sm text-white/60">{r.desc}</div>
          </div>
        ))}
      </div>
    </GlassCard>

    <div className="bg-gradient-to-r from-green-500/80 via-emerald-500/80 to-teal-500/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 text-white text-center border border-white/15">
      <Sparkles className="mx-auto mb-4" size={48} />
      <h3 className="font-bold text-3xl mb-4">¡Juntos Hacemos la Diferencia!</h3>
      <p className="text-xl leading-relaxed max-w-3xl mx-auto">
        Este cronograma es nuestra hoja de ruta hacia un 2025 más saludable. Cada actividad es una oportunidad para
        cuidarnos, aprender y crecer juntos. En SIRIUS, regeneramos el planeta con cuerpos sanos y corazones felices.
        🌱💚✨
      </p>
    </div>
  </div>
);
