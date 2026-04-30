"use client";

import { useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

type Variant = "default" | "icon";

interface Props {
  /** Se invoca con el texto transcrito limpio. El consumidor decide cómo concatenarlo. */
  onTranscribed: (texto: string) => void;
  /** Se invoca cuando ocurre un error (ej. permisos denegados). */
  onError?: (mensaje: string) => void;
  /** Variante visual: "default" (texto + icono) o "icon" (solo icono, compacto). */
  variant?: Variant;
  /** Clases adicionales para el botón. */
  className?: string;
  disabled?: boolean;
}

/**
 * Botón reutilizable para dictar texto con el micrófono y transcribir vía /api/transcribir.
 * Replica el patrón visual de Registros de Asistencia.
 */
export default function MicTranscribeButton({
  onTranscribed,
  onError,
  variant = "default",
  className = "",
  disabled = false,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
            const texto = (json.texto as string).trim();
            if (texto) onTranscribed(texto);
          }
        } catch {
          onError?.("Error al transcribir el audio.");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      onError?.("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  };

  const baseColors = isRecording
    ? "bg-red-500/25 border-red-400/40 text-red-300 animate-pulse"
    : isTranscribing
    ? "bg-yellow-500/20 border-yellow-400/30 text-yellow-300"
    : "bg-white/10 border-white/20 text-white/60 hover:bg-white/15 hover:text-white";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled || isTranscribing}
        title={isRecording ? "Detener grabación" : isTranscribing ? "Transcribiendo..." : "Dictar con micrófono"}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${baseColors} ${className}`}
      >
        {isTranscribing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={disabled || isTranscribing}
      title={isRecording ? "Detener grabación" : "Grabar con micrófono"}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${baseColors} ${className}`}
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
  );
}

/** Helper: concatena texto transcrito al valor previo respetando espacios/saltos. */
export function appendTranscripcion(prev: string, texto: string, separador: " " | "\n" = " "): string {
  if (!prev) return texto;
  return `${prev.trimEnd()}${separador}${texto}`;
}
