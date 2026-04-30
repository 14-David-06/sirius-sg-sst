"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  Download,
} from "lucide-react";

type ActaItem = {
  id?: string;
  idActa?: string;
  numeroActa: string;
  mesEvaluado: string;
  fechaReunion: string;
  estado: "borrador" | "firmada";
  urlDocumento?: string | null;
};

type ComiteSlug = "copasst" | "cocolab";

const NOMBRE: Record<ComiteSlug, string> = {
  copasst: "COPASST",
  cocolab: "COCOLAB",
};

const COLOR: Record<ComiteSlug, { iconBg: string; iconText: string }> = {
  copasst: { iconBg: "bg-blue-500/20 border-blue-400/30", iconText: "text-blue-300" },
  cocolab: { iconBg: "bg-emerald-500/20 border-emerald-400/30", iconText: "text-emerald-300" },
};

export default function ListaActasPage({
  params,
}: {
  params: Promise<{ comite: ComiteSlug }>;
}) {
  const { comite } = use(params);
  const router = useRouter();
  const [actas, setActas] = useState<ActaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const url = `/api/${comite}/actas${filtroEstado ? `?estado=${filtroEstado}` : ""}`;
        const r = await fetch(url, { cache: "no-store" });
        const j = await r.json();
        setActas(j.data || []);
      } catch (e) {
        console.error(e);
        setActas([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [comite, filtroEstado]);

  if (comite !== "copasst" && comite !== "cocolab") {
    router.replace("/dashboard/comites");
    return null;
  }

  const color = COLOR[comite];

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
              onClick={() => router.push("/dashboard/comites")}
              className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </button>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${color.iconBg}`}>
                <FileText className={`w-5 h-5 ${color.iconText}`} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Actas {NOMBRE[comite]}</h1>
                <p className="text-xs text-white/50">SG-SST</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Actas {NOMBRE[comite]}</h2>
            <p className="text-white/50 text-sm mt-1">
              Histórico y creación de nuevas actas digitales.
            </p>
          </div>
          <Link
            href={`/dashboard/comites/${comite}/nueva`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" /> Nueva acta
          </Link>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-3 items-center">
          <label className="text-white/70 text-sm">Estado:</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-lg bg-white/5 border border-white/10 text-white px-3 py-1.5 text-sm focus:bg-white/10 focus:border-white/20 outline-none"
          >
            <option value="" className="bg-slate-900">Todos</option>
            <option value="borrador" className="bg-slate-900">Borrador</option>
            <option value="firmada" className="bg-slate-900">Firmadas</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center text-white/50">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Cargando actas...
            </div>
          ) : actas.length === 0 ? (
            <div className="p-12 text-center text-white/50">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              No hay actas registradas todavía.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">N° Acta</th>
                  <th className="text-left px-4 py-3 font-semibold">Mes evaluado</th>
                  <th className="text-left px-4 py-3 font-semibold">Fecha reunión</th>
                  <th className="text-left px-4 py-3 font-semibold">Estado</th>
                  <th className="text-right px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {actas.map((a) => (
                  <tr
                    key={a.idActa || a.id}
                    className="border-t border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-mono">{a.numeroActa}</td>
                    <td className="px-4 py-3 text-white/90">{a.mesEvaluado}</td>
                    <td className="px-4 py-3 text-white/70">
                      {formatFecha(a.fechaReunion)}
                    </td>
                    <td className="px-4 py-3">
                      {a.estado === "firmada" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs px-2.5 py-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Firmada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs px-2.5 py-1">
                          <Clock className="w-3.5 h-3.5" /> Borrador
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-3">
                        <Link
                          href={`/dashboard/comites/${comite}/${a.idActa}`}
                          className="text-blue-300 hover:text-blue-200 text-xs font-medium transition-colors"
                        >
                          Ver
                        </Link>
                        <a
                          href={`/api/${comite}/actas/${a.idActa}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white/70 hover:text-white text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function formatFecha(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}
