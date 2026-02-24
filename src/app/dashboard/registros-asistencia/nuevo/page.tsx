"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  Search,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
  X,
  Users,
  Calendar,
  User,
  FileDown,
  PenTool,
  Eraser,
  Check,
  History,
  BookOpen,
  ChevronDown,
  Mic,
  MicOff,
} from "lucide-react";
import { useSession } from "@/presentation/context/SessionContext";

// ══════════════════════════════════════════════════════════
// Tipos
// ══════════════════════════════════════════════════════════
interface Capacitacion {
  id: string;
  codigo: string;
  nombre: string;
  intensidad: string;
  tipo: string; // "Presencial y Virtual" | "Presencial"
}

interface ProgramacionItem {
  id: string;
  identificador: string;
  mes: string;
  trimestre: string;
  programado: boolean;
  ejecutado: boolean;
  fechaEjecucion: string;
  totalAsistentes: number;
  capacitacionNombre: string;
  capacitacionCodigo: string;
  observaciones: string;
}

interface PersonalItem {
  id: string;
  idEmpleado: string;
  nombreCompleto: string;
  numeroDocumento: string;
  tipoPersonal: string;
  estado: string;
  fotoPerfil: { url: string; filename: string } | null;
}

interface AsistenteRow {
  id: string;
  persona: PersonalItem;
  firma: string | null;
  detalleRecordId?: string;
}

type PageStep = "form" | "asistentes";
type PageState = "idle" | "saving" | "success" | "error";

let _uid = 0;
function uid() { return `asis-${++_uid}-${Date.now()}`; }

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

// ══════════════════════════════════════════════════════════
// Componente Canvas de Firma
// ══════════════════════════════════════════════════════════
function SignatureCanvas({
  onConfirm,
  onCancel,
  nombrePersona,
  titulo = "Firma del Asistente",
}: {
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
  nombrePersona: string;
  titulo?: string;
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
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    hasStrokes.current = false;
    setIsEmpty(true);
  };

  const confirmSignature = () => {
    if (!canvasRef.current || !hasStrokes.current) return;
    onConfirm(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">{titulo}</h3>
          <p className="text-sm text-white/60 mt-1">{nombrePersona}</p>
        </div>
        <div className="p-4">
          <div className="relative rounded-xl overflow-hidden border border-white/20 bg-white">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full h-[160px] cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <PenTool className="w-4 h-4" /> Firme aquí
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={clearCanvas}
              className="flex-1 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white/60 text-sm font-medium hover:bg-white/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Eraser className="w-4 h-4" /> Limpiar
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={confirmSignature}
              disabled={isEmpty}
              className="flex-1 py-2.5 rounded-lg bg-green-500/25 border border-green-400/30 text-green-300 text-sm font-semibold hover:bg-green-500/35 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Componente principal
// ══════════════════════════════════════════════════════════
export default function NuevoRegistroPage() {
  const router = useRouter();
  const { user } = useSession();

  // Paso del flujo
  const [step, setStep] = useState<PageStep>("form");
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // IDs del registro creado
  const [registroRecordId, setRegistroRecordId] = useState<string | null>(null);
  const [registroIdLabel, setRegistroIdLabel] = useState<string>("");

  // Datos del formulario (Paso 1)
  const [nombreEvento, setNombreEvento] = useState("");
  const [ciudad, setCiudad] = useState("Barranca de Upia");
  const [fecha, setFecha] = useState(formatDate(new Date()));
  const [horaInicio, setHoraInicio] = useState("");
  const [lugar, setLugar] = useState("Oficinas de Sirius");
  const [duracion, setDuracion] = useState("");
  const [temasTratados, setTemasTratados] = useState("");
  const [nombreConferencista, setNombreConferencista] = useState("");
  const [tipoEvento, setTipoEvento] = useState("Capacitación");

  // Programación Capacitaciones (selector de actividad)
  const [programaciones, setProgramaciones] = useState<ProgramacionItem[]>([]);
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [capSearch, setCapSearch] = useState("");
  const [showCapDropdown, setShowCapDropdown] = useState(false);
  const [selectedProg, setSelectedProg] = useState<ProgramacionItem | null>(null);
  const capDropdownRef = useRef<HTMLDivElement>(null);

  // Grabador de voz (Temas Tratados)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Paso 2: lista de asistentes
  const [asistentes, setAsistentes] = useState<AsistenteRow[]>([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal firma
  const [firmandoId, setFirmandoId] = useState<string | null>(null);
  const [firmandoConferencista, setFirmandoConferencista] = useState(false);
  const [conferencistaFirmado, setConferencistaFirmado] = useState(false);

  // Precargar nombre del conferencista con el usuario actual
  useEffect(() => {
    if (user?.nombreCompleto && !nombreConferencista) {
      setNombreConferencista(user.nombreCompleto);
    }
  }, [user, nombreConferencista]);

  // Cargar programaciones pendientes al montar
  const fetchProgramaciones = useCallback(async () => {
    setLoadingCaps(true);
    try {
      const res = await fetch("/api/programacion-capacitaciones");
      const json = await res.json();
      if (json.success) setProgramaciones(json.data);
    } catch {
      console.error("Error cargando programaciones");
    } finally {
      setLoadingCaps(false);
    }
  }, []);

  useEffect(() => {
    fetchProgramaciones();
  }, [fetchProgramaciones]);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (capDropdownRef.current && !capDropdownRef.current.contains(e.target as Node)) {
        setShowCapDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Grabación de voz → Whisper
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const fd = new FormData();
          fd.append("audio", blob, "grabacion.webm");
          const res = await fetch("/api/transcribir", { method: "POST", body: fd });
          const json = await res.json();
          if (json.success && json.texto) {
            setTemasTratados((prev) =>
              prev ? `${prev.trimEnd()} ${json.texto}` : json.texto
            );
          }
        } catch {
          console.error("Error transcribiendo");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setErrorMessage("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  };

  // Paso 1 → Paso 2: Crear registros de asistencia en Airtable
  const crearRegistro = async () => {
    if (!selectedProg) {
      setErrorMessage("Selecciona una programación");
      return;
    }

    setPageState("saving");
    setErrorMessage(null);
    setLoadingPersonal(true);

    try {
      // Cargar el personal activo
      const res = await fetch("/api/personal");
      const json = await res.json();
      if (!json.success) throw new Error("Error cargando personal");

      const asistentesPayload = json.data.map((p: PersonalItem) => ({
        idEmpleado: p.idEmpleado,
        nombreCompleto: p.nombreCompleto,
        cedula: p.numeroDocumento,
        labor: p.tipoPersonal || "",
      }));

      const payload = {
        capacitacionCodigo: selectedProg.capacitacionCodigo || selectedProg.identificador,
        programacionRecordId: selectedProg.id,
        eventoData: {
          ciudad,
          lugar,
          fecha,
          horaInicio,
          duracion,
          temasTratados,
          nombreConferencista,
          tipoEvento,
        },
        asistentes: asistentesPayload,
        fechaRegistro: fecha,
      };

      const createRes = await fetch("/api/registros-asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const createJson = await createRes.json();
      if (!createJson.success) throw new Error(createJson.message || "Error creando el registro");

      setRegistroRecordId(createJson.data.recordId);
      setRegistroIdLabel(createJson.data.id);

      // Construir lista local con los detalleIds retornados
      const detalleIds: string[] = createJson.data.detalleIds || [];
      const rows: AsistenteRow[] = json.data.map((p: PersonalItem, idx: number) => ({
        id: uid(),
        persona: p,
        firma: null,
        detalleRecordId: detalleIds[idx] || undefined,
      }));
      setAsistentes(rows);

      setPageState("idle");
      setStep("asistentes");
    } catch (err) {
      setPageState("error");
      setErrorMessage(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoadingPersonal(false);
    }
  };

  // Firmar asistente
  const firmarAsistente = async (asistenteId: string, firmaDataUrl: string) => {
    const asistente = asistentes.find((a) => a.id === asistenteId);
    if (!asistente || !registroRecordId) return;

    try {
      const res = await fetch("/api/registros-asistencia/firmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "asistente",
          registroRecordId,
          detalleRecordId: asistente.detalleRecordId,
          firmaDataUrl,
          nombre: asistente.persona.nombreCompleto,
          idEmpleado: asistente.persona.idEmpleado,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAsistentes((prev) =>
          prev.map((a) => (a.id === asistenteId ? { ...a, firma: firmaDataUrl } : a))
        );
      } else {
        setErrorMessage(json.message || "Error guardando firma");
      }
    } catch {
      setErrorMessage("Error guardando firma");
    }
    setFirmandoId(null);
  };

  // Firmar conferencista y completar registro
  const firmarConferencista = async (firmaDataUrl: string) => {
    if (!registroRecordId) return;

    try {
      const res = await fetch("/api/registros-asistencia/firmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "conferencista",
          registroRecordId,
          firmaDataUrl,
          nombre: nombreConferencista,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConferencistaFirmado(true);
        setPageState("success");
      } else {
        setErrorMessage(json.message || "Error guardando firma del conferencista");
      }
    } catch {
      setErrorMessage("Error guardando firma del conferencista");
    }
    setFirmandoConferencista(false);
  };

  // Exportar Excel
  const exportarExcel = async () => {
    if (!registroRecordId) return;
    try {
      const res = await fetch("/api/registros-asistencia/exportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registroRecordId }),
      });
      if (!res.ok) throw new Error("Error al generar el archivo");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Asistencia_${nombreEvento.replace(/\s+/g, "_")}_${fecha}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error al exportar");
    }
  };

  const asistentesFiltrados = asistentes.filter(
    (a) =>
      a.persona.nombreCompleto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.persona.numeroDocumento.includes(searchQuery)
  );

  const firmados = asistentes.filter((a) => a.firma !== null).length;
  const total = asistentes.length;

  const asistenteFirmando = firmandoId ? asistentes.find((a) => a.id === firmandoId) : null;

  // ══════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════
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
                onClick={() => step === "asistentes" ? setStep("form") : router.push("/dashboard/registros-asistencia")}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 backdrop-blur-sm">
                  <ClipboardList className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">
                    {step === "form" ? "Nuevo Registro de Asistencia" : `Registro ${registroIdLabel}`}
                  </h1>
                  <p className="text-xs text-white/60">
                    {step === "form" ? "Paso 1 de 2 — Datos del evento" : "Paso 2 de 2 — Registro de firmas"}
                  </p>
                </div>
              </div>
            </div>
            {step === "asistentes" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/dashboard/registros-asistencia/historial")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
                >
                  <History size={18} />
                  <span className="hidden sm:inline">Historial</span>
                </button>
                <button
                  onClick={exportarExcel}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sirius-verde/20 hover:bg-sirius-verde/30 text-white border border-sirius-verde/30 transition-all"
                >
                  <FileDown size={18} />
                  <span className="hidden sm:inline">Exportar Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mensajes */}
        {errorMessage && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-white">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p>{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="ml-auto p-1 hover:bg-white/10 rounded">
              <X size={16} />
            </button>
          </div>
        )}
        {pageState === "success" && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-white">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p>Registro completado exitosamente. Ya puedes exportar el Excel.</p>
          </div>
        )}

        {/* ── PASO 1: FORMULARIO ────────────────────────────── */}
        {step === "form" && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-300" />
              Datos del Evento
            </h2>

            {/* Selector de Programación / Capacitación */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                Actividad programada <span className="text-red-400">*</span>
              </label>
              <div className="relative" ref={capDropdownRef}>
                {/* Botón principal del selector */}
                <button
                  type="button"
                  onClick={() => setShowCapDropdown((v) => !v)}
                  className={`w-full px-4 py-2.5 rounded-lg border text-left flex items-center justify-between gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400/50 ${
                    selectedProg
                      ? "bg-purple-500/20 border-purple-400/40 text-white"
                      : "bg-white/10 border-white/20 text-white/40"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <BookOpen className="w-4 h-4 shrink-0 text-purple-300" />
                    {selectedProg
                      ? `${selectedProg.identificador} · ${selectedProg.capacitacionNombre || selectedProg.identificador}`
                      : "Seleccionar programación..."}
                  </span>
                  {loadingCaps ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white/40 shrink-0" />
                  ) : (
                    <ChevronDown className={`w-4 h-4 shrink-0 text-white/40 transition-transform ${showCapDropdown ? "rotate-180" : ""}`} />
                  )}
                </button>

                {/* Dropdown */}
                {showCapDropdown && (
                  <div className="absolute z-20 mt-1 w-full bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden">
                    {/* Buscador interno */}
                    <div className="p-2 border-b border-white/10">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                        <input
                          type="text"
                          autoFocus
                          value={capSearch}
                          onChange={(e) => setCapSearch(e.target.value)}
                          placeholder="Buscar programación..."
                          className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                        />
                      </div>
                    </div>
                    {/* Lista: mostrar primero las pendientes (no ejecutadas), luego el resto */}
                    <div className="max-h-60 overflow-y-auto">
                      {(() => {
                        const filtered = programaciones.filter((p) =>
                          (p.identificador + " " + p.capacitacionNombre + " " + p.mes)
                            .toLowerCase()
                            .includes(capSearch.toLowerCase())
                        );
                        const pending   = filtered.filter((p) => p.programado && !p.ejecutado);
                        const executed  = filtered.filter((p) => p.ejecutado);
                        const others    = filtered.filter((p) => !p.programado && !p.ejecutado);
                        const sorted    = [...pending, ...others, ...executed];
                        if (sorted.length === 0) {
                          return (
                            <p className="px-4 py-3 text-sm text-white/40 text-center">
                              No se encontraron programaciones
                            </p>
                          );
                        }
                        return sorted.map((prog) => (
                          <button
                            key={prog.id}
                            type="button"
                            onClick={() => {
                              setSelectedProg(prog);
                              setNombreEvento(prog.capacitacionNombre || prog.identificador);
                              if (prog.capacitacionNombre) setTemasTratados(prog.capacitacionNombre);
                              setShowCapDropdown(false);
                              setCapSearch("");
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-purple-500/20 transition-colors flex items-start gap-2 ${
                              selectedProg?.id === prog.id
                                ? "bg-purple-500/25 text-purple-200"
                                : "text-white/80"
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5 mt-1 shrink-0 text-purple-400/60" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-purple-400/70 font-mono">{prog.identificador}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 border border-white/10">
                                  {prog.mes} · {prog.trimestre}
                                </span>
                                {prog.ejecutado && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-400/20">
                                    Ejecutada
                                  </span>
                                )}
                                {prog.programado && !prog.ejecutado && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/20">
                                    Pendiente
                                  </span>
                                )}
                              </div>
                              <span className="block truncate text-sm">{prog.capacitacionNombre || prog.identificador}</span>
                              {prog.capacitacionCodigo && (
                                <span className="block text-xs text-white/40">{prog.capacitacionCodigo}</span>
                              )}
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tipo de Evento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Tipo de Evento</label>
                <select
                  value={tipoEvento}
                  onChange={(e) => setTipoEvento(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                >
                  <option value="Capacitación" className="bg-slate-900">Capacitación</option>
                  <option value="Inducción" className="bg-slate-900">Inducción</option>
                  <option value="Charla" className="bg-slate-900">Charla</option>
                  <option value="Otro" className="bg-slate-900">Otro</option>
                </select>
              </div>
            </div>

            {/* Ciudad, Fecha, Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Hora de Inicio</label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                />
              </div>
            </div>

            {/* Lugar, Duración */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Lugar</label>
                <input
                  type="text"
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Duración</label>
                <input
                  type="text"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  placeholder="Ej: 2 horas"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                />
              </div>
            </div>

            {/* Temas Tratados */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-white/70">Temas Tratados</label>
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={isTranscribing}
                  title={isRecording ? "Detener grabación" : "Grabar con micrófono"}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRecording
                      ? "bg-red-500/25 border-red-400/40 text-red-300 animate-pulse"
                      : isTranscribing
                      ? "bg-yellow-500/20 border-yellow-400/30 text-yellow-300"
                      : "bg-white/10 border-white/20 text-white/60 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Transcribiendo...
                    </>
                  ) : isRecording ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      Detener
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      Dictar
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={temasTratados}
                onChange={(e) => setTemasTratados(e.target.value)}
                rows={3}
                placeholder="Describe los temas que se tratarán en el evento, o usa el micrófono para dictarlos..."
                className={`w-full px-4 py-2.5 rounded-lg bg-white/10 border text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400/50 resize-none transition-colors ${
                  isRecording ? "border-red-400/40 ring-1 ring-red-400/30" : "border-white/20"
                }`}
              />
            </div>

            {/* Conferencista */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Nombre del Conferencista</label>
              <input
                type="text"
                value={nombreConferencista}
                onChange={(e) => setNombreConferencista(e.target.value)}
                placeholder="Nombre completo del conferencista"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              />
            </div>

            {/* Botón continuar */}
            <div className="flex justify-end pt-2">
              <button
                onClick={crearRegistro}
                disabled={pageState === "saving"}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500/30 border border-purple-400/40 text-white font-semibold hover:bg-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {pageState === "saving" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Users size={18} />
                )}
                Continuar al Registro de Asistentes
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 2: REGISTRO DE ASISTENTES ───────────────── */}
        {step === "asistentes" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/10 p-4">
                <p className="text-xs text-white/60">Evento</p>
                <p className="text-sm font-bold text-white truncate">{nombreEvento}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/10 p-4">
                <p className="text-xs text-white/60">Fecha</p>
                <p className="text-sm font-bold text-purple-300">{fecha}</p>
              </div>
              <div className="bg-green-500/15 backdrop-blur-xl rounded-xl border border-green-500/20 p-4">
                <p className="text-xs text-white/60">Firmados</p>
                <p className="text-2xl font-bold text-green-400">{firmados} / {total}</p>
              </div>
              <div className={`backdrop-blur-xl rounded-xl border p-4 ${conferencistaFirmado ? "bg-green-500/15 border-green-500/20" : "bg-white/10 border-white/10"}`}>
                <p className="text-xs text-white/60">Conferencista</p>
                <p className={`text-sm font-bold ${conferencistaFirmado ? "text-green-400" : "text-white/60"}`}>
                  {conferencistaFirmado ? "✓ Firmado" : "Pendiente"}
                </p>
              </div>
            </div>

            {/* Barra de búsqueda */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-300" />
                Lista de Asistentes ({asistentesFiltrados.length})
              </h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar asistente..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-sm"
                />
              </div>
            </div>

            {/* Tabla de asistentes */}
            {loadingPersonal ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-purple-500/20 border-b border-white/10">
                        <th className="text-left text-xs font-semibold text-white/80 px-3 py-3 w-10">#</th>
                        <th className="text-left text-xs font-semibold text-white/80 px-3 py-3">Nombres y Apellidos</th>
                        <th className="text-left text-xs font-semibold text-white/80 px-3 py-3 w-36">No. de Cédula</th>
                        <th className="text-left text-xs font-semibold text-white/80 px-3 py-3 w-36">Labor</th>
                        <th className="text-center text-xs font-semibold text-white/80 px-3 py-3 w-28">Firma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asistentesFiltrados.map((asistente, idx) => (
                        <tr
                          key={asistente.id}
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors ${asistente.firma ? "bg-green-500/5" : ""}`}
                        >
                          <td className="px-3 py-3 text-white/60 text-sm">{idx + 1}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {asistente.persona.fotoPerfil ? (
                                <Image
                                  src={asistente.persona.fotoPerfil.url}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                  <User className="w-4 h-4 text-white/60" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-white">{asistente.persona.nombreCompleto}</p>
                                <p className="text-xs text-white/50">{asistente.persona.tipoPersonal}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-white/70">{asistente.persona.numeroDocumento}</td>
                          <td className="px-3 py-3 text-sm text-white/70">{asistente.persona.tipoPersonal}</td>
                          <td className="px-3 py-3 text-center">
                            {asistente.firma ? (
                              <div className="flex items-center justify-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-xs text-green-400 font-medium">Firmado</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => setFirmandoId(asistente.id)}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-all cursor-pointer"
                              >
                                <PenTool className="w-3 h-3" />
                                Firmar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sección firma del conferencista */}
            <div className={`bg-white/10 backdrop-blur-xl rounded-2xl border p-6 ${conferencistaFirmado ? "border-green-500/30" : "border-white/10"}`}>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-300" />
                Firma del Conferencista
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{nombreConferencista || "—"}</p>
                  <p className="text-sm text-white/50 mt-0.5">
                    {conferencistaFirmado
                      ? "Firmado — El registro quedará marcado como Completado"
                      : "Firmar al finalizar el evento para completar el registro"}
                  </p>
                </div>
                {conferencistaFirmado ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-semibold">Completado</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setFirmandoConferencista(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/25 border border-purple-400/35 text-purple-200 font-semibold hover:bg-purple-500/35 transition-all cursor-pointer"
                  >
                    <PenTool className="w-4 h-4" />
                    Firmar y Completar
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal firma asistente */}
      {asistenteFirmando && (
        <SignatureCanvas
          nombrePersona={asistenteFirmando.persona.nombreCompleto}
          onConfirm={(dataUrl) => firmarAsistente(asistenteFirmando.id, dataUrl)}
          onCancel={() => setFirmandoId(null)}
        />
      )}

      {/* Modal firma conferencista */}
      {firmandoConferencista && (
        <SignatureCanvas
          titulo="Firma del Conferencista"
          nombrePersona={nombreConferencista || "Conferencista"}
          onConfirm={firmarConferencista}
          onCancel={() => setFirmandoConferencista(false)}
        />
      )}
    </div>
  );
}
