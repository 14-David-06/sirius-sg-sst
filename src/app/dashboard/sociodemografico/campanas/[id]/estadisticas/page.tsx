"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  BarChart3,
  Loader2,
  X,
  Users,
  Check,
  AlertCircle,
  RefreshCw,
  HeartPulse,
  Briefcase,
  Home,
  GraduationCap,
  Bus,
  Activity,
  Table as TableIcon,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import type { Campana, EstadisticasCampana, PiramidePoblacional } from "@/modules/sociodemografico/domain/entities";

// Etiquetas legibles para los valores de los selects de Airtable
const ETIQUETAS: Record<string, string> = {
  No_binario: "No binario",
  Prefiero_no_decir: "Prefiere no decir",
  Union_libre: "Unión libre",
  "4_o_mas": "4 o más",
  Tecnico_Tecnologo: "Técnico / Tecnólogo",
  Termino_fijo: "Término fijo",
  Termino_indefinido: "Término indefinido",
  Prestacion_servicios: "Prestación de servicios",
  Pirolisis: "Pirólisis",
  Jornada_completa: "Jornada completa",
  Media_jornada: "Media jornada",
  Por_turnos: "Por turnos",
  A_pie: "A pie",
  Bus_Transmilenio: "Bus / Transmilenio",
  Carro_particular: "Carro particular",
  Ruta_empresa: "Ruta de la empresa",
  Menos_30min: "Menos de 30 min",
  "30_60min": "30 a 60 min",
  "1_2horas": "1 a 2 horas",
  Mas_2horas: "Más de 2 horas",
  Si: "Sí",
};

function etiqueta(valor: string): string {
  return ETIQUETAS[valor] ?? valor.replace(/_/g, " ");
}

// Barra de distribución horizontal (una categoría)
function GraficoDistribucion({
  titulo,
  icono,
  datos,
  total,
}: {
  titulo: string;
  icono: React.ReactNode;
  datos: Record<string, number>;
  total: number;
}) {
  const entradas = Object.entries(datos).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        {icono}
        {titulo}
      </h3>
      {entradas.length === 0 ? (
        <p className="text-sm text-white/40">Sin datos</p>
      ) : (
        <div className="space-y-3">
          {entradas.map(([clave, valor]) => {
            const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
            return (
              <div key={clave}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-white/80">{etiqueta(clave)}</span>
                  <span className="text-white/60">
                    {valor} <span className="text-white/40">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Indicador booleano (sí/no) como tarjeta compacta
function IndicadorBooleano({ titulo, datos }: { titulo: string; datos: { si: number; no: number } }) {
  const total = datos.si + datos.no;
  const pct = total > 0 ? Math.round((datos.si / total) * 100) : 0;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-sm text-white/70 mb-2">{titulo}</p>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-white">{pct}%</span>
        <span className="text-xs text-white/50">
          {datos.si} sí / {datos.no} no
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Pirámide poblacional: barras masculino (izquierda) vs femenino (derecha)
function GraficoPiramide({ piramide }: { piramide: PiramidePoblacional }) {
  const maximo = Math.max(
    1,
    ...piramide.rangos.map((r) => Math.max(r.Masculino, r.Femenino))
  );
  const totalOtro = piramide.rangos.reduce((acc, r) => acc + r.Otro, 0);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
        <Users className="w-5 h-5 text-violet-400" />
        Pirámide Poblacional
      </h3>
      <div className="flex items-center justify-center gap-6 text-xs text-white/60 mb-4">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500" /> Masculino
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-pink-500" /> Femenino
        </span>
      </div>
      <div className="space-y-2">
        {[...piramide.rangos].reverse().map((r) => (
          <div key={r.rango} className="flex items-center gap-2">
            <div className="flex-1 flex justify-end items-center gap-2">
              {r.Masculino > 0 && <span className="text-xs text-white/60">{r.Masculino}</span>}
              <div
                className="h-5 bg-blue-500/80 rounded-l"
                style={{ width: `${(r.Masculino / maximo) * 100}%` }}
              />
            </div>
            <span className="w-14 text-center text-xs text-white/70 shrink-0">{r.rango}</span>
            <div className="flex-1 flex justify-start items-center gap-2">
              <div
                className="h-5 bg-pink-500/80 rounded-r"
                style={{ width: `${(r.Femenino / maximo) * 100}%` }}
              />
              {r.Femenino > 0 && <span className="text-xs text-white/60">{r.Femenino}</span>}
            </div>
          </div>
        ))}
      </div>
      {totalOtro > 0 && (
        <p className="text-xs text-white/50 mt-3">
          {totalOtro} persona(s) con género no binario o sin especificar no se grafican en la pirámide.
        </p>
      )}
    </div>
  );
}

export default function EstadisticasCampanaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [campanaId, setCampanaId] = useState<string>("");
  const [campana, setCampana] = useState<Campana | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCampana | null>(null);
  const [piramide, setPiramide] = useState<PiramidePoblacional | null>(null);
  const [respuestasDetalladas, setRespuestasDetalladas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [mostrarTabla, setMostrarTabla] = useState(false);
  const [cargandoRespuestas, setCargandoRespuestas] = useState(false);
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null);

  const cargarDatos = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [resCampana, resStats, resPiramide] = await Promise.all([
        fetch(`/api/socio/campanas/${id}`),
        fetch(`/api/socio/campanas/${id}/estadisticas`),
        fetch(`/api/socio/campanas/${id}/piramide`),
      ]);

      const dataCampana = await resCampana.json();
      if (!dataCampana.success) throw new Error(dataCampana.error || "Campaña no encontrada");
      setCampana(dataCampana.data);

      const dataStats = await resStats.json();
      if (!dataStats.success) throw new Error(dataStats.error || "Error al cargar estadísticas");
      setEstadisticas(dataStats.data);

      const dataPiramide = await resPiramide.json();
      if (dataPiramide.success) setPiramide(dataPiramide.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    params.then((p) => {
      setCampanaId(p.id);
      cargarDatos(p.id);
    });
  }, [params, cargarDatos]);

  const exportarPDF = async () => {
    setExportandoPDF(true);
    try {
      const res = await fetch(`/api/socio/campanas/${campanaId}/exportar-pdf`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Error al generar PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informe_Sociodemografico_${campana?.nombre?.replace(/\s+/g, "_") || campanaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al exportar PDF");
    } finally {
      setExportandoPDF(false);
    }
  };

  const cargarRespuestasDetalladas = async () => {
    if (respuestasDetalladas.length > 0) {
      setMostrarTabla(!mostrarTabla);
      return;
    }

    setCargandoRespuestas(true);
    try {
      const res = await fetch(`/api/socio/campanas/${campanaId}/respuestas`);
      const data = await res.json();
      if (data.success) {
        setRespuestasDetalladas(data.data);
        setMostrarTabla(true);
      } else {
        throw new Error(data.error || "Error al cargar respuestas");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar respuestas detalladas");
    } finally {
      setCargandoRespuestas(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!campana) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center max-w-md">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Campaña no encontrada</h2>
          {error && <p className="text-white/60 text-sm mb-4">{error}</p>}
          <button
            onClick={() => router.push("/dashboard/sociodemografico")}
            className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all cursor-pointer"
          >
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  const total = estadisticas?.totalRespuestas ?? 0;
  const progreso = campana.tokensGenerados
    ? Math.round(((campana.respuestasCompletadas || 0) / campana.tokensGenerados) * 100)
    : 0;

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
          <div className="flex flex-wrap items-center justify-between gap-3 py-5">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => router.push(`/dashboard/sociodemografico/campanas/${campanaId}`)}
                className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Campaña
              </button>
              <div className="h-8 w-px bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white truncate">Estadísticas del Perfil</h1>
                  <p className="text-xs text-white/50 truncate">
                    {campana.nombre} · {campana.periodo.replace("_", " ")} {campana.año}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => cargarDatos(campanaId)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 text-sm font-medium transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
              <button
                onClick={exportarPDF}
                disabled={exportandoPDF || total === 0}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-400/25 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">{exportandoPDF ? "Generando..." : "PDF"}</span>
              </button>
            </div>
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

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-lg">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Respuestas Recibidas</p>
                <p className="text-3xl font-bold text-white">{total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-violet-500/20 rounded-lg">
                <Users className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Tokens Generados</p>
                <p className="text-3xl font-bold text-white">{campana.tokensGenerados || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Participación</span>
              <span className="text-2xl font-bold text-white">{progreso}%</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
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
        </div>

        {/* Sin respuestas aún */}
        {total === 0 || !estadisticas ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <BarChart3 className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg font-medium mb-2">Aún no hay respuestas registradas</p>
            <p className="text-white/40 text-sm">
              Las estadísticas aparecerán aquí a medida que los colaboradores respondan la encuesta.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pirámide + Demografía */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {piramide && <GraficoPiramide piramide={piramide} />}
              <GraficoDistribucion
                titulo="Género"
                icono={<Users className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.genero}
                total={total}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <GraficoDistribucion
                titulo="Estado Civil"
                icono={<Users className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.estadoCivil}
                total={total}
              />
              <GraficoDistribucion
                titulo="Escolaridad"
                icono={<GraduationCap className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.escolaridad}
                total={total}
              />
              <GraficoDistribucion
                titulo="Estrato"
                icono={<Home className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.estrato}
                total={total}
              />
              <GraficoDistribucion
                titulo="Tipo de Vivienda"
                icono={<Home className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.tipoVivienda}
                total={total}
              />
              <GraficoDistribucion
                titulo="Personas a Cargo"
                icono={<Users className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.personasACargo}
                total={total}
              />
              <GraficoDistribucion
                titulo="Área de Trabajo"
                icono={<Briefcase className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.areaTrabajo}
                total={total}
              />
              <GraficoDistribucion
                titulo="Tipo de Contrato"
                icono={<Briefcase className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.tipoContrato}
                total={total}
              />
              <GraficoDistribucion
                titulo="Jornada de Trabajo"
                icono={<Briefcase className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.turnoTrabajo}
                total={total}
              />
              <GraficoDistribucion
                titulo="Medio de Transporte"
                icono={<Bus className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.medioTransporte}
                total={total}
              />
              <GraficoDistribucion
                titulo="Tiempo de Desplazamiento"
                icono={<Bus className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.tiempoDesplazamiento}
                total={total}
              />
              <GraficoDistribucion
                titulo="Consumo de Tabaco"
                icono={<HeartPulse className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.fuma}
                total={total}
              />
              <GraficoDistribucion
                titulo="Consumo de Alcohol"
                icono={<HeartPulse className="w-5 h-5 text-violet-400" />}
                datos={estadisticas.alcohol}
                total={total}
              />
            </div>

            {/* Indicadores de salud y otros booleanos */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-400" />
                Indicadores de Salud y Condiciones
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <IndicadorBooleano titulo="Practica deporte" datos={estadisticas.practicaDeporte} />
                <IndicadorBooleano titulo="Estudia actualmente" datos={estadisticas.estudiandoActualmente} />
                <IndicadorBooleano titulo="Tiene otro empleo" datos={estadisticas.otroEmpleo} />
                <IndicadorBooleano titulo="Enfermedad crónica" datos={estadisticas.enfermedadCronica} />
                <IndicadorBooleano titulo="Discapacidad" datos={estadisticas.discapacidad} />
                <IndicadorBooleano titulo="Tratamiento médico" datos={estadisticas.tratamientoMedico} />
                <IndicadorBooleano titulo="Accidentes laborales previos" datos={estadisticas.accidentesTrabajoPrevios} />
                <IndicadorBooleano titulo="Enfermedad laboral previa" datos={estadisticas.enfermedadLaboralPrevia} />
              </div>
            </div>

            {/* Tabla de respuestas detalladas */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <TableIcon className="w-5 h-5 text-violet-400" />
                  Respuestas Individuales ({total})
                </h3>
                <button
                  onClick={cargarRespuestasDetalladas}
                  disabled={cargandoRespuestas}
                  className="flex items-center gap-2 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:bg-violet-500/50 border border-violet-400/20 px-4 py-2 text-sm font-semibold text-white transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {cargandoRespuestas ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cargando...
                    </>
                  ) : mostrarTabla ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Ocultar Tabla
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Ver Detalle
                    </>
                  )}
                </button>
              </div>

              {mostrarTabla && respuestasDetalladas.length > 0 && (
                <div className="space-y-4">
                  {respuestasDetalladas.map((resp, index) => (
                    <div
                      key={resp.id}
                      className="border border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-xl hover:border-violet-500/30 transition-all"
                    >
                      {/* Fila principal */}
                      <div
                        onClick={() => setFilaExpandida(filaExpandida === resp.id ? null : resp.id)}
                        className="cursor-pointer"
                      >
                        <div className="grid grid-cols-12 gap-4 p-4 items-center">
                          <div className="col-span-3">
                            <div className="text-xs text-white/50 mb-1">Colaborador #{index + 1}</div>
                            <div className="text-white font-semibold">{resp.nombreCompleto}</div>
                            <div className="text-xs text-white/60">{resp.numeroDocumento}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-white/50 mb-1">Datos básicos</div>
                            <div className="text-white text-sm">{resp.edad} años</div>
                            <div className="text-xs text-white/60">{etiqueta(resp.genero)} · {etiqueta(resp.estadoCivil)}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-white/50 mb-1">Residencia</div>
                            <div className="text-white text-sm">{resp.municipio}</div>
                            <div className="text-xs text-white/60">Estrato {resp.estrato}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-white/50 mb-1">Laboral</div>
                            <div className="text-white text-sm">{etiqueta(resp.areaTrabajo)}</div>
                            <div className="text-xs text-white/60">{resp.cargo}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-white/50 mb-1">Salud</div>
                            <div className="flex flex-col gap-0.5">
                              {resp.enfermedadCronica && (
                                <span className="text-xs text-orange-400">⚕️ Enfermedad crónica</span>
                              )}
                              {resp.discapacidad && (
                                <span className="text-xs text-blue-400">♿ Discapacidad</span>
                              )}
                              {resp.tratamientoMedico && (
                                <span className="text-xs text-purple-400">💊 Tratamiento médico</span>
                              )}
                              {!resp.enfermedadCronica && !resp.discapacidad && !resp.tratamientoMedico && (
                                <span className="text-xs text-green-400">✓ Sin novedad</span>
                              )}
                            </div>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <div className="text-violet-400">
                              {filaExpandida === resp.id ? "▼" : "▶"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Panel expandido con TODA la información */}
                      {filaExpandida === resp.id && (
                        <div className="border-t border-white/10 bg-white/5 p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* SECCIÓN 1: DATOS PERSONALES */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-violet-400 uppercase tracking-wide">
                                Datos Personales
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-white/50 text-xs">Género</div>
                                  <div className="text-white">{etiqueta(resp.genero)}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Estado Civil</div>
                                  <div className="text-white">{etiqueta(resp.estadoCivil)}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Edad</div>
                                  <div className="text-white">{resp.edad} años</div>
                                </div>
                              </div>
                            </div>

                            {/* SECCIÓN 2: VIVIENDA */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wide">
                                Vivienda
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-white/50 text-xs">Municipio</div>
                                  <div className="text-white">{resp.municipio}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Estrato</div>
                                  <div className="text-white">Estrato {resp.estrato}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Tipo de Vivienda</div>
                                  <div className="text-white">{etiqueta(resp.tipoVivienda)}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Personas a Cargo</div>
                                  <div className="text-white">{etiqueta(resp.personasACargo)}</div>
                                </div>
                              </div>
                            </div>

                            {/* SECCIÓN 3: EDUCACIÓN */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
                                Educación
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-white/50 text-xs">Nivel de Escolaridad</div>
                                  <div className="text-white">{etiqueta(resp.escolaridad)}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Estudia Actualmente</div>
                                  <div className="text-white">{resp.estudiandoActualmente ? "Sí" : "No"}</div>
                                </div>
                                {resp.estudiandoActualmente && resp.carreraActual && (
                                  <div>
                                    <div className="text-white/50 text-xs">Programa</div>
                                    <div className="text-white">{resp.carreraActual}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* SECCIÓN 4: INFORMACIÓN LABORAL */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                                Información Laboral
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-white/50 text-xs">Área de Trabajo</div>
                                  <div className="text-white">{etiqueta(resp.areaTrabajo)}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Cargo</div>
                                  <div className="text-white">{resp.cargo}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Tipo de Contrato</div>
                                  <div className="text-white">{etiqueta(resp.tipoContrato)}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Antigüedad</div>
                                  <div className="text-white">{resp.antiguedad}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Jornada</div>
                                  <div className="text-white">{etiqueta(resp.turnoTrabajo)}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Otro Empleo</div>
                                  <div className="text-white">{resp.otroEmpleo ? "Sí" : "No"}</div>
                                </div>
                                {resp.otroEmpleo && resp.descripcionOtroEmpleo && (
                                  <div>
                                    <div className="text-white/50 text-xs">Descripción</div>
                                    <div className="text-white">{resp.descripcionOtroEmpleo}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* SECCIÓN 5: CONDICIONES DE SALUD */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                                Condiciones de Salud
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-white/50 text-xs">Enfermedad Crónica</div>
                                  <div className="text-white">{resp.enfermedadCronica ? "Sí" : "No"}</div>
                                  {resp.enfermedadCronica && resp.cualEnfermedadCronica && (
                                    <div className="text-orange-300 text-xs mt-1">⚕️ {resp.cualEnfermedadCronica}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Discapacidad</div>
                                  <div className="text-white">{resp.discapacidad ? "Sí" : "No"}</div>
                                  {resp.discapacidad && resp.cualDiscapacidad && (
                                    <div className="text-blue-300 text-xs mt-1">♿ {resp.cualDiscapacidad}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Tratamiento Médico</div>
                                  <div className="text-white">{resp.tratamientoMedico ? "Sí" : "No"}</div>
                                  {resp.tratamientoMedico && resp.descripcionTratamiento && (
                                    <div className="text-purple-300 text-xs mt-1">💊 {resp.descripcionTratamiento}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Accidentes Laborales Previos</div>
                                  <div className="text-white">{resp.accidentesTrabajoPrevios ? "Sí" : "No"}</div>
                                  {resp.accidentesTrabajoPrevios && resp.descripcionAccidentes && (
                                    <div className="text-yellow-300 text-xs mt-1">⚠️ {resp.descripcionAccidentes}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Enfermedad Laboral Previa</div>
                                  <div className="text-white">{resp.enfermedadLaboralPrevia ? "Sí" : "No"}</div>
                                  {resp.enfermedadLaboralPrevia && resp.descripcionEnfLaboral && (
                                    <div className="text-red-300 text-xs mt-1">🩺 {resp.descripcionEnfLaboral}</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* SECCIÓN 6: HÁBITOS */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">
                                Hábitos y Estilo de Vida
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-white/50 text-xs">Fuma</div>
                                  <div className="text-white">{etiqueta(resp.fuma)}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Consumo de Alcohol</div>
                                  <div className="text-white">{etiqueta(resp.alcohol)}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Practica Deporte</div>
                                  <div className="text-white">{resp.practicaDeporte ? "Sí" : "No"}</div>
                                  {resp.practicaDeporte && resp.cualDeporte && (
                                    <div className="text-cyan-300 text-xs mt-1">🏃 {resp.cualDeporte}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Actividades Tiempo Libre</div>
                                  <div className="text-white text-xs">{resp.tiempoLibre?.map((t: string) => etiqueta(t)).join(", ") || "—"}</div>
                                </div>
                              </div>
                            </div>

                            {/* SECCIÓN 7: TRANSPORTE */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wide">
                                Transporte y Movilidad
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-white/50 text-xs">Medio de Transporte</div>
                                  <div className="text-white">{etiqueta(resp.medioTransporte)}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Tiempo de Desplazamiento</div>
                                  <div className="text-white">{etiqueta(resp.tiempoDesplazamiento)}</div>
                                </div>
                              </div>
                            </div>

                            {/* SECCIÓN 8: CONSENTIMIENTOS */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
                                Consentimientos
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-white/50 text-xs">Política de Datos</div>
                                  <div className="text-white">{resp.aceptaPoliticaDatos ? "✓ Aceptado" : "✗ No aceptado"}</div>
                                </div>
                                <div>
                                  <div className="text-white/50 text-xs">Declara Veracidad</div>
                                  <div className="text-white">{resp.firmaVeracidad ? "✓ Declarado" : "✗ No declarado"}</div>
                                </div>
                                {resp.createdTime && (
                                  <div>
                                    <div className="text-white/50 text-xs">Fecha de Respuesta</div>
                                    <div className="text-white text-xs">{new Date(resp.createdTime).toLocaleString("es-CO")}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {mostrarTabla && respuestasDetalladas.length === 0 && (
                <p className="text-center text-white/40 py-8">No hay respuestas para mostrar</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
