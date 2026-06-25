"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/presentation/context/SessionContext";
import { useRouter } from "next/navigation";
import { FileText, Plus, Edit, Trash2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

// ══════════════════════════════════════════════════════════
// Dashboard Admin: Gestión de Políticas Empresariales
// Solo accesible para administradores
// ══════════════════════════════════════════════════════════

type Politica = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  version: string;
  fechaPublicacion: string;
  fechaVigencia: string;
  estado: string;
  urlDocumento: string;
  requiereFirma: boolean;
  visibleColaboradores: boolean;
  orden: number;
};

export default function PoliticasAdminPage() {
  const router = useRouter();
  const { user } = useSession();
  const [politicas, setPoliticas] = useState<Politica[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("Activa");

  useEffect(() => {
    // TODO: Verificar permisos de administrador según tu lógica de roles
    // Por ahora, solo verifica que el usuario exista
    if (!user) {
      return;
    }

    cargarPoliticas();
  }, [user, filtroEstado]);

  const cargarPoliticas = async () => {
    try {
      setLoading(true);
      const url = `/api/politicas?incluirInactivas=true`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        let politicasFiltradas = data.data;
        if (filtroEstado !== "todas") {
          politicasFiltradas = politicasFiltradas.filter((p: Politica) => p.estado === filtroEstado);
        }
        setPoliticas(politicasFiltradas);
      }
    } catch (error) {
      console.error("Error al cargar políticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const cambiarVisibilidad = async (politicaId: string, visibleActual: boolean) => {
    if (!confirm(`¿Deseas ${visibleActual ? "ocultar" : "mostrar"} esta política a los colaboradores?`)) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("visibleColaboradores", (!visibleActual).toString());
      formData.append("modificadoPor", user?.nombreCompleto || "Sistema");

      const res = await fetch(`/api/politicas/${politicaId}`, {
        method: "PUT",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        alert("Visibilidad actualizada correctamente");
        cargarPoliticas();
      } else {
        alert("Error al actualizar visibilidad");
      }
    } catch (error) {
      console.error("Error al cambiar visibilidad:", error);
      alert("Error al cambiar visibilidad");
    }
  };

  const eliminarPolitica = async (politicaId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta política? Se marcará como obsoleta.")) {
      return;
    }

    try {
      const res = await fetch(`/api/politicas/${politicaId}?modificadoPor=${encodeURIComponent(user?.nombreCompleto || "Sistema")}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("Política eliminada correctamente");
        cargarPoliticas();
      } else {
        alert("Error al eliminar política");
      }
    } catch (error) {
      console.error("Error al eliminar política:", error);
      alert("Error al eliminar política");
    }
  };

  // Renderizar siempre - La validación de permisos debe hacerse en el backend

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-400/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Administrar Políticas
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Gestiona las políticas empresariales del sistema
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/dashboard/politicas/admin/nueva")}
            className="px-6 py-3 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-lg hover:bg-indigo-500/30 transition-all font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nueva Política
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-2">
          {["Activa", "En revisión", "Obsoleta", "todas"].map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtroEstado === estado
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/30"
                  : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50"
              }`}
            >
              {estado === "todas" ? "Todas" : estado}
            </button>
          ))}
        </div>

        {/* Tabla de Políticas */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-4">Cargando políticas...</p>
          </div>
        ) : politicas.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 border border-slate-700 rounded-xl">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No hay políticas con este estado</p>
          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Código</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Título</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Categoría</th>
                    <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase">Estado</th>
                    <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase">Visible</th>
                    <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase">Req. Firma</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {politicas.map((politica) => (
                    <tr key={politica.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-400 bg-slate-900/50 px-2 py-1 rounded">
                          {politica.codigo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{politica.titulo}</p>
                          <p className="text-xs text-slate-500 mt-1">v{politica.version}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{politica.categoria}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            politica.estado === "Activa"
                              ? "bg-green-500/10 text-green-400"
                              : politica.estado === "En revisión"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {politica.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => cambiarVisibilidad(politica.id, politica.visibleColaboradores)}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                          {politica.visibleColaboradores ? (
                            <Eye className="w-5 h-5 text-green-400" />
                          ) : (
                            <EyeOff className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {politica.requiereFirma ? (
                          <CheckCircle className="w-5 h-5 text-blue-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.open(politica.urlDocumento, "_blank")}
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Ver documento"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/politicas/admin/editar/${politica.id}`)}
                            className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarPolitica(politica.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
