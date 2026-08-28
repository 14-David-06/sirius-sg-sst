"use client";

// ══════════════════════════════════════════════════════════
// Primitivas de UI — Inspecciones de equipos de emergencia
// Glass-morphism oscuro, consistente con el resto del dashboard.
// ══════════════════════════════════════════════════════════

import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";

/** Fecha de hoy en zona America/Bogota como YYYY-MM-DD. */
export function hoyColombia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return "—";
  return `${dia}/${mes}/${anio}`;
}

export const CLASE_CONTROL =
  "px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm " +
  "placeholder:text-white/40 focus:outline-none focus:border-blue-400/60 " +
  "focus:bg-white/10 transition-colors";

/** Contenedor común de las páginas del módulo. */
export function PaginaInspeccion({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">{children}</div>
    </div>
  );
}

export function BotonVolver({ href, texto }: { href: string; texto: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="mb-6 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-sm
                 border border-white/10 transition-all text-white/70 hover:text-white
                 text-sm inline-flex items-center gap-1"
    >
      <ChevronLeft className="w-4 h-4" />
      {texto}
    </button>
  );
}

export function Cabecera({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion: string;
  acciones?: React.ReactNode;
}) {
  return (
    <div
      className="mb-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl
                 rounded-2xl p-8 border border-white/20 shadow-2xl
                 flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-bold text-white mb-2">{titulo}</h1>
        <p className="text-white/70 max-w-3xl">{descripcion}</p>
      </div>
      {acciones && <div className="flex flex-wrap gap-3 shrink-0">{acciones}</div>}
    </div>
  );
}

export function Panel({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-6">
      <h2 className="text-lg font-semibold text-white">{titulo}</h2>
      {descripcion && <p className="text-white/50 text-sm mt-0.5 mb-4">{descripcion}</p>}
      <div className={descripcion ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

export function Campo({
  label,
  obligatorio,
  ancho = "normal",
  children,
}: {
  label: string;
  obligatorio?: boolean;
  ancho?: "normal" | "completo";
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 ${ancho === "completo" ? "sm:col-span-2" : ""}`}
    >
      <span className="text-white/70 text-xs font-medium">
        {label}
        {obligatorio && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function Texto({
  valor,
  onChange,
  tipo = "text",
  placeholder,
  min,
  max,
}: {
  valor: string;
  onChange: (v: string) => void;
  tipo?: "text" | "date" | "number";
  placeholder?: string;
  min?: string | number;
  max?: string | number;
}) {
  return (
    <input
      type={tipo}
      value={valor}
      min={min}
      max={max}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${CLASE_CONTROL} w-full`}
    />
  );
}

export function AreaTexto({
  valor,
  onChange,
  filas = 3,
  placeholder,
}: {
  valor: string;
  onChange: (v: string) => void;
  filas?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={valor}
      rows={filas}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${CLASE_CONTROL} w-full resize-y`}
    />
  );
}

export function Opciones<T extends string>({
  valor,
  onChange,
  opciones,
  placeholder = "Seleccionar…",
  deshabilitado,
}: {
  valor: T | "";
  onChange: (v: T | "") => void;
  opciones: readonly T[];
  placeholder?: string;
  deshabilitado?: boolean;
}) {
  return (
    <select
      value={valor}
      disabled={deshabilitado}
      onChange={(e) => onChange(e.target.value as T | "")}
      className={`${CLASE_CONTROL} w-full disabled:opacity-50`}
    >
      <option value="" className="bg-slate-800">
        {placeholder}
      </option>
      {opciones.map((o) => (
        <option key={o} value={o} className="bg-slate-800">
          {o}
        </option>
      ))}
    </select>
  );
}

export function Casilla({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer py-1.5">
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 rounded accent-blue-500 shrink-0"
      />
      <span className="text-white/80 text-sm">{etiqueta}</span>
    </label>
  );
}

export function BotonPrimario({
  children,
  onClick,
  cargando,
  deshabilitado,
}: {
  children: React.ReactNode;
  onClick: () => void;
  cargando?: boolean;
  deshabilitado?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={cargando || deshabilitado}
      className="px-4 py-2 rounded-lg bg-blue-500/25 hover:bg-blue-500/35 border border-blue-400/40
                 text-blue-100 text-sm font-medium transition-colors disabled:opacity-50
                 inline-flex items-center gap-2"
    >
      {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function BotonSecundario({
  children,
  onClick,
  deshabilitado,
}: {
  children: React.ReactNode;
  onClick: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={deshabilitado}
      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15
                 text-white/70 hover:text-white text-sm transition-colors disabled:opacity-50
                 inline-flex items-center gap-2"
    >
      {children}
    </button>
  );
}

export function Aviso({
  tono,
  children,
}: {
  tono: "error" | "exito" | "info";
  children: React.ReactNode;
}) {
  const clases = {
    error: "bg-red-500/15 border-red-500/30 text-red-200",
    exito: "bg-green-500/15 border-green-500/30 text-green-200",
    info: "bg-white/5 border-white/15 text-white/70",
  }[tono];

  return (
    <div className={`px-4 py-3 rounded-lg border text-sm ${clases}`}>{children}</div>
  );
}

export function EstadoLista({
  cargando,
  error,
  vacio,
  mensajeVacio,
}: {
  cargando: boolean;
  error: string | null;
  vacio: boolean;
  mensajeVacio: string;
}) {
  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-white/60">
        <Loader2 className="w-5 h-5 animate-spin" />
        Cargando…
      </div>
    );
  }
  if (error) return <Aviso tono="error">{error}</Aviso>;
  if (vacio) {
    return (
      <div className="py-16 text-center text-white/50 text-sm rounded-2xl border border-white/10 bg-white/5">
        {mensajeVacio}
      </div>
    );
  }
  return null;
}

/** Píldora de color según el estado del elemento o del criterio. */
export function PildoraEstado({ estado }: { estado: string | null }) {
  if (!estado) return <span className="text-white/40">—</span>;

  const tonos: Record<string, string> = {
    Bueno: "bg-green-500/20 text-green-300 border-green-400/30",
    Cumple: "bg-green-500/20 text-green-300 border-green-400/30",
    Regular: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    "No aplica": "bg-white/10 text-white/60 border-white/15",
    Malo: "bg-red-500/20 text-red-300 border-red-400/30",
    "No cumple": "bg-red-500/20 text-red-300 border-red-400/30",
    Faltante: "bg-red-500/20 text-red-300 border-red-400/30",
    Borrador: "bg-white/10 text-white/60 border-white/15",
    Completada: "bg-blue-500/20 text-blue-300 border-blue-400/30",
    Firmada: "bg-green-500/20 text-green-300 border-green-400/30",
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full border text-xs whitespace-nowrap ${
        tonos[estado] ?? "bg-white/10 text-white/70 border-white/15"
      }`}
    >
      {estado}
    </span>
  );
}
