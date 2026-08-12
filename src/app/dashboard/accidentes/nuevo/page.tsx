"use client";

// ══════════════════════════════════════════════════════════
// Registro de un accidente o incidente de trabajo
// ══════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AlertCircle, ChevronLeft, Loader2, Save } from "lucide-react";
import {
  ESTADOS_ARL,
  MECANISMOS,
  PARTES_CUERPO,
  TIPOS_EVENTO,
  TIPOS_LESION,
  type CrearEventoPayload,
  type EstadoARL,
  type Mecanismo,
  type ParteCuerpo,
  type TipoEvento,
  type TipoLesion,
} from "@/lib/accidentes/types";

interface PersonaResumen {
  idEmpleado: string;
  nombreCompleto: string;
  numeroDocumento: string;
  tipoPersonal: string;
  /** Vienen como recIDs de la tabla Areas, no como nombres. */
  areas: string[];
}

interface AreaCatalogo {
  recordId: string;
  codigo: string;
  nombre: string;
}

function hoyColombia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function NuevoEventoPage() {
  const router = useRouter();

  const [personal, setPersonal] = useState<PersonaResumen[]>([]);
  const [areas, setAreas] = useState<AreaCatalogo[]>([]);
  const [cargandoPersonal, setCargandoPersonal] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [idEmpleadoCore, setIdEmpleadoCore] = useState("");
  const [tipoEvento, setTipoEvento] = useState<TipoEvento>("Accidente de trabajo");
  const [fechaEvento, setFechaEvento] = useState(hoyColombia);
  const [horaEvento, setHoraEvento] = useState("");
  const [lugarArea, setLugarArea] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [mecanismo, setMecanismo] = useState<Mecanismo | "">("");
  const [tipoLesion, setTipoLesion] = useState<TipoLesion | "">("");
  const [parteCuerpo, setParteCuerpo] = useState<ParteCuerpo[]>([]);
  const [causaPrincipal, setCausaPrincipal] = useState("");
  const [conLesion, setConLesion] = useState(true);
  const [grave, setGrave] = useState(false);
  const [mortal, setMortal] = useState(false);
  const [diasIncapacidad, setDiasIncapacidad] = useState("0");
  const [fechaInicioIncapacidad, setFechaInicioIncapacidad] = useState("");
  const [fechaFinIncapacidad, setFechaFinIncapacidad] = useState("");
  const [estadoARL, setEstadoARL] = useState<EstadoARL>("Pendiente de reporte");
  const [fechaReporteARL, setFechaReporteARL] = useState("");
  const [numeroFURAT, setNumeroFURAT] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [resPersonal, resAreas] = await Promise.all([
          fetch("/api/personal"),
          fetch("/api/personal/areas"),
        ]);
        const jsonPersonal = await resPersonal.json();
        if (jsonPersonal.success && Array.isArray(jsonPersonal.data)) {
          setPersonal(jsonPersonal.data as PersonaResumen[]);
        }
        const jsonAreas = await resAreas.json();
        if (jsonAreas.success && Array.isArray(jsonAreas.data)) {
          setAreas(jsonAreas.data as AreaCatalogo[]);
        }
      } catch (e) {
        console.error("[accidentes] cargar personal y áreas:", e);
      } finally {
        setCargandoPersonal(false);
      }
    })();
  }, []);

  const persona = personal.find((p) => p.idEmpleado === idEmpleadoCore);

  /** Al elegir el trabajador se propone su área, que puede cambiarse. */
  const seleccionarTrabajador = (id: string) => {
    setIdEmpleadoCore(id);
    const elegida = personal.find((p) => p.idEmpleado === id);
    const primerArea = elegida?.areas?.[0];
    const area = areas.find((a) => a.recordId === primerArea);
    if (area) setLugarArea(area.nombre);
  };

  const alternarParte = (parte: ParteCuerpo) => {
    setParteCuerpo((actual) =>
      actual.includes(parte)
        ? actual.filter((p) => p !== parte)
        : [...actual, parte]
    );
  };

  const guardar = async () => {
    setError(null);

    if (!persona) {
      setError("Debe seleccionar el trabajador involucrado");
      return;
    }
    if (!descripcion.trim()) {
      setError("La descripción del evento es obligatoria");
      return;
    }
    const dias = Number(diasIncapacidad);
    if (!Number.isInteger(dias) || dias < 0) {
      setError("Los días de incapacidad deben ser un entero no negativo");
      return;
    }
    if (
      fechaInicioIncapacidad &&
      fechaFinIncapacidad &&
      fechaInicioIncapacidad > fechaFinIncapacidad
    ) {
      setError("La fecha de inicio de incapacidad no puede ser posterior a la de fin");
      return;
    }

    const payload: CrearEventoPayload = {
      idEmpleadoCore: persona.idEmpleado,
      nombreEmpleado: persona.nombreCompleto,
      numeroDocumento: persona.numeroDocumento,
      cargo: persona.tipoPersonal,
      tipoEvento,
      fechaEvento,
      horaEvento: horaEvento || undefined,
      lugarArea: lugarArea || undefined,
      descripcion: descripcion.trim(),
      mecanismo: mecanismo || undefined,
      tipoLesion: tipoLesion || undefined,
      parteCuerpo,
      causaPrincipal: causaPrincipal || undefined,
      conLesion,
      grave: grave || mortal,
      mortal,
      diasIncapacidad: dias,
      fechaInicioIncapacidad: fechaInicioIncapacidad || null,
      fechaFinIncapacidad: fechaFinIncapacidad || null,
      estadoARL,
      fechaReporteARL: fechaReporteARL || null,
      numeroFURAT: numeroFURAT || undefined,
      observaciones: observaciones || undefined,
    };

    setGuardando(true);
    try {
      const res = await fetch("/api/accidentes/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo registrar el evento");
      }
      router.push(`/dashboard/accidentes/${json.data.recordId}`);
    } catch (e) {
      console.error("[accidentes] guardar evento:", e);
      setError(e instanceof Error ? e.message : "Error al registrar el evento");
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen relative">
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

      <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-5">
            <button
              onClick={() => router.push("/dashboard/accidentes")}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Volver</span>
            </button>
            <div className="h-6 w-px bg-white/20" />
            <h1 className="text-xl font-bold text-white">Registrar evento</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Datos del evento */}
        <Seccion titulo="Datos del evento">
          <Campo etiqueta="Trabajador involucrado" requerido>
            {cargandoPersonal ? (
              <div className="flex items-center gap-2 text-white/50 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando personal…
              </div>
            ) : (
              <select
                value={idEmpleadoCore}
                onChange={(e) => seleccionarTrabajador(e.target.value)}
                className={claseInput}
              >
                <option value="" className="bg-slate-800">
                  Seleccione…
                </option>
                {personal.map((p) => (
                  <option key={p.idEmpleado} value={p.idEmpleado} className="bg-slate-800">
                    {p.nombreCompleto}
                  </option>
                ))}
              </select>
            )}
            {persona && (
              <p className="text-xs text-white/40 mt-1.5">
                Documento {persona.numeroDocumento || "—"} · {persona.tipoPersonal || "Sin cargo"}
              </p>
            )}
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Campo etiqueta="Tipo de evento" requerido>
              <select
                value={tipoEvento}
                onChange={(e) => setTipoEvento(e.target.value as TipoEvento)}
                className={claseInput}
              >
                {TIPOS_EVENTO.map((t) => (
                  <option key={t} value={t} className="bg-slate-800">
                    {t}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Fecha" requerido>
              <input
                type="date"
                value={fechaEvento}
                onChange={(e) => setFechaEvento(e.target.value)}
                className={claseInput}
              />
            </Campo>
            <Campo etiqueta="Hora">
              <input
                type="time"
                value={horaEvento}
                onChange={(e) => setHoraEvento(e.target.value)}
                className={claseInput}
              />
            </Campo>
          </div>

          <Campo etiqueta="Área donde ocurrió">
            <select
              value={lugarArea}
              onChange={(e) => setLugarArea(e.target.value)}
              className={claseInput}
            >
              <option value="" className="bg-slate-800">
                Seleccione el área…
              </option>
              {areas.map((area) => (
                <option key={area.recordId} value={area.nombre} className="bg-slate-800">
                  {area.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/40 mt-1.5">
              Áreas de Sirius Nómina Core. Se propone la del trabajador; cámbiela si el
              evento ocurrió en otra.
            </p>
          </Campo>

          <Campo etiqueta="Descripción de lo ocurrido" requerido>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              placeholder="Describa cómo ocurrió el evento"
              className={claseInput}
            />
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo etiqueta="Mecanismo o forma del accidente">
              <select
                value={mecanismo}
                onChange={(e) => setMecanismo(e.target.value as Mecanismo | "")}
                className={claseInput}
              >
                <option value="" className="bg-slate-800">
                  Sin especificar
                </option>
                {MECANISMOS.map((m) => (
                  <option key={m} value={m} className="bg-slate-800">
                    {m}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Causa principal">
              <input
                type="text"
                value={causaPrincipal}
                onChange={(e) => setCausaPrincipal(e.target.value)}
                placeholder="Causa inmediata identificada"
                className={claseInput}
              />
            </Campo>
          </div>
        </Seccion>

        {/* Lesión e incapacidad */}
        <Seccion titulo="Lesión e incapacidad">
          <div className="flex flex-wrap gap-5">
            <Checkbox
              etiqueta="El evento produjo lesión"
              valor={conLesion}
              onChange={setConLesion}
            />
            <Checkbox
              etiqueta="Accidente grave (Res. 1401/2007)"
              valor={grave || mortal}
              onChange={setGrave}
              deshabilitado={mortal}
            />
            <Checkbox
              etiqueta="Accidente mortal"
              valor={mortal}
              onChange={(v) => {
                setMortal(v);
                if (v) setGrave(true);
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo etiqueta="Tipo de lesión">
              <select
                value={tipoLesion}
                onChange={(e) => setTipoLesion(e.target.value as TipoLesion | "")}
                className={claseInput}
              >
                <option value="" className="bg-slate-800">
                  Sin especificar
                </option>
                {TIPOS_LESION.map((t) => (
                  <option key={t} value={t} className="bg-slate-800">
                    {t}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Días de incapacidad">
              <input
                type="number"
                min={0}
                step={1}
                value={diasIncapacidad}
                onChange={(e) => setDiasIncapacidad(e.target.value)}
                className={claseInput}
              />
            </Campo>
          </div>

          <Campo etiqueta="Parte del cuerpo afectada">
            <div className="flex flex-wrap gap-2">
              {PARTES_CUERPO.map((parte) => {
                const activo = parteCuerpo.includes(parte);
                return (
                  <button
                    key={parte}
                    type="button"
                    onClick={() => alternarParte(parte)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      activo
                        ? "bg-red-500/30 text-red-100 border-red-400/50"
                        : "bg-white/5 text-white/60 border-white/15 hover:bg-white/10"
                    }`}
                  >
                    {parte}
                  </button>
                );
              })}
            </div>
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo etiqueta="Inicio de incapacidad">
              <input
                type="date"
                value={fechaInicioIncapacidad}
                onChange={(e) => setFechaInicioIncapacidad(e.target.value)}
                className={claseInput}
              />
            </Campo>
            <Campo etiqueta="Fin de incapacidad">
              <input
                type="date"
                value={fechaFinIncapacidad}
                onChange={(e) => setFechaFinIncapacidad(e.target.value)}
                className={claseInput}
              />
            </Campo>
          </div>
        </Seccion>

        {/* Reporte a la ARL */}
        <Seccion titulo="Reporte a la ARL">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Campo etiqueta="Estado ante la ARL">
              <select
                value={estadoARL}
                onChange={(e) => setEstadoARL(e.target.value as EstadoARL)}
                className={claseInput}
              >
                {ESTADOS_ARL.map((e) => (
                  <option key={e} value={e} className="bg-slate-800">
                    {e}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Fecha de reporte">
              <input
                type="date"
                value={fechaReporteARL}
                onChange={(e) => setFechaReporteARL(e.target.value)}
                className={claseInput}
              />
            </Campo>
            <Campo etiqueta="Número de FURAT">
              <input
                type="text"
                value={numeroFURAT}
                onChange={(e) => setNumeroFURAT(e.target.value)}
                className={claseInput}
              />
            </Campo>
          </div>

          <Campo etiqueta="Observaciones">
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className={claseInput}
            />
          </Campo>
        </Seccion>

        <div className="flex justify-end gap-3 pb-10">
          <button
            onClick={() => router.push("/dashboard/accidentes")}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium border border-white/15 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {guardando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Registrar evento
          </button>
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Subcomponentes de formulario
// ══════════════════════════════════════════════════════════
const claseInput =
  "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-400/50";

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-6 space-y-5">
      <h2 className="text-base font-semibold text-white">{titulo}</h2>
      {children}
    </section>
  );
}

function Campo({
  etiqueta,
  requerido,
  children,
}: {
  etiqueta: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/60 mb-1.5">
        {etiqueta}
        {requerido && <span className="text-red-300 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Checkbox({
  etiqueta,
  valor,
  onChange,
  deshabilitado,
}: {
  etiqueta: string;
  valor: boolean;
  onChange: (v: boolean) => void;
  deshabilitado?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-2 text-sm ${
        deshabilitado ? "text-white/40 cursor-not-allowed" : "text-white/80 cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={valor}
        disabled={deshabilitado}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-white/30 bg-white/10 accent-red-500"
      />
      {etiqueta}
    </label>
  );
}
