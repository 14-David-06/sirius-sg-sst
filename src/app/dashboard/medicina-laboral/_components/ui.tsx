"use client";

// ══════════════════════════════════════════════════════════
// Primitivas de UI compartidas — Medicina Laboral
// Estilo glass-morphism oscuro, consistente con el hub
// ══════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Fecha de hoy en zona America/Bogota como YYYY-MM-DD. */
export function hoyColombia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function rangoDelMes(anio: number, mes: number): { desde: string; hasta: string } {
  const mm = String(mes).padStart(2, "0");
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return {
    desde: `${anio}-${mm}-01`,
    hasta: `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

export function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return "—";
  return `${dia}/${mes}/${anio}`;
}

// ── Trabajadores (Nómina Core) ─────────────────────────────

export interface PersonaResumen {
  idEmpleado: string;
  nombreCompleto: string;
  numeroDocumento: string;
  /** Cargo del trabajador (viene de ROL_LOOKUP en la base Personal). */
  tipoPersonal: string;
}

export function useTrabajadores() {
  const [personal, setPersonal] = useState<PersonaResumen[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/personal");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPersonal(json.data as PersonaResumen[]);
        }
      } catch (e) {
        console.error("[medicina-laboral] cargar personal:", e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  return { personal, cargandoPersonal: cargando };
}

// ── CRUD genérico sobre los endpoints del módulo ───────────

interface RespuestaApi<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export function useRecurso<T extends { recordId: string }>(
  recurso: string,
  query: string
) {
  const [items, setItems] = useState<T[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/medicina-laboral/${recurso}`;

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${base}?${query}`);
      const json = (await res.json()) as RespuestaApi<T[]>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "No se pudieron cargar los registros");
      }
      setItems(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, [base, query]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  /** Crea o actualiza según venga `recordId`. Lanza si la API responde error. */
  const guardar = useCallback(
    async (payload: unknown, recordId?: string) => {
      const res = await fetch(recordId ? `${base}/${recordId}` : base, {
        method: recordId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as RespuestaApi<T>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo guardar el registro");
      }
      await recargar();
    },
    [base, recargar]
  );

  const eliminar = useCallback(
    async (recordId: string) => {
      const res = await fetch(`${base}/${recordId}`, { method: "DELETE" });
      const json = (await res.json()) as RespuestaApi<unknown>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo eliminar el registro");
      }
      await recargar();
    },
    [base, recargar]
  );

  return { items, cargando, error, recargar, guardar, eliminar };
}

// ── Cabecera del submódulo ─────────────────────────────────

export function CabeceraSubmodulo({
  titulo,
  descripcion,
  etiquetas = [],
}: {
  titulo: string;
  descripcion: string;
  etiquetas?: string[];
}) {
  const router = useRouter();
  return (
    <div className="mb-8">
      <button
        onClick={() => router.push("/dashboard/medicina-laboral")}
        className="mb-6 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10
                   backdrop-blur-sm border border-white/10 transition-all
                   text-white/70 hover:text-white text-sm inline-flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a Medicina Laboral
      </button>

      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl
                      rounded-2xl p-8 border border-white/20 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">{titulo}</h1>
        <p className="text-white/70 max-w-3xl">{descripcion}</p>
        {etiquetas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {etiquetas.map((e) => (
              <span
                key={e}
                className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm border border-blue-500/30"
              >
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Selector de periodo (mes / año) ────────────────────────

export function SelectorPeriodo({
  anio,
  mes,
  setAnio,
  setMes,
}: {
  anio: number;
  mes: number;
  setAnio: (v: number) => void;
  setMes: (v: number) => void;
}) {
  const anioActual = Number(hoyColombia().slice(0, 4));
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - 4 + i);

  return (
    <div className="flex gap-3">
      <select
        value={mes}
        onChange={(e) => setMes(Number(e.target.value))}
        className={CLASE_CONTROL}
      >
        {MESES.map((nombre, i) => (
          <option key={nombre} value={i + 1} className="bg-slate-800">
            {nombre}
          </option>
        ))}
      </select>
      <select
        value={anio}
        onChange={(e) => setAnio(Number(e.target.value))}
        className={CLASE_CONTROL}
      >
        {anios.map((a) => (
          <option key={a} value={a} className="bg-slate-800">
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Controles de formulario ────────────────────────────────

export const CLASE_CONTROL =
  "px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm " +
  "placeholder:text-white/40 focus:outline-none focus:border-blue-400/60 " +
  "focus:bg-white/10 transition-colors";

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
    <label className={`flex flex-col gap-1.5 ${ancho === "completo" ? "sm:col-span-2" : ""}`}>
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

export function Opciones<T extends string>({
  valor,
  onChange,
  opciones,
  placeholder = "Seleccionar…",
}: {
  valor: T | "";
  onChange: (v: T | "") => void;
  opciones: readonly T[];
  placeholder?: string;
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value as T | "")}
      className={`${CLASE_CONTROL} w-full`}
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
    <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-blue-500"
      />
      <span className="text-white/80 text-sm">{etiqueta}</span>
    </label>
  );
}

export function SelectorTrabajador({
  personal,
  valor,
  onChange,
  cargando,
}: {
  personal: PersonaResumen[];
  valor: string;
  onChange: (idEmpleado: string) => void;
  cargando: boolean;
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      disabled={cargando}
      className={`${CLASE_CONTROL} w-full disabled:opacity-50`}
    >
      <option value="" className="bg-slate-800">
        {cargando ? "Cargando trabajadores…" : "Seleccionar trabajador…"}
      </option>
      {personal.map((p) => (
        <option key={p.idEmpleado} value={p.idEmpleado} className="bg-slate-800">
          {p.nombreCompleto} — {p.numeroDocumento}
        </option>
      ))}
    </select>
  );
}

// ── Modal de formulario ────────────────────────────────────

export function ModalFormulario({
  titulo,
  onCerrar,
  onGuardar,
  guardando,
  error,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  onGuardar: () => void;
  guardando: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto
                    bg-black/60 backdrop-blur-sm p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900/95 backdrop-blur-xl
                      border border-white/20 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">{titulo}</h2>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>

        {error && (
          <div className="mx-6 mb-4 px-4 py-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15
                       text-white/70 hover:text-white text-sm transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onGuardar}
            disabled={guardando}
            className="px-4 py-2 rounded-lg bg-blue-500/25 hover:bg-blue-500/35 border border-blue-400/40
                       text-blue-100 text-sm font-medium transition-colors disabled:opacity-50
                       inline-flex items-center gap-2"
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tabla de registros ─────────────────────────────────────

export interface Columna<T> {
  titulo: string;
  render: (fila: T) => React.ReactNode;
}

export function TablaRegistros<T extends { recordId: string }>({
  columnas,
  filas,
  onEditar,
  onEliminar,
}: {
  columnas: Columna<T>[];
  filas: T[];
  onEditar: (fila: T) => void;
  onEliminar: (fila: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {columnas.map((c) => (
              <th
                key={c.titulo}
                className="px-4 py-3 text-left text-white/60 font-medium whitespace-nowrap"
              >
                {c.titulo}
              </th>
            ))}
            <th className="px-4 py-3 text-right text-white/60 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr
              key={fila.recordId}
              className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
            >
              {columnas.map((c) => (
                <td key={c.titulo} className="px-4 py-3 text-white/80 align-top">
                  {c.render(fila)}
                </td>
              ))}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => onEditar(fila)}
                  className="p-1.5 rounded-lg text-white/50 hover:text-blue-300 hover:bg-blue-500/15 transition-colors"
                  aria-label="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEliminar(fila)}
                  className="p-1.5 rounded-lg text-white/50 hover:text-red-300 hover:bg-red-500/15 transition-colors"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Estados de la lista ────────────────────────────────────

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
        Cargando registros…
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-4 py-6 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm">
        {error}
      </div>
    );
  }
  if (vacio) {
    return (
      <div className="py-16 text-center text-white/50 text-sm rounded-2xl border border-white/10 bg-white/5">
        {mensajeVacio}
      </div>
    );
  }
  return null;
}

export function BotonNuevo({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg bg-blue-500/25 hover:bg-blue-500/35 border border-blue-400/40
                 text-blue-100 text-sm font-medium transition-colors inline-flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      {texto}
    </button>
  );
}

export function Etiqueta({ texto }: { texto: string | null }) {
  if (!texto) return <span className="text-white/40">—</span>;
  return (
    <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs whitespace-nowrap">
      {texto}
    </span>
  );
}

/** Contenedor común de las páginas de submódulo. */
export function PaginaSubmodulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  );
}
