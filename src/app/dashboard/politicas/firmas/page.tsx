"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Users,
  UserCheck,
  UserX,
  Send,
  Check,
  Loader2,
  Search,
} from "lucide-react";

interface Politica {
  id: string;
  codigo: string;
  titulo: string;
  categoria: string;
}

interface Usuario {
  id: string;
  idEmpleado: string;
  nombreCompleto: string;
  cargo: string;
  fechaFirma?: string;
}

interface Estadisticas {
  total: number;
  totalFirmaron: number;
  totalPendientes: number;
  porcentajeFirmado: string;
  firmaron: Usuario[];
  pendientes: Usuario[];
}

function PoliticasFirmasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const politicaId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [politica, setPolitica] = useState<Politica | null>(null);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "firmaron" | "pendientes">("todos");

  const [generandoLinks, setGenerandoLinks] = useState<Set<string>>(new Set());
  const [linksCopied, setLinksCopied] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!politicaId) {
      setError("No se proporcionó el ID de la política");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        // Cargar política
        const resPolitica = await fetch(`/api/politicas/${politicaId}`);
        if (!resPolitica.ok) throw new Error("No se pudo cargar la política");
        const dataPolitica = await resPolitica.json();
        setPolitica(dataPolitica.data);

        // Cargar estadísticas
        const resStats = await fetch(`/api/politicas/estadisticas?politicaId=${politicaId}`);
        if (!resStats.ok) throw new Error("No se pudo cargar estadísticas");
        const dataStats = await resStats.json();
        setEstadisticas(dataStats.data);

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }

    loadData();
  }, [politicaId]);

  const generarLink = async (idEmpleado: string) => {
    if (!politicaId) return;

    setGenerandoLinks((prev) => new Set(prev).add(idEmpleado));

    try {
      const response = await fetch("/api/politicas/generar-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ politicaId, idEmpleado, diasValidos: 30 }),
      });

      if (!response.ok) {
        throw new Error("Error al generar link");
      }

      const data = await response.json();

      // Copiar al portapapeles
      await navigator.clipboard.writeText(data.data.url);
      setLinksCopied((prev) => new Set(prev).add(idEmpleado));

      setTimeout(() => {
        setLinksCopied((prev) => {
          const newSet = new Set(prev);
          newSet.delete(idEmpleado);
          return newSet;
        });
      }, 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerandoLinks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(idEmpleado);
        return newSet;
      });
    }
  };

  const usuariosFiltrados = () => {
    if (!estadisticas) return [];

    let usuarios: Usuario[] = [];

    if (filtro === "todos") {
      usuarios = [...estadisticas.firmaron, ...estadisticas.pendientes];
    } else if (filtro === "firmaron") {
      usuarios = estadisticas.firmaron;
    } else {
      usuarios = estadisticas.pendientes;
    }

    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      usuarios = usuarios.filter(
        (u) =>
          u.nombreCompleto.toLowerCase().includes(termino) ||
          u.cargo.toLowerCase().includes(termino) ||
          u.idEmpleado.toLowerCase().includes(termino)
      );
    }

    return usuarios;
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="fixed inset-0 -z-10">
          <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        </div>
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <div className="fixed inset-0 -z-10">
          <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        </div>
        <div className="bg-red-500/10 backdrop-blur-2xl border border-red-400/30 rounded-2xl p-8 max-w-md">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white text-center mb-2">Error</h2>
          <p className="text-white/70 text-center">{error}</p>
        </div>
      </div>
    );
  }

  const usuarios = usuariosFiltrados();

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-10">
        <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard/politicas")}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a Políticas
          </button>

          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              Administración de Firmas
            </h1>
            <p className="text-white/60 text-lg">
              {politica?.codigo} - {politica?.titulo}
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Total</p>
                <p className="text-2xl font-bold text-white">{estadisticas?.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Firmaron</p>
                <p className="text-2xl font-bold text-white">{estadisticas?.totalFirmaron}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                <UserX className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Pendientes</p>
                <p className="text-2xl font-bold text-white">{estadisticas?.totalPendientes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Progreso</p>
                <p className="text-2xl font-bold text-white">{estadisticas?.porcentajeFirmado}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Buscar por nombre, cargo o ID..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFiltro("todos")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filtro === "todos"
                    ? "bg-indigo-600 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltro("firmaron")}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  filtro === "firmaron"
                    ? "bg-green-600 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Firmaron
              </button>
              <button
                onClick={() => setFiltro("pendientes")}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  filtro === "pendientes"
                    ? "bg-amber-600 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                <UserX className="w-4 h-4" />
                Pendientes
              </button>
            </div>
          </div>
        </div>

        {/* Lista de usuarios */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/70">Estado</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/70">ID</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/70">Nombre</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/70">Cargo</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/70">Fecha Firma</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/70">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {usuarios.map((usuario) => {
                  const firmado = !!usuario.fechaFirma;
                  const generando = generandoLinks.has(usuario.idEmpleado);
                  const copied = linksCopied.has(usuario.idEmpleado);

                  return (
                    <tr key={usuario.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        {firmado ? (
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">Firmado</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-400">
                            <XCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Pendiente</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-white/70 text-sm">{usuario.idEmpleado}</td>
                      <td className="px-6 py-4 text-white font-medium">{usuario.nombreCompleto}</td>
                      <td className="px-6 py-4 text-white/70 text-sm">{usuario.cargo}</td>
                      <td className="px-6 py-4 text-white/70 text-sm">
                        {firmado && usuario.fechaFirma
                          ? new Date(usuario.fechaFirma).toLocaleDateString("es-CO")
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {!firmado && (
                          <button
                            onClick={() => generarLink(usuario.idEmpleado)}
                            disabled={generando}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                          >
                            {generando ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generando...
                              </>
                            ) : copied ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Generar Link
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {usuarios.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-white/40">No se encontraron usuarios</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


export default function PoliticasFirmasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen relative flex items-center justify-center">
          <div className="fixed inset-0 -z-10">
            <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          </div>
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <PoliticasFirmasContent />
    </Suspense>
  );
}
