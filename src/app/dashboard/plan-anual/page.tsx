"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  CheckSquare,
  Target,
  TrendingUp,
  Users,
  Activity,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
} from "lucide-react";

type CicloKey = "planear" | "hacer" | "verificar" | "actuar";

interface ActivityItem {
  id: string;
  name: string;
  entregable: string;
  responsable: string;
  meses: string[];
  recursos: { humanos: string; financieros: string; tecnologicos: string };
  detalles?: string[];
}

interface Ciclo {
  name: string;
  color: string;
  icon: typeof Target;
  activities: ActivityItem[];
}

const ciclos: Record<CicloKey, Ciclo> = {
  planear: {
    name: "PLANEAR",
    color: "from-blue-500 to-cyan-600",
    icon: Target,
    activities: [
      { id: "1.1.2", name: "Asignación de Responsabilidades en el SG-SST", entregable: "Documento formal de asignación de responsabilidades específicas en SST", responsable: "Gerencia y Responsable SST", meses: ["ENE"], recursos: { humanos: "Gerencia, Resp. SST", financieros: "$500.000", tecnologicos: "Sistema documental" } },
      { id: "1.1.3", name: "Asignación de Recursos para el SG-SST", entregable: "Documento de asignación de recursos humanos, técnicos y financieros", responsable: "Gerencia y Responsable SST", meses: ["ENE"], recursos: { humanos: "Gerencia, Contador", financieros: "$2.000.000", tecnologicos: "Software contable" } },
      { id: "1.1.6", name: "Conformación COPASST / Vigía", entregable: "Actas de reunión periódicas del COPASST", responsable: "Responsable SST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Miembros COPASST", financieros: "$1.200.000", tecnologicos: "Plataforma virtual" } },
      { id: "1.1.7", name: "Capacitación COPASST", entregable: "Registros de capacitación de integrantes del COPASST", responsable: "Responsable SST", meses: ["MAR"], recursos: { humanos: "Capacitador ARL", financieros: "$800.000", tecnologicos: "Material didáctico" } },
      { id: "1.1.8", name: "Conformación Comité de Convivencia Laboral", entregable: "Registros de funcionamiento conforme a Resolución 3461 de 2025", responsable: "Responsable SST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Miembros CCL", financieros: "$600.000", tecnologicos: "Buzón sugerencias" } },
      { id: "1.2.1", name: "Programa Capacitación Promoción y Prevención - PyP", entregable: "Programa anual de capacitación en SST para 2026", responsable: "Responsable SST, GERENCIA Y COPASST", meses: ["ENE"], recursos: { humanos: "Equipo SST", financieros: "$3.500.000", tecnologicos: "Plataforma e-learning" } },
      { id: "1.2.2", name: "Inducción y Reinducción en SG-SST", entregable: "Registros de inducción y reinducción en SST", responsable: "Responsable SST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Todos los trabajadores", financieros: "$1.500.000", tecnologicos: "Videos, presentaciones" } },
      { id: "1.2.3", name: "Responsables del SG-SST con Curso Virtual 50 Horas", entregable: "Certificados de capacitación virtual de 50 horas", responsable: "Responsable SST y Gerencia", meses: ["ENE"], recursos: { humanos: "Responsable SST, Gerente", financieros: "$600.000", tecnologicos: "Curso virtual ARL" } },
      { id: "2.1.1", name: "Política del SG-SST Firmada y Comunicada", entregable: "Política firmada, fechada, comunicada y revisada anualmente", responsable: "Responsable SST y Gerencia", meses: ["ENE"], recursos: { humanos: "Gerencia, Resp. SST", financieros: "$300.000", tecnologicos: "Carteleras, correos" } },
      { id: "2.3.1", name: "Autoevaluación Estándares Mínimos SG-SST", entregable: "Autoevaluación vigencia 2025 conforme Resolución 0312 de 2019", responsable: "Responsable SST", meses: ["ENE"], recursos: { humanos: "Responsable SST", financieros: "$400.000", tecnologicos: "Sistema de evaluación" } },
      { id: "2.4.1", name: "Plan Anual de Trabajo SG-SST 2026", entregable: "Plan que identifica objetivos, metas, responsables, recursos y cronograma", responsable: "Responsable SST, Gerencia", meses: ["ENE"], recursos: { humanos: "Equipo directivo", financieros: "$500.000", tecnologicos: "Software de gestión" } },
      { id: "2.6.1", name: "Rendición de Cuentas sobre el Desempeño", entregable: "Registros de rendición de cuentas anual por la alta dirección", responsable: "Responsable SST", meses: ["DIC"], recursos: { humanos: "Gerencia, todos", financieros: "$400.000", tecnologicos: "Presentación, informe" } },
      { id: "2.11.1", name: "Gestión del Cambio", entregable: "Procedimiento para identificación y evaluación de cambios", responsable: "Responsable SST y Gerencia", meses: ["FEB"], recursos: { humanos: "Líderes de área", financieros: "$300.000", tecnologicos: "Formato de gestión" } },
    ],
  },
  hacer: {
    name: "HACER",
    color: "from-green-500 to-emerald-600",
    icon: Activity,
    activities: [
      { id: "3.1.1", name: "Descripción Sociodemográfica y Diagnóstico de Condiciones de Salud", entregable: "Base de datos sociodemográfica y diagnóstico de condiciones de salud 2026", responsable: "Responsable SST y Médico Ocupacional", meses: ["ENE"], recursos: { humanos: "Médico ocupacional", financieros: "$1.200.000", tecnologicos: "Sistema de información" } },
      { id: "3.1.2", name: "Actividades de Promoción y Prevención en Salud", entregable: "Registros de actividades de PyP realizadas según riesgos identificados", responsable: "Responsable SST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Todos los trabajadores", financieros: "$4.500.000", tecnologicos: "Material educativo" }, detalles: ["Pausas activas diarias (10:00 AM y 3:00 PM)", "Escuela de espalda (mensual)", "Día del Bienestar (trimestral)", "Semana de Salud Osteomuscular (mayo)", "Capacitaciones ergonómicas", "Programa de estilos de vida saludable"] },
      { id: "3.1.3", name: "Información al Médico de los Perfiles de Cargo", entregable: "Perfiles de cargo actualizados firmados por médico, SST y gerencia", responsable: "Responsable SST y Médico Ocupacional", meses: ["FEB"], recursos: { humanos: "Médico, RRHH", financieros: "$500.000", tecnologicos: "Sistema documental" } },
      { id: "3.1.4", name: "Realización de Exámenes Médicos Ocupacionales", entregable: "Gestión de exámenes de ingreso, periódicos y egreso", responsable: "Médico Ocupacional, Gerencia y Responsable SST", meses: ["ENE", "MAR", "MAY", "JUL", "SEP", "NOV"], recursos: { humanos: "Médico ocupacional", financieros: "$3.600.000", tecnologicos: "IPS habilitada" } },
      { id: "3.1.5", name: "Custodia de Historias Clínicas", entregable: "Verificación de custodia, confidencialidad y conservación de HC", responsable: "Responsable SST y Médico Ocupacional", meses: ["ENE"], recursos: { humanos: "IPS prestadora", financieros: "$400.000", tecnologicos: "Archivo seguro" } },
      { id: "3.1.7", name: "Estilos de Vida y Entornos Saludables", entregable: "Implementación de actividades de estilos de vida saludables", responsable: "Responsable SST", meses: ["ENE", "MAR", "JUN", "SEP", "DIC"], recursos: { humanos: "Nutricionista, psicólogo", financieros: "$2.000.000", tecnologicos: "Material educativo" }, detalles: ["Control de tabaquismo", "Prevención de alcoholismo", "Prevención de farmacodependencia", "Alimentación saludable", "Actividad física regular"] },
      { id: "3.2.2", name: "Investigación de Accidentes, Incidentes y Enfermedad Laboral", entregable: "Investigaciones con identificación de causas y acciones correctivas", responsable: "Responsable SST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Comité investigador", financieros: "$800.000", tecnologicos: "Formato investigación" } },
      { id: "4.1.1", name: "Metodología para Identificación de Peligros", entregable: "Matriz de riesgos actualizada con metodología GTC 45", responsable: "Responsable SST y Colaboradores", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Todos los niveles", financieros: "$1.000.000", tecnologicos: "Software de matriz" } },
      { id: "4.1.2", name: "Identificación de Peligros con Participación", entregable: "Evidencias de participación de todos los niveles en identificación", responsable: "Responsable SST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Todos los trabajadores", financieros: "$600.000", tecnologicos: "Encuestas, formatos" } },
      { id: "4.2.3", name: "Mantenimiento Periódico de Instalaciones", entregable: "Gestión y documentación de mantenimiento preventivo y correctivo", responsable: "Responsable SST y COPASST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Técnicos", financieros: "$5.000.000", tecnologicos: "Sistema de mantenimiento" } },
      { id: "4.2.4", name: "Inspecciones a Máquinas, Herramientas y Equipos", entregable: "Realizar inspecciones con participación del COPASST", responsable: "Responsable SST y COPASST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "COPASST", financieros: "$800.000", tecnologicos: "Listas de chequeo" }, detalles: ["Inspección de Extintores", "Inspección de Camilla de Emergencias", "Inspección de EPP", "Inspección Kit Antiderrames", "Bodega de almacenamiento", "Laboratorio y equipos", "Planta de pirólisis", "Oficinas administrativas"] },
      { id: "4.2.6", name: "Entrega de Elementos de Protección Personal", entregable: "Gestión de entrega, reposición y verificación de uso de EPP", responsable: "Responsable SST y COPASST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Todos", financieros: "$4.000.000", tecnologicos: "Control de inventario" } },
      { id: "5.1.1", name: "Plan de Prevención, Preparación y Respuesta ante Emergencias", entregable: "Plan actualizado, divulgado y socializado", responsable: "Responsable SST", meses: ["MAR"], recursos: { humanos: "Brigada", financieros: "$1.500.000", tecnologicos: "Simulacros, alarmas" } },
      { id: "5.1.2", name: "Brigada de Prevención contra Emergencias", entregable: "Brigada conformada, capacitada y dotada", responsable: "Responsable SST - En apoyo con Guaicaramo SAS", meses: ["ABR"], recursos: { humanos: "Brigadistas", financieros: "$2.000.000", tecnologicos: "Equipos de brigada" } },
    ],
  },
  verificar: {
    name: "VERIFICAR",
    color: "from-purple-500 to-indigo-600",
    icon: CheckSquare,
    activities: [
      { id: "6.1.1", name: "Seguimiento y Ejecución a los Indicadores SG-SST", entregable: "Seguimiento periódico a los indicadores del SG-SST", responsable: "Responsable SST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Resp. SST", financieros: "$400.000", tecnologicos: "Dashboard de indicadores" }, detalles: ["Indicador de frecuencia de AT", "Indicador de severidad de AT", "Indicador de ausentismo", "Indicador de cobertura de capacitación", "Indicador de cumplimiento de inspecciones", "Indicador del PVE Osteomuscular"] },
      { id: "6.1.2", name: "Auditoría Interna al SG-SST", entregable: "Auditoría anual con participación del COPASST", responsable: "Responsable SST y COPASST", meses: ["OCT"], recursos: { humanos: "Auditor competente", financieros: "$1.500.000", tecnologicos: "Lista de verificación" } },
      { id: "6.1.3", name: "Revisión Anual por la Alta Dirección", entregable: "Verificación del cumplimiento y recomendaciones de la revisión", responsable: "Responsable SST y Gerencia", meses: ["DIC"], recursos: { humanos: "Alta dirección", financieros: "$500.000", tecnologicos: "Informe ejecutivo" } },
    ],
  },
  actuar: {
    name: "ACTUAR",
    color: "from-orange-500 to-red-600",
    icon: TrendingUp,
    activities: [
      { id: "7.1.1", name: "Acciones Preventivas y Correctivas", entregable: "Matriz ACPM con acciones basadas en resultados del SG-SST", responsable: "Responsable SST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Equipo SST", financieros: "$1.000.000", tecnologicos: "Sistema de gestión" } },
      { id: "7.1.2", name: "Acciones de Mejora Conforme a Revisión de la Alta Dirección", entregable: "Acciones documentadas con responsables, recursos y plazos", responsable: "Responsable SST", meses: ["DIC"], recursos: { humanos: "Gerencia, SST", financieros: "$800.000", tecnologicos: "Plan de acción" } },
      { id: "7.1.3", name: "Acciones de Mejora con Base en Investigaciones", entregable: "Planes de acción derivados de investigaciones de AT y EL", responsable: "Responsable SST", meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], recursos: { humanos: "Comité investigador", financieros: "$600.000", tecnologicos: "Seguimiento de acciones" } },
    ],
  },
};

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export default function PlanAnualPage() {
  const [selectedCiclo, setSelectedCiclo] = useState<CicloKey>("planear");
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const toggleActivity = (id: string) => {
    setExpandedActivities((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const current = ciclos[selectedCiclo];
  const Icon = current.icon;

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
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
                Plan Anual SST 2026
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Title */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2" style={{ textShadow: "0 2px 15px rgba(0,0,0,0.4)" }}>
                Plan Anual de Trabajo SST 2026
              </h1>
              <p className="text-white/60 text-lg">SIRIUS Regenerative Solutions</p>
              <p className="text-white/40 text-sm mt-1">NIT: 901.377.064-8 | Código: FT-SST-018 | Versión: 002</p>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-400" size={48} />
              <div>
                <div className="text-3xl font-bold text-blue-400">2026</div>
                <div className="text-sm text-white/50">Año de gestión</div>
              </div>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-green-400 rounded-full" />
        </div>

        {/* Objetivo y Meta */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500/80 to-cyan-600/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 text-white border border-white/15">
            <div className="flex items-center gap-3 mb-3">
              <Target size={32} />
              <h2 className="text-2xl font-bold">Objetivo</h2>
            </div>
            <p className="text-lg leading-relaxed">
              Definir e implementar actividades de promoción y prevención que permitan gestionar adecuadamente los
              riesgos laborales de SIRIUS, promoviendo el autocuidado y la reducción de accidentes de trabajo y
              enfermedades laborales, en cumplimiento del Decreto 1072 de 2015 y la Resolución 0312 de 2019.
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500/80 to-emerald-600/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 text-white border border-white/15">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp size={32} />
              <h2 className="text-2xl font-bold">Meta</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-6xl font-bold">90%</div>
              <p className="text-lg leading-relaxed">
                Cumplir con el 90% de las actividades establecidas en el plan de trabajo anual
              </p>
            </div>
          </div>
        </div>

        {/* Ciclo PHVA */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-6 mb-8">
          <h3 className="font-bold text-xl mb-4 text-white text-center">Ciclo PHVA - Planear, Hacer, Verificar, Actuar</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {(Object.entries(ciclos) as [CicloKey, Ciclo][]).map(([key, ciclo]) => {
              const CicloIcon = ciclo.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCiclo(key)}
                  className={`p-6 rounded-xl font-semibold transition-all transform hover:scale-105 cursor-pointer ${
                    selectedCiclo === key
                      ? `bg-gradient-to-r ${ciclo.color} text-white shadow-xl`
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/10"
                  }`}
                >
                  <CicloIcon className="mx-auto mb-2" size={32} />
                  <div className="text-lg">{ciclo.name}</div>
                  <div className="text-sm mt-1 opacity-90">{ciclo.activities.length} actividades</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actividades */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className={`bg-gradient-to-r ${current.color} rounded-full p-3`}>
              <Icon className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">{current.name}</h2>
              <p className="text-white/60">Actividades programadas para la vigencia 2026</p>
            </div>
          </div>

          <div className="space-y-4">
            {current.activities.map((act) => (
              <div key={act.id} className="bg-white/5 backdrop-blur rounded-xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all">
                <div className="p-6 cursor-pointer" onClick={() => toggleActivity(act.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`bg-gradient-to-r ${current.color} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                          {act.id}
                        </span>
                        <h3 className="font-bold text-lg text-white">{act.name}</h3>
                      </div>
                      <p className="text-white/60 mb-3">{act.entregable}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Users size={16} className="text-blue-400" />
                        <span className="text-white/70">{act.responsable}</span>
                      </div>
                    </div>
                    <button className="ml-4">
                      {expandedActivities[act.id] ? (
                        <ChevronUp className="text-white/40" size={24} />
                      ) : (
                        <ChevronDown className="text-white/40" size={24} />
                      )}
                    </button>
                  </div>

                  {/* Timeline */}
                  <div className="mt-4 flex gap-1">
                    {MESES.map((mes) => (
                      <div
                        key={mes}
                        className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-semibold ${
                          act.meses.includes(mes)
                            ? `bg-gradient-to-r ${current.color} text-white`
                            : "bg-white/5 text-white/30"
                        }`}
                      >
                        {mes}
                      </div>
                    ))}
                  </div>
                </div>

                {expandedActivities[act.id] && (
                  <div className="p-6 border-t border-white/10 bg-white/5">
                    <div className="grid md:grid-cols-3 gap-6 mb-4">
                      <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                        <h4 className="font-semibold text-sm text-white/50 mb-2 flex items-center gap-2">
                          <Users size={16} className="text-blue-400" />
                          Recursos Humanos
                        </h4>
                        <p className="text-white">{act.recursos.humanos}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                        <h4 className="font-semibold text-sm text-white/50 mb-2">💰 Recursos Financieros</h4>
                        <p className="text-green-400 font-bold">{act.recursos.financieros}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                        <h4 className="font-semibold text-sm text-white/50 mb-2">💻 Recursos Tecnológicos</h4>
                        <p className="text-white">{act.recursos.tecnologicos}</p>
                      </div>
                    </div>

                    {act.detalles && (
                      <div className="bg-blue-500/10 rounded-lg p-4 border-l-4 border-blue-400">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <FileText size={16} className="text-blue-400" />
                          Detalles de la Actividad
                        </h4>
                        <ul className="space-y-2">
                          {act.detalles.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-white/70">
                              <span className="text-blue-400 mt-1">•</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Resumen de Inversión */}
        <div className="bg-gradient-to-r from-purple-500/80 to-pink-600/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 text-white border border-white/15 mb-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles size={28} />
            Resumen de Inversión en SST 2026
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { value: "51", label: "Actividades Totales" },
              { value: "$45M", label: "Inversión Estimada" },
              { value: "18", label: "Trabajadores Beneficiados" },
              { value: "90%", label: "Meta de Cumplimiento" },
            ].map((s) => (
              <div key={s.label} className="bg-white/20 backdrop-blur rounded-xl p-6 text-center">
                <div className="text-4xl font-bold mb-2">{s.value}</div>
                <div className="text-sm opacity-90">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer / Firmas */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center p-4 border-r border-white/10">
              <div className="text-sm text-white/40 mb-2">ELABORÓ</div>
              <div className="font-bold text-white">Maria Alejandra Polania Perdomo</div>
              <div className="text-sm text-white/60">Responsable del SG-SST</div>
            </div>
            <div className="text-center p-4">
              <div className="text-sm text-white/40 mb-2">APROBÓ</div>
              <div className="font-bold text-white">Martin Herrera Lara</div>
              <div className="text-sm text-white/60">Gerente / Representante Legal</div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-white/40">Fecha de Edición: 17 de Enero de 2026 | Versión: 002</p>
          </div>
        </div>
      </main>
    </div>
  );
}
