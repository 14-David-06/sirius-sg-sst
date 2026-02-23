"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  Loader2,
  AlertTriangle,
  ClipboardList,
  FileDown,
  PlusCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface RegistroResumen {
  id: string;
  idRegistro: string;
  nombreEvento: string;
  ciudad: string;
  fecha: string;
  tipo: string;
  area: string;
  nombreConferencista: string;
  estado: string;
  cantidadAsistentes: number;
}

export default function HistorialRegistrosPage() {
  const router = useRouter();
  const [registros, setRegistros] = useState<RegistroResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportandoId, setExportandoId] = useState<string | null>(null);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/registros-asistencia");
      const json = await res.json();
      if (json.success) {
        setRegistros(json.data);
      } else {
        setError(json.message || "Error cargando registros");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  const exportarExcel = async (registroId: string, nombreEvento: string) => {
    setExportandoId(registroId);
    try {
      const res = await fetch("/api/registros-asistencia/exportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registroRecordId: registroId }),
      });
      if (!res.ok) throw new Error("Error al generar el archivo");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Asistencia_${nombreEvento.replace(/\s+/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setExportandoId(null);
    }
  };

  const formatFecha = (fechaRaw: string) => {
    if (!fechaRaw) return "—";
    try {
      const d = new Date(fechaRaw + "T12:00:00");
      return d.toLocaleDateString("es-CO", {
        timeZone: "America/Bogota",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return fechaRaw;
    }
  };

  const TIPO_COLORS: Record<string, string> = {
    INDUCCION:    "bg-blue-500/20 text-blue-300 border-blue-400/30",
    CAPACITACION: "bg-purple-500/20 text-purple-300 border-purple-400/30",
    CHARLA:       "bg-green-500/20 text-green-300 border-green-400/30",
    OTRO:         "bg-gray-500/20 text-gray-300 border-gray-400/30",
  };

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-10">
        <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard/registros-asistencia")}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 backdrop-blur-sm">
                  <ClipboardList className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Historial de Registros</h1>
                  <p className="text-xs text-white/60">Todos los registros de asistencia</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard/registros-asistencia/nuevo")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/25 hover:bg-purple-500/35 text-white border border-purple-400/35 transition-all"
            >
              <PlusCircle size={18} />
              <span className="hidden sm:inline">Nuevo Registro</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/20 border border-red-500/30 text-white">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
          </div>
        ) : registros.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-16 text-center">
            <ClipboardList className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/60 text-lg">No hay registros de asistencia aún</p>
            <button
              onClick={() => router.push("/dashboard/registros-asistencia/nuevo")}
              className="mt-4 px-6 py-2.5 rounded-xl bg-purple-500/25 border border-purple-400/35 text-white font-medium hover:bg-purple-500/35 transition-all"
            >
              Crear el primero
            </button>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <p className="text-white/60 text-sm">{registros.length} registro{registros.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-purple-500/20 border-b border-white/10">
                    <th className="text-left text-xs font-semibold text-white/80 px-4 py-3">Evento</th>
                    <th className="text-left text-xs font-semibold text-white/80 px-4 py-3 w-28">Fecha</th>
                    <th className="text-left text-xs font-semibold text-white/80 px-4 py-3 w-28">Tipo</th>
                    <th className="text-left text-xs font-semibold text-white/80 px-4 py-3 w-28">Área</th>
                    <th className="text-center text-xs font-semibold text-white/80 px-4 py-3 w-24">Asistentes</th>
                    <th className="text-center text-xs font-semibold text-white/80 px-4 py-3 w-28">Estado</th>
                    <th className="text-center text-xs font-semibold text-white/80 px-4 py-3 w-24">Exportar</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((reg, idx) => (
                    <tr
                      key={reg.id}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 1 ? "bg-white/[0.02]" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white">{reg.nombreEvento || "—"}</p>
                        {reg.ciudad && <p className="text-xs text-white/50 mt-0.5">{reg.ciudad}</p>}
                        {reg.nombreConferencista && (
                          <p className="text-xs text-purple-300/70 mt-0.5">Conf: {reg.nombreConferencista}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/70">{formatFecha(reg.fecha)}</td>
                      <td className="px-4 py-3">
                        {reg.tipo ? (
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${TIPO_COLORS[reg.tipo] || TIPO_COLORS["OTRO"]}`}>
                            {reg.tipo}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/70">{reg.area || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-bold text-sirius-cielo">{reg.cantidadAsistentes}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {reg.estado === "Completado" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300 border border-green-400/30">
                            <CheckCircle className="w-3 h-3" />
                            Completado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                            <Clock className="w-3 h-3" />
                            Borrador
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => exportarExcel(reg.id, reg.nombreEvento)}
                          disabled={exportandoId === reg.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sirius-verde/20 border border-sirius-verde/30 text-white text-xs font-medium hover:bg-sirius-verde/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          {exportandoId === reg.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileDown className="w-3 h-3" />
                          )}
                          Excel
                        </button>
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
