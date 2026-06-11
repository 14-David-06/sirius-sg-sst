"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, User } from "lucide-react";

export default function NuevaCampanaPage() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    periodo: "",
    año: new Date().getFullYear(),
    fechaInicio: new Date().toISOString().split("T")[0],
    creadoPor: "",
  });

  const actualizarCampo = (campo: string, valor: any) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  };

  const crearCampana = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const response = await fetch("/api/socio/campanas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Error al crear la campaña");
      }

      // Redirigir al detalle de la campaña creada
      router.push(`/dashboard/sociodemografico/campanas/${data.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/sociodemografico/campanas"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a campañas
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Nueva Campaña Sociodemográfica</h1>
          <p className="text-white/60">Crea una nueva campaña para recolectar datos del personal</p>
        </div>

        {/* Formulario */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-8">
          <form onSubmit={crearCampana} className="space-y-6">
            {/* Nombre */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <FileText className="w-4 h-4" />
                Nombre de la campaña *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => actualizarCampo("nombre", e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Ej: Perfil Sociodemográfico Jun-2026"
                required
              />
              <p className="mt-1 text-xs text-white/50">
                Usa un nombre descriptivo que incluya el mes o periodo
              </p>
            </div>

            {/* Periodo */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <Calendar className="w-4 h-4" />
                Periodo *
              </label>
              <select
                value={formData.periodo}
                onChange={(e) => actualizarCampo("periodo", e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              >
                <option value="">Seleccione un periodo...</option>
                <option value="Semestre_1">Semestre 1 (Ene-Jun)</option>
                <option value="Semestre_2">Semestre 2 (Jul-Dic)</option>
                <option value="Trimestre_1">Trimestre 1 (Ene-Mar)</option>
                <option value="Trimestre_2">Trimestre 2 (Abr-Jun)</option>
                <option value="Trimestre_3">Trimestre 3 (Jul-Sep)</option>
                <option value="Trimestre_4">Trimestre 4 (Oct-Dic)</option>
                <option value="Anual">Anual</option>
              </select>
            </div>

            {/* Año */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Año *</label>
              <input
                type="number"
                value={formData.año}
                onChange={(e) => actualizarCampo("año", parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                min="2020"
                max="2030"
                required
              />
            </div>

            {/* Fecha de inicio */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Fecha de inicio *</label>
              <input
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => actualizarCampo("fechaInicio", e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
              <p className="mt-1 text-xs text-white/50">
                Los colaboradores podrán responder la encuesta desde esta fecha
              </p>
            </div>

            {/* Creado por */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <User className="w-4 h-4" />
                Responsable *
              </label>
              <input
                type="text"
                value={formData.creadoPor}
                onChange={(e) => actualizarCampo("creadoPor", e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Ej: Admin SST"
                required
              />
              <p className="mt-1 text-xs text-white/50">
                Nombre de la persona responsable de la campaña
              </p>
            </div>

            {/* Info box */}
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
              <h4 className="font-semibold text-blue-300 mb-2">ℹ️ ¿Qué sigue después de crear la campaña?</h4>
              <ul className="text-blue-200/80 text-sm space-y-1 list-disc list-inside">
                <li>Seleccionar el personal que participará</li>
                <li>Generar tokens de acceso únicos</li>
                <li>Enviar los enlaces de la encuesta</li>
                <li>Monitorear el progreso de respuestas</li>
              </ul>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex items-center gap-4 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? "Creando..." : "Crear Campaña"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
