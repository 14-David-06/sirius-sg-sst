"use client";

// ══════════════════════════════════════════════════════════
// Dashboard — Incidentes y Accidentes de Trabajo
// Listado de eventos del periodo + estadísticas legales
// ══════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ClipboardList,
  FileWarning,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";
import type {
  EventoAT,
  IndicadoresAccidentes,
  TipoEvento,
} from "@/lib/accidentes/types";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Fecha de hoy en zona America/Bogota como YYYY-MM-DD. */
function hoyColombia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function rangoDelMes(anio: number, mes: number): { desde: string; hasta: string } {
  const mm = String(mes).padStart(2, "0");
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return {
    desde: `${anio}-${mm}-01`,
    hasta: `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

function formatearFecha(iso: string): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

export default function AccidentesPage() {
  const router = useRouter();
  const [hoy] = useState(hoyColombia);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));

  const [eventos, setEventos] = useState<EventoAT[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresAccidentes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoEvento | "todos">("todos");

  const periodo = useMemo(() => rangoDelMes(anio, mes), [anio, mes]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const query = `desde=${periodo.desde}&hasta=${periodo.hasta}`;
      const [resEventos, resIndicadores] = await Promise.all([
        fetch(`/api/accidentes/eventos?${query}`),
        fetch(`/api/accidentes/indicadores?${query}`),
      ]);

      const jsonEventos = await resEventos.json();
      if (!resEventos.ok || !jsonEventos.success) {
        throw new Error(jsonEventos.message || "No se pudieron cargar los eventos");
      }
      setEventos(jsonEventos.data as EventoAT[]);

      const jsonIndicadores = await resIndicadores.json();
      if (resIndicadores.ok && jsonIndicadores.success) {
        setIndicadores(jsonIndicadores.data.indicadores as IndicadoresAccidentes);
      } else {
        // Los indicadores son complementarios: el listado sigue siendo útil.
        console.error("[accidentes] indicadores:", jsonIndicadores.message);
        setIndicadores(null);
      }
    } catch (e) {
      console.error("[accidentes] cargar:", e);
      setError(e instanceof Error ? e.message : "Error al cargar la información");
    } finally {
      setCargando(false);
    }
  }, [periodo.desde, periodo.hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const eventosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return eventos.filter((e) => {
      if (filtroTipo !== "todos" && e.tipoEvento !== filtroTipo) return false;
      if (!termino) return true;
      return (
        e.nombreEmpleado.toLowerCase().includes(termino) ||
        e.idEvento.toLowerCase().includes(termino) ||
        e.lugarArea.toLowerCase().includes(termino) ||
        e.descripcion.toLowerCase().includes(termino)
      );
    });
  }, [eventos, busqueda, filtroTipo]);

  const anios = useMemo(() => {
    const actual = Number(hoy.slice(0, 4));
    return [actual + 1, actual, actual - 1, actual - 2];
  }, [hoy]);

  return (
    <div className="min-h-screen relative">
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

      <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Volver al Dashboard</span>
              </button>
              <div className="h-6 w-px bg-white/20" />
              <h1 className="text-xl font-bold text-white">
                Incidentes y Accidentes de Trabajo
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/dashboard/accidentes/reportes")}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors border border-white/15"
              >
                <FileWarning className="w-5 h-5" />
                Reportes preventivos
              </button>
              <button
                onClick={() => router.push("/dashboard/accidentes/nuevo")}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Registrar evento
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Selector de periodo */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5 mb-8">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Mes
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400/50"
              >
                {MESES.map((nombre, i) => (
                  <option key={nombre} value={i + 1} className="bg-slate-800">
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Año
              </label>
              <select
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400/50"
              >
                {anios.map((a) => (
                  <option key={a} value={a} className="bg-slate-800">
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-white/50 pb-2.5">
              Periodo del informe: {formatearFecha(periodo.desde)} al{" "}
              {formatearFecha(periodo.hasta)}
            </p>
          </div>
        </div>

        {/* Estadísticas legales del periodo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <TarjetaKpi
            titulo="Accidentes de trabajo"
            valor={indicadores?.totalAccidentes ?? 0}
            icono={<ShieldAlert className="w-6 h-6 text-red-300" />}
            color="red"
          />
          <TarjetaKpi
            titulo="Accidentes graves"
            valor={indicadores?.accidentesGraves ?? 0}
            icono={<AlertTriangle className="w-6 h-6 text-amber-300" />}
            color="amber"
          />
          <TarjetaKpi
            titulo="Días de incapacidad"
            valor={indicadores?.diasIncapacidadAT ?? 0}
            icono={<ClipboardList className="w-6 h-6 text-indigo-300" />}
            color="indigo"
          />
          <TarjetaKpi
            titulo="Incidentes registrados"
            valor={indicadores?.totalIncidentes ?? 0}
            icono={<AlertCircle className="w-6 h-6 text-emerald-300" />}
            color="emerald"
          />
        </div>

        {indicadores && (
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5 mb-8">
            <h2 className="text-sm font-semibold text-white/80 mb-4">
              Estadísticas legales del periodo
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              <Dato etiqueta="Reconocidos por ARL" valor={indicadores.accidentesReconocidosARL} />
              <Dato etiqueta="Objetados por ARL" valor={indicadores.accidentesObjetadosARL} />
              <Dato etiqueta="Accidentes fatales" valor={indicadores.accidentesFatales} />
              <Dato etiqueta="Con lesión" valor={indicadores.accidentesConLesion} />
              <Dato etiqueta="Casi accidentes" valor={indicadores.casiAccidentes} />
              <Dato etiqueta="Actos inseguros" valor={indicadores.actosInseguros} />
              <Dato etiqueta="Condiciones inseguras" valor={indicadores.condicionesInseguras} />
              <Dato etiqueta="Investigaciones" valor={indicadores.investigacionesRealizadas} />
            </div>
          </div>
        )}

        {/* Filtros del listado */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por trabajador, consecutivo o lugar…"
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-400/50"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoEvento | "todos")}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400/50"
          >
            <option value="todos" className="bg-slate-800">Todos los tipos</option>
            <option value="Accidente de trabajo" className="bg-slate-800">
              Accidentes de trabajo
            </option>
            <option value="Incidente de trabajo" className="bg-slate-800">
              Incidentes de trabajo
            </option>
          </select>
        </div>

        {/* Listado */}
        {cargando ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
            <p className="text-red-200">{error}</p>
            <button
              onClick={cargar}
              className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/15"
            >
              Reintentar
            </button>
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-12 text-center">
            <ShieldAlert className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <p className="text-white/70 font-medium">
              No se registraron eventos en el periodo evaluado
            </p>
            <p className="text-white/40 text-sm mt-1">
              Es el texto que aparecerá en el informe mensual para este periodo.
            </p>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="text-left text-white/60">
                    <th className="px-4 py-3 font-medium">Consecutivo</th>
                    <th className="px-4 py-3 font-medium">Trabajador</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Lesión</th>
                    <th className="px-4 py-3 font-medium text-center">Días inc.</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {eventosFiltrados.map((evento) => (
                    <tr
                      key={evento.recordId}
                      onClick={() =>
                        router.push(`/dashboard/accidentes/${evento.recordId}`)
                      }
                      className="cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-white/90 font-mono text-xs">
                        {evento.idEvento}
                        {evento.grave && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-semibold border border-red-400/30">
                            GRAVE
                          </span>
                        )}
                        {evento.mortal && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-red-700/40 text-red-200 text-[10px] font-semibold border border-red-400/40">
                            MORTAL
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {evento.nombreEmpleado}
                        <span className="block text-xs text-white/40">
                          {evento.cargo || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        {formatearFecha(evento.fechaEvento)}
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        {evento.tipoEvento === "Accidente de trabajo" ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-400/30">
                            Accidente
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30">
                            Incidente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {evento.tipoLesion || "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-white/80">
                        {evento.diasIncapacidad}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white/70 text-xs">{evento.estado}</span>
                        {!evento.tieneInvestigacion && (
                          <span className="block text-[11px] text-amber-300/80 mt-0.5">
                            Sin investigación
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Subcomponentes
// ══════════════════════════════════════════════════════════
function TarjetaKpi({
  titulo,
  valor,
  icono,
  color,
}: {
  titulo: string;
  valor: number;
  icono: React.ReactNode;
  color: "red" | "amber" | "indigo" | "emerald";
}) {
  const fondos: Record<typeof color, string> = {
    red: "bg-red-500/20",
    amber: "bg-amber-500/20",
    indigo: "bg-indigo-500/20",
    emerald: "bg-emerald-500/20",
  };
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60 font-medium">{titulo}</p>
          <p className="text-3xl font-bold text-white mt-1">{valor}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${fondos[color]}`}
        >
          {icono}
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-white/5 pb-1.5">
      <span className="text-white/60">{etiqueta}</span>
      <span className="text-white font-semibold">{valor}</span>
    </div>
  );
}
