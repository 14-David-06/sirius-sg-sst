"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, RefreshCw, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function RegenerarDocumentoPage() {
  const router = useRouter();
  const [idInduccion, setIdInduccion] = useState("IND-0001");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    success: boolean;
    message: string;
    documentoUrl?: string;
  } | null>(null);

  const handleRegenerar = async () => {
    if (!idInduccion.trim()) {
      alert("Por favor ingresa un ID de inducción");
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const response = await fetch("/api/inducciones/regenerar-documento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idInduccion: idInduccion.trim() }),
      });

      const data = await response.json();
      setResultado(data);

      if (data.success && data.data?.documentoUrl) {
        // Abrir el documento en una nueva pestaña después de 1 segundo
        setTimeout(() => {
          window.open(data.data.documentoUrl, "_blank");
        }, 1000);
      }
    } catch (error) {
      console.error("Error:", error);
      setResultado({
        success: false,
        message: "Error de conexión al servidor",
      });
    } finally {
      setLoading(false);
    }
  };

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
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="Sirius"
                width={240}
                height={64}
                className="h-16 w-auto"
                priority
              />
              <div className="hidden sm:block h-8 w-px bg-white/20" />
              <p className="hidden sm:block text-sm font-semibold text-white/70 tracking-wide uppercase">
                Regenerar Documento de Inducción
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/inducciones")}
              className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              Volver
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Card Principal */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/15 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Regenerar Documento de Inducción</h1>
              <p className="text-sm text-white/60">
                Actualiza el documento PDF con los últimos cambios
              </p>
            </div>
          </div>

          {/* Información */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">¿Qué hace esto?</h3>
            <ul className="text-sm text-white/70 space-y-1">
              <li>✅ Regenera el documento PDF con la firma del responsable SST más grande y centrada</li>
              <li>✅ Corrige el problema de fecha (día anterior)</li>
              <li>✅ Aplica todas las mejoras recientes al formato</li>
              <li>✅ Actualiza el enlace del certificado en Airtable</li>
            </ul>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            <div>
              <label htmlFor="idInduccion" className="block text-sm font-semibold text-white/80 mb-2">
                ID de la Inducción *
              </label>
              <input
                type="text"
                id="idInduccion"
                value={idInduccion}
                onChange={(e) => setIdInduccion(e.target.value)}
                placeholder="Ejemplo: IND-0001"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              />
              <p className="mt-2 text-xs text-white/60">
                Ingresa el ID de la inducción que quieres regenerar (ej: IND-0001)
              </p>
            </div>

            <button
              onClick={handleRegenerar}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Regenerando documento...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Regenerar Documento
                </>
              )}
            </button>
          </div>

          {/* Resultado */}
          {resultado && (
            <div
              className={`mt-6 p-4 rounded-xl border ${
                resultado.success
                  ? "bg-green-500/10 border-green-400/30"
                  : "bg-red-500/10 border-red-400/30"
              }`}
            >
              <div className="flex items-start gap-3">
                {resultado.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3
                    className={`font-semibold mb-1 ${
                      resultado.success ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {resultado.success ? "✅ Documento Regenerado" : "❌ Error"}
                  </h3>
                  <p className="text-sm text-white/70 mb-3">{resultado.message}</p>

                  {resultado.success && resultado.documentoUrl && (
                    <a
                      href={resultado.documentoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Descargar Documento PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instrucciones adicionales */}
        <div className="mt-6 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <h3 className="text-sm font-semibold text-white mb-3">💡 Notas Importantes</h3>
          <ul className="text-sm text-white/60 space-y-2">
            <li>• El documento se abrirá automáticamente en una nueva pestaña</li>
            <li>• La URL del certificado en Airtable se actualizará automáticamente</li>
            <li>• Solo funciona para inducciones que ya han sido firmadas por el empleado</li>
            <li>• El proceso toma aproximadamente 3-5 segundos</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
