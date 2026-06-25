"use client";

import { useState } from "react";
import { useSession } from "@/presentation/context/SessionContext";
import { useRouter } from "next/navigation";
import { FileText, Upload, ArrowLeft, Save } from "lucide-react";

// ══════════════════════════════════════════════════════════
// Dashboard Admin: Crear Nueva Política
// ══════════════════════════════════════════════════════════

const categorias = [
  "Seguridad y Salud",
  "Reglamento Interno",
  "Recursos Humanos",
  "General",
];

export default function NuevaPoliticaPage() {
  const router = useRouter();
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    codigo: "",
    titulo: "",
    descripcion: "",
    categoria: "General",
    version: "v001",
    fechaPublicacion: "",
    fechaVigencia: "",
    requiereFirma: false,
    visibleColaboradores: true,
    orden: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!archivo) {
      alert("Debes seleccionar un archivo PDF");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append("codigo", formData.codigo);
      data.append("titulo", formData.titulo);
      data.append("descripcion", formData.descripcion);
      data.append("categoria", formData.categoria);
      data.append("version", formData.version);
      data.append("fechaPublicacion", formData.fechaPublicacion);
      data.append("fechaVigencia", formData.fechaVigencia);
      data.append("requiereFirma", formData.requiereFirma.toString());
      data.append("visibleColaboradores", formData.visibleColaboradores.toString());
      data.append("orden", formData.orden.toString());
      data.append("creadoPor", user?.nombreCompleto || "Sistema");
      data.append("archivo", archivo);

      const res = await fetch("/api/politicas", {
        method: "POST",
        body: data,
      });

      const result = await res.json();

      if (result.success) {
        alert("Política creada exitosamente");
        router.push("/dashboard/politicas/admin");
      } else {
        alert(result.error || "Error al crear política");
      }
    } catch (error) {
      console.error("Error al crear política:", error);
      alert("Error al crear política");
    } finally {
      setLoading(false);
    }
  };

  // Renderizar siempre - La validación de permisos debe hacerse en el backend

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-400/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Nueva Política
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Crea una nueva política empresarial
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 space-y-6">
          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Código de Política *
            </label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              placeholder="Ej: P-SST-001"
              required
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Política de Seguridad y Salud en el Trabajo"
              required
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Breve descripción de la política"
              rows={3}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Categoría y Versión */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Categoría *
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Versión
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="v001"
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fecha de Publicación *
              </label>
              <input
                type="date"
                value={formData.fechaPublicacion}
                onChange={(e) => setFormData({ ...formData, fechaPublicacion: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fecha de Vigencia *
              </label>
              <input
                type="date"
                value={formData.fechaVigencia}
                onChange={(e) => setFormData({ ...formData, fechaVigencia: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Archivo PDF */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Documento PDF *
            </label>
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                required
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {archivo ? archivo.name : "Seleccionar archivo PDF"}
              </label>
            </div>
          </div>

          {/* Opciones */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requiereFirma}
                onChange={(e) => setFormData({ ...formData, requiereFirma: e.target.checked })}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900/50 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-slate-300">Requiere firma de aceptación</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.visibleColaboradores}
                onChange={(e) => setFormData({ ...formData, visibleColaboradores: e.target.checked })}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900/50 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-slate-300">Visible para colaboradores</span>
            </label>
          </div>

          {/* Orden */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Orden de Visualización
            </label>
            <input
              type="number"
              value={formData.orden}
              onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Menor número = mayor prioridad en la lista
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-lg hover:bg-indigo-500/30 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                  Creando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Crear Política
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
