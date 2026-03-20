"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Calendar,
  User,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

interface CriterioDetalle {
  id: string;
  categoria: string;
  criterio: string;
  condicion: string;
  observacion: string;
}

interface AccionDetalle {
  id: string;
  descripcion: string;
  tipo: string;
  responsable: string;
  fechaPropuesta: string;
  estado: string;
  fechaCierre: string | null;
  evidenciaUrl: string | null;
}

interface ResponsableDetalle {
  id: string;
  tipo: string;
  nombre: string;
  cedula: string;
  cargo: string;
  fechaFirma: string;
  tieneFirma: boolean;
}

interface InspeccionDetalle {
  id: string;
  recordId: string;
  fecha: string;
  inspector: string;
  area: string;
  estado: string;
  observaciones: string;
  urlDocumento: string | null;
  fechaExportacion: string | null;
  criterios: CriterioDetalle[];
  acciones: AccionDetalle[];
  responsables: ResponsableDetalle[];
}

const CONDICION_STYLE: Record<string, string> = {
  Bueno: "bg-green-500/20 text-green-300 border-green-400/30",
  Malo: "bg-red-500/20 text-red-300 border-red-400/30",
  NA: "bg-gray-500/20 text-gray-300 border-gray-400/30",
};

function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return "Sin fecha";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "America/Bogota",
  });
}

export default function InspeccionAreaDetallePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const inspeccionId = useMemo(() => params?.id ?? "", [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InspeccionDetalle | null>(null);

  useEffect(() => {
    const cargarDetalle = async () => {
      if (!inspeccionId) {
        setError("No se recibió un identificador de inspección.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/inspecciones-areas/${encodeURIComponent(inspeccionId)}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "No fue posible cargar el detalle de la inspección.");
        }

        setData(json.data as InspeccionDetalle);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido cargando el detalle.");
      } finally {
        setLoading(false);
      }
    };

    cargarDetalle();
  }, [inspeccionId]);

  const criteriosPorCategoria = useMemo(() => {
    const grouped: Record<string, CriterioDetalle[]> = {};
    for (const criterio of data?.criterios ?? []) {
      if (!grouped[criterio.categoria]) grouped[criterio.categoria] = [];
      grouped[criterio.categoria].push(criterio);
    }
    return grouped;
  }, [data?.criterios]);

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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard/inspecciones-areas/historial")}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 backdrop-blur-sm">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Detalle de Inspección de Área</h1>
                  <p className="text-xs text-white/60">{inspeccionId || "Inspección"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-white flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">No se pudo cargar la inspección</p>
              <p className="text-sm text-white/80 mt-1">{error}</p>
            </div>
          </div>
        ) : data ? (
          <>
            <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Información general</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-white/50">ID</p>
                  <p className="text-white font-semibold">{data.id}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-white/50 flex items-center gap-1"><Calendar size={13} /> Fecha</p>
                  <p className="text-white font-semibold">{formatFecha(data.fecha)}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-white/50 flex items-center gap-1"><User size={13} /> Inspector</p>
                  <p className="text-white font-semibold">{data.inspector || "Sin inspector"}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-white/50">Área / Estado</p>
                  <p className="text-white font-semibold">{data.area} · {data.estado}</p>
                </div>
              </div>
            </section>

            <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Criterios evaluados
              </h2>
              <div className="space-y-4">
                {Object.entries(criteriosPorCategoria).map(([categoria, criterios]) => (
                  <div key={categoria} className="space-y-2">
                    <h3 className="text-sm font-semibold text-white/80 bg-white/5 px-3 py-1.5 rounded-lg">
                      {categoria}
                    </h3>
                    <div className="space-y-1">
                      {criterios.map((c) => (
                        <div key={c.id} className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-sm text-white/90">{c.criterio}</p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border w-fit ${CONDICION_STYLE[c.condicion] || "bg-white/10 text-white/70 border-white/20"}`}
                          >
                            {c.condicion || "Sin condición"}
                          </span>
                          <p className="text-xs text-white/70">{c.observacion || "Sin observación"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Acciones correctivas</h2>
              {data.acciones.length === 0 ? (
                <p className="text-sm text-white/60">No hay acciones correctivas registradas.</p>
              ) : (
                <div className="space-y-2">
                  {data.acciones.map((accion) => (
                    <div key={accion.id} className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm space-y-1">
                      <p className="text-white font-medium">{accion.descripcion}</p>
                      <p className="text-white/70">Tipo: {accion.tipo} · Responsable: {accion.responsable || "No definido"}</p>
                      <p className="text-white/60">Propuesta: {formatFecha(accion.fechaPropuesta)} · Estado: {accion.estado}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Responsables y firma
              </h2>
              {data.responsables.length === 0 ? (
                <p className="text-sm text-white/60">No hay responsables registrados.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {data.responsables.map((responsable) => (
                    <div key={responsable.id} className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm space-y-1">
                      <p className="text-white font-semibold">{responsable.tipo}</p>
                      <p className="text-white/80">{responsable.nombre}</p>
                      <p className="text-white/60">Cédula: {responsable.cedula || "N/A"}</p>
                      <p className="text-white/60">Cargo: {responsable.cargo || "N/A"}</p>
                      <p className="text-white/60">Firma: {formatFecha(responsable.fechaFirma)}</p>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-white/10 text-white/80 border-white/20">
                          <CheckCircle size={12} className={responsable.tieneFirma ? "text-green-400" : "text-yellow-300"} />
                          {responsable.tieneFirma ? "Firma registrada" : "Sin firma"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Observaciones generales</h2>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{data.observaciones || "Sin observaciones"}</p>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
