"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Calendar, FileText, User, AlertCircle, Loader2, X } from "lucide-react";
import { useSession } from "@/presentation/context/SessionContext";

export default function NuevaCampanaPage() {
  const router = useRouter();
  const { user } = useSession();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    periodo: "",
    año: new Date().getFullYear(),
    fechaInicio: new Date().toISOString().split("T")[0],
    creadoPor: "",
  });

  // Prellenar el responsable con el usuario de la sesión
  useEffect(() => {
    if (user?.nombreCompleto) {
      setFormData((prev) => (prev.creadoPor ? prev : { ...prev, creadoPor: user.nombreCompleto }));
    }
  }, [user]);

  const actualizarCampo = (campo: string, valor: string | number) => {
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
        if (data.detalles && Array.isArray(data.detalles)) {
          const errores = data.detalles
            .map((d: { path: string[]; message: string }) => `${d.path.join(".")}: ${d.message}`)
            .join(", ");
          throw new Error(`${data.error} — ${errores}`);
        }
        throw new Error(data.error || "Error al crear la campaña");
      }

      router.push(`/dashboard/sociodemografico/campanas/${data.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear la campaña");
      setEnviando(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400/50";
  const selectClass = `${inputClass} appearance-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white`;

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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-5">
            <button
              onClick={() => router.push("/dashboard/sociodemografico")}
              className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Panel
            </button>
            <div className="h-8 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Nueva Campaña</h1>
                <p className="text-xs text-white/50">Recolección semestral de datos sociodemográficos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <form onSubmit={crearCampana} className="space-y-5">
            {/* Nombre */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <FileText className="w-4 h-4 text-violet-400" />
                Nombre de la campaña *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => actualizarCampo("nombre", e.target.value)}
                className={inputClass}
                placeholder="Ej: Perfil Sociodemográfico Jun-2026"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Periodo */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                  <Calendar className="w-4 h-4 text-violet-400" />
                  Periodo *
                </label>
                <select
                  value={formData.periodo}
                  onChange={(e) => actualizarCampo("periodo", e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="Semestre_1">Semestre 1 (Enero - Junio)</option>
                  <option value="Semestre_2">Semestre 2 (Julio - Diciembre)</option>
                </select>
              </div>

              {/* Año */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Año *</label>
                <input
                  type="number"
                  value={formData.año}
                  onChange={(e) => actualizarCampo("año", parseInt(e.target.value))}
                  className={inputClass}
                  min="2024"
                  max="2100"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Fecha de inicio */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Fecha de inicio *</label>
                <input
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => actualizarCampo("fechaInicio", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              {/* Responsable */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                  <User className="w-4 h-4 text-violet-400" />
                  Responsable *
                </label>
                <input
                  type="text"
                  value={formData.creadoPor}
                  onChange={(e) => actualizarCampo("creadoPor", e.target.value)}
                  className={inputClass}
                  placeholder="Nombre del responsable SST"
                  required
                />
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
              <p className="text-blue-200/80 text-sm">
                Después de crear la campaña podrás seleccionar el personal participante, generar los
                enlaces únicos de la encuesta y monitorear el progreso de respuestas.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-white text-sm flex-1">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Botones */}
            <div className="flex items-center gap-3 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={() => router.push("/dashboard/sociodemografico")}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                {enviando ? "Creando..." : "Crear Campaña"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
