"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { PenTool, Eraser, Check, AlertCircle, CheckCircle, Loader2, FileText, ShieldCheck } from "lucide-react";
import Image from "next/image";

// ══════════════════════════════════════════════════════════
// Componente de Firma de Canvas
// ══════════════════════════════════════════════════════════
function SignatureCanvas({
  onConfirm,
  loading,
}: {
  onConfirm: (dataUrl: string) => void;
  loading: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const hasStrokes = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
    hasStrokes.current = true;
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    hasStrokes.current = false;
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    if (!canvasRef.current || !hasStrokes.current) return;
    onConfirm(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border-2 border-indigo-200 bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          width={700}
          height={220}
          className="w-full h-[180px] sm:h-[200px] cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <div className="absolute bottom-2 right-2 text-xs text-slate-400 pointer-events-none">
          Firme aquí
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clearCanvas}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          disabled={loading}
        >
          <Eraser className="w-4 h-4" />
          Limpiar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isEmpty || loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirmando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Confirmar Firma
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Página de Firma de Política
// ══════════════════════════════════════════════════════════
function FirmarPoliticaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const politicaIdDirect = searchParams.get("id");
  const idEmpleadoDirect = searchParams.get("emp");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [politica, setPolitica] = useState<any>(null);
  const [empleado, setEmpleado] = useState<any>(null);
  const [step, setStep] = useState<"documento" | "firma">("documento");
  const [leido, setLeido] = useState(false);

  const [politicaId, setPoliticaId] = useState<string | null>(null);
  const [idEmpleado, setIdEmpleado] = useState<string | null>(null);

  // Cargar datos de la política y empleado
  useEffect(() => {
    async function loadData() {
      try {
        let finalPoliticaId = politicaIdDirect;
        let finalIdEmpleado = idEmpleadoDirect;

        // Si hay token, validarlo primero
        if (token) {
          const resToken = await fetch(`/api/politicas/token?token=${token}`);
          if (!resToken.ok) {
            const dataToken = await resToken.json();
            throw new Error(dataToken.error || "Token inválido");
          }
          const dataToken = await resToken.json();
          finalPoliticaId = dataToken.data.politicaId;
          finalIdEmpleado = dataToken.data.idEmpleado;
        }

        if (!finalPoliticaId || !finalIdEmpleado) {
          setError("Faltan parámetros requeridos");
          setLoading(false);
          return;
        }

        setPoliticaId(finalPoliticaId);
        setIdEmpleado(finalIdEmpleado);

        // Cargar política
        const resPolitica = await fetch(`/api/politicas/${finalPoliticaId}`);
        if (!resPolitica.ok) throw new Error("No se pudo cargar la política");
        const dataPolitica = await resPolitica.json();
        setPolitica(dataPolitica.data);

        // Cargar empleado
        console.log("🔍 Cargando empleado con ID:", finalIdEmpleado);
        const resEmpleado = await fetch(`/api/personal?idEmpleado=${finalIdEmpleado}`);
        if (!resEmpleado.ok) throw new Error("No se pudo cargar información del empleado");
        const dataEmpleado = await resEmpleado.json();
        console.log("👤 Datos empleado recibidos:", dataEmpleado);
        if (dataEmpleado.data && dataEmpleado.data.length > 0) {
          setEmpleado(dataEmpleado.data[0]);
          console.log("✅ Empleado establecido:", dataEmpleado.data[0]);
        } else {
          console.error("❌ No se encontró empleado con ID:", finalIdEmpleado);
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }

    loadData();
  }, [token, politicaIdDirect, idEmpleadoDirect]);

  const handleConfirmFirma = async (firmaDataUrl: string) => {
    if (!politicaId || !idEmpleado || !empleado) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/politicas/firmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          politicaId,
          idEmpleado,
          nombreEmpleado: empleado.nombreCompleto,
          firma: firmaDataUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al registrar firma");
      }

      setSuccess(true);

      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push("/dashboard/politicas");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  // Estados de carga y error
  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="fixed inset-0 -z-10">
          <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        </div>
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
          <p className="text-white/60">Cargando política...</p>
        </div>
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
        <div className="bg-white/10 backdrop-blur-2xl border border-red-400/30 rounded-2xl p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white text-center mb-2">Error</h2>
          <p className="text-white/70 text-center">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <div className="fixed inset-0 -z-10">
          <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        </div>
        <div className="bg-white/10 backdrop-blur-2xl border border-green-400/30 rounded-2xl p-8 max-w-md">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white text-center mb-2">¡Firma Registrada!</h2>
          <p className="text-white/70 text-center mb-4">
            Tu firma ha sido registrada exitosamente para la política <strong>{politica?.codigo}</strong>
          </p>
          <p className="text-white/50 text-sm text-center">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Vista del documento
  if (step === "documento") {
    return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 -z-10">
          <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-1">{politica?.codigo}</h1>
                <h2 className="text-xl text-white/80 mb-2">{politica?.titulo}</h2>
                <p className="text-white/60 text-sm">{politica?.descripcion}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 mb-6">
            <div className="aspect-[1/1.4] bg-white rounded-lg">
              <iframe
                src={politica?.urlDocumento}
                className="w-full h-full rounded-lg"
                title="Documento de Política"
              />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-6">
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={leido}
                onChange={(e) => setLeido(e.target.checked)}
                className="w-5 h-5 rounded border-white/30 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-white text-sm">
                He leído y entendido el contenido de esta política
              </span>
            </label>

            <button
              onClick={() => setStep("firma")}
              disabled={!leido}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <PenTool className="w-5 h-5" />
              Continuar a Firma Digital
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de firma
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="fixed inset-0 -z-10">
        <Image src="/20032025-DSC_3717.jpg" alt="" fill className="object-cover" priority quality={85} />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-8 max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Firma Digital</h2>
            <p className="text-white/60 text-sm">{politica?.codigo} - {empleado?.nombreCompleto}</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4 mb-6">
          <p className="text-amber-200 text-sm">
            <strong>Importante:</strong> Al firmar este documento, confirmas que has leído y aceptado todos los términos de la política.
            Tu firma quedará registrada digitalmente en el sistema.
          </p>
        </div>

        <SignatureCanvas onConfirm={handleConfirmFirma} loading={submitting} />

        <button
          onClick={() => setStep("documento")}
          className="mt-4 w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
          disabled={submitting}
        >
          ← Volver al documento
        </button>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-400/30 rounded-lg p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FirmarPoliticaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen relative flex items-center justify-center">
          <div className="fixed inset-0 -z-10 bg-slate-900" />
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <FirmarPoliticaContent />
    </Suspense>
  );
}
