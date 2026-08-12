"use client";

// ══════════════════════════════════════════════════════════
// Detalle de un evento: datos, investigación y acciones
// ══════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  ChevronLeft,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import {
  ESTADOS_ACCION,
  ESTADOS_ARL,
  ESTADOS_EVENTO,
  ESTADOS_INVESTIGACION,
  JERARQUIAS_CONTROL,
  METODOLOGIAS,
  TIPOS_ACCION,
  TIPOS_RESPONSABLE,
  type AccionAT,
  type EstadoARL,
  type EstadoAccion,
  type EstadoEvento,
  type EstadoInvestigacion,
  type EventoAT,
  type InvestigacionAT,
  type JerarquiaControl,
  type Metodologia,
  type TipoAccion,
  type TipoResponsable,
} from "@/lib/accidentes/types";

const claseInput =
  "w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-400/50";

function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

export default function DetalleEventoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const recordId = params.id;

  const [evento, setEvento] = useState<EventoAT | null>(null);
  const [investigacion, setInvestigacion] = useState<InvestigacionAT | null>(null);
  const [acciones, setAcciones] = useState<AccionAT[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/accidentes/eventos/${recordId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo cargar el evento");
      }
      setEvento(json.data.evento as EventoAT);
      setInvestigacion(json.data.investigacion as InvestigacionAT | null);
      setAcciones(json.data.acciones as AccionAT[]);
    } catch (e) {
      console.error("[accidentes] detalle:", e);
      setError(e instanceof Error ? e.message : "Error al cargar el evento");
    } finally {
      setCargando(false);
    }
  }, [recordId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const avisar = (texto: string) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(null), 3000);
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
      </div>
    );
  }

  if (error || !evento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900 p-6">
        <AlertCircle className="w-10 h-10 text-red-300" />
        <p className="text-red-200">{error ?? "Evento no encontrado"}</p>
        <button
          onClick={() => router.push("/dashboard/accidentes")}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/15"
        >
          Volver al listado
        </button>
      </div>
    );
  }

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 py-5">
            <button
              onClick={() => router.push("/dashboard/accidentes")}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Volver</span>
            </button>
            <div className="h-6 w-px bg-white/20" />
            <h1 className="text-xl font-bold text-white font-mono">
              {evento.idEvento}
            </h1>
            {evento.grave && (
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs font-semibold border border-red-400/30">
                GRAVE
              </span>
            )}
            {evento.mortal && (
              <span className="px-2 py-0.5 rounded bg-red-700/40 text-red-200 text-xs font-semibold border border-red-400/40">
                MORTAL
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {mensaje && (
          <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-4 text-emerald-200 text-sm">
            {mensaje}
          </div>
        )}

        {/* La `key` remonta el formulario tras cada recarga para que refleje
            los valores recién guardados en Airtable. */}
        <SeccionEvento
          key={`evt-${evento.updatedAt ?? ""}`}
          evento={evento}
          onActualizado={cargar}
          onAviso={avisar}
        />

        <SeccionInvestigacion
          key={`inv-${investigacion?.recordId ?? "nueva"}-${
            investigacion?.updatedAt ?? ""
          }`}
          eventoRecordId={recordId}
          investigacion={investigacion}
          onActualizado={cargar}
          onAviso={avisar}
        />

        <SeccionAcciones
          eventoRecordId={recordId}
          investigacionRecordId={investigacion?.recordId ?? null}
          acciones={acciones}
          onActualizado={cargar}
          onAviso={avisar}
        />
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Datos del evento (edición del seguimiento ARL e incapacidad)
// ══════════════════════════════════════════════════════════
function SeccionEvento({
  evento,
  onActualizado,
  onAviso,
}: {
  evento: EventoAT;
  onActualizado: () => void;
  onAviso: (t: string) => void;
}) {
  const [estado, setEstado] = useState<EstadoEvento>(
    (evento.estado || "Abierto") as EstadoEvento
  );
  const [estadoARL, setEstadoARL] = useState<EstadoARL>(
    (evento.estadoARL || "Pendiente de reporte") as EstadoARL
  );
  const [fechaReporteARL, setFechaReporteARL] = useState(evento.fechaReporteARL ?? "");
  const [numeroFURAT, setNumeroFURAT] = useState(evento.numeroFURAT);
  const [diasIncapacidad, setDiasIncapacidad] = useState(
    String(evento.diasIncapacidad)
  );
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const guardar = async () => {
    setErrorLocal(null);
    const dias = Number(diasIncapacidad);
    if (!Number.isInteger(dias) || dias < 0) {
      setErrorLocal("Los días de incapacidad deben ser un entero no negativo");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/accidentes/eventos/${evento.recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado,
          estadoARL,
          fechaReporteARL: fechaReporteARL || null,
          numeroFURAT,
          diasIncapacidad: dias,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo actualizar el evento");
      }
      onAviso("Seguimiento actualizado");
      onActualizado();
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-6 space-y-5">
      <h2 className="text-base font-semibold text-white">Datos del evento</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
        <Lectura etiqueta="Trabajador" valor={evento.nombreEmpleado} />
        <Lectura etiqueta="Cargo" valor={evento.cargo || "—"} />
        <Lectura etiqueta="Documento" valor={evento.numeroDocumento || "—"} />
        <Lectura etiqueta="Tipo" valor={evento.tipoEvento || "—"} />
        <Lectura
          etiqueta="Fecha y hora"
          valor={`${formatearFecha(evento.fechaEvento)}${
            evento.horaEvento ? ` · ${evento.horaEvento}` : ""
          }`}
        />
        <Lectura etiqueta="Área" valor={evento.lugarArea || "—"} />
        <Lectura etiqueta="Mecanismo" valor={evento.mecanismo || "—"} />
        <Lectura etiqueta="Tipo de lesión" valor={evento.tipoLesion || "—"} />
        <Lectura
          etiqueta="Parte del cuerpo"
          valor={evento.parteCuerpo.join(", ") || "—"}
        />
      </div>

      <div>
        <p className="text-xs font-medium text-white/60 mb-1">Descripción</p>
        <p className="text-white/85 text-sm whitespace-pre-wrap">
          {evento.descripcion || "—"}
        </p>
      </div>

      {evento.causaPrincipal && (
        <div>
          <p className="text-xs font-medium text-white/60 mb-1">Causa principal</p>
          <p className="text-white/85 text-sm whitespace-pre-wrap">
            {evento.causaPrincipal}
          </p>
        </div>
      )}

      <div className="border-t border-white/10 pt-5 space-y-4">
        <h3 className="text-sm font-semibold text-white/80">
          Seguimiento ARL e incapacidad
        </h3>

        {errorLocal && (
          <p className="text-red-300 text-sm">{errorLocal}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Estado del caso
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoEvento)}
              className={claseInput}
            >
              {ESTADOS_EVENTO.map((e) => (
                <option key={e} value={e} className="bg-slate-800">
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Estado ante la ARL
            </label>
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
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Fecha de reporte a ARL
            </label>
            <input
              type="date"
              value={fechaReporteARL}
              onChange={(e) => setFechaReporteARL(e.target.value)}
              className={claseInput}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Número de FURAT
            </label>
            <input
              type="text"
              value={numeroFURAT}
              onChange={(e) => setNumeroFURAT(e.target.value)}
              className={claseInput}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Días de incapacidad
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={diasIncapacidad}
              onChange={(e) => setDiasIncapacidad(e.target.value)}
              className={claseInput}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {guardando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar seguimiento
          </button>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════
// Investigación (Resolución 1401/2007)
// ══════════════════════════════════════════════════════════
function SeccionInvestigacion({
  eventoRecordId,
  investigacion,
  onActualizado,
  onAviso,
}: {
  eventoRecordId: string;
  investigacion: InvestigacionAT | null;
  onActualizado: () => void;
  onAviso: (t: string) => void;
}) {
  const [fechaInvestigacion, setFechaInvestigacion] = useState(
    investigacion?.fechaInvestigacion ?? ""
  );
  const [equipoInvestigador, setEquipoInvestigador] = useState(
    investigacion?.equipoInvestigador ?? ""
  );
  const [metodologia, setMetodologia] = useState<Metodologia | "">(
    investigacion?.metodologia ?? ""
  );
  const [actos, setActos] = useState(investigacion?.causasInmediatasActos ?? "");
  const [condiciones, setCondiciones] = useState(
    investigacion?.causasInmediatasCondiciones ?? ""
  );
  const [personales, setPersonales] = useState(
    investigacion?.causasBasicasPersonales ?? ""
  );
  const [laborales, setLaborales] = useState(
    investigacion?.causasBasicasLaborales ?? ""
  );
  const [conclusiones, setConclusiones] = useState(
    investigacion?.conclusiones ?? ""
  );
  const [fechaEnvioARL, setFechaEnvioARL] = useState(
    investigacion?.fechaEnvioARL ?? ""
  );
  const [estado, setEstado] = useState<EstadoInvestigacion>(
    (investigacion?.estado || "Borrador") as EstadoInvestigacion
  );
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const cuerpo = {
    fechaInvestigacion: fechaInvestigacion || undefined,
    equipoInvestigador,
    metodologia: metodologia || undefined,
    causasInmediatasActos: actos,
    causasInmediatasCondiciones: condiciones,
    causasBasicasPersonales: personales,
    causasBasicasLaborales: laborales,
    conclusiones,
    fechaEnvioARL: fechaEnvioARL || null,
    estado,
  };

  const guardar = async () => {
    setErrorLocal(null);
    setGuardando(true);
    try {
      const url = investigacion
        ? `/api/accidentes/investigaciones/${investigacion.recordId}`
        : "/api/accidentes/investigaciones";
      const res = await fetch(url, {
        method: investigacion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          investigacion ? cuerpo : { ...cuerpo, eventoRecordId }
        ),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo guardar la investigación");
      }
      onAviso(investigacion ? "Investigación actualizada" : "Investigación abierta");
      onActualizado();
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-white/60" />
          Investigación
        </h2>
        {investigacion && (
          <span className="text-xs font-mono text-white/50">
            {investigacion.idInvestigacion}
          </span>
        )}
      </div>

      {!investigacion && (
        <p className="text-sm text-white/50">
          Este evento aún no tiene investigación. Diligencie los campos y guarde para
          abrirla; el evento pasará a estado &ldquo;En investigación&rdquo;.
        </p>
      )}

      {errorLocal && <p className="text-red-300 text-sm">{errorLocal}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Fecha de investigación
          </label>
          <input
            type="date"
            value={fechaInvestigacion}
            onChange={(e) => setFechaInvestigacion(e.target.value)}
            className={claseInput}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Metodología
          </label>
          <select
            value={metodologia}
            onChange={(e) => setMetodologia(e.target.value as Metodologia | "")}
            className={claseInput}
          >
            <option value="" className="bg-slate-800">
              Sin especificar
            </option>
            {METODOLOGIAS.map((m) => (
              <option key={m} value={m} className="bg-slate-800">
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Estado
          </label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoInvestigacion)}
            className={claseInput}
          >
            {ESTADOS_INVESTIGACION.map((e) => (
              <option key={e} value={e} className="bg-slate-800">
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">
          Equipo investigador
        </label>
        <textarea
          value={equipoInvestigador}
          onChange={(e) => setEquipoInvestigador(e.target.value)}
          rows={2}
          placeholder="Jefe inmediato, representante del COPASST y responsable SST con licencia"
          className={claseInput}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CampoTexto
          etiqueta="Causas inmediatas — actos subestándar"
          valor={actos}
          onChange={setActos}
        />
        <CampoTexto
          etiqueta="Causas inmediatas — condiciones subestándar"
          valor={condiciones}
          onChange={setCondiciones}
        />
        <CampoTexto
          etiqueta="Causas básicas — factores personales"
          valor={personales}
          onChange={setPersonales}
        />
        <CampoTexto
          etiqueta="Causas básicas — factores del trabajo"
          valor={laborales}
          onChange={setLaborales}
        />
      </div>

      <CampoTexto
        etiqueta="Conclusiones"
        valor={conclusiones}
        onChange={setConclusiones}
        filas={3}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-white/60 mb-1.5">
            Fecha de envío a la ARL
          </label>
          <input
            type="date"
            value={fechaEnvioARL}
            onChange={(e) => setFechaEnvioARL(e.target.value)}
            className={`${claseInput} sm:w-56`}
          />
          <p className="text-[11px] text-white/40 mt-1">
            Plazo legal: 15 días hábiles siguientes al evento
          </p>
        </div>
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {guardando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {investigacion ? "Guardar investigación" : "Abrir investigación"}
        </button>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════
// Acciones preventivas y correctivas
// ══════════════════════════════════════════════════════════
function SeccionAcciones({
  eventoRecordId,
  investigacionRecordId,
  acciones,
  onActualizado,
  onAviso,
}: {
  eventoRecordId: string;
  investigacionRecordId: string | null;
  acciones: AccionAT[];
  onActualizado: () => void;
  onAviso: (t: string) => void;
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [tipo, setTipo] = useState<TipoAccion>("Correctiva");
  const [jerarquia, setJerarquia] = useState<JerarquiaControl | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [responsableNombre, setResponsableNombre] = useState("");
  const [responsableTipo, setResponsableTipo] = useState<TipoResponsable>("Empresa");
  const [fechaEjecucion, setFechaEjecucion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const limpiar = () => {
    setTipo("Correctiva");
    setJerarquia("");
    setDescripcion("");
    setResponsableNombre("");
    setResponsableTipo("Empresa");
    setFechaEjecucion("");
    setMostrarFormulario(false);
  };

  const crear = async () => {
    setErrorLocal(null);
    if (!descripcion.trim()) {
      setErrorLocal("La descripción de la acción es obligatoria");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch("/api/accidentes/acciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoRecordId,
          investigacionRecordId: investigacionRecordId ?? undefined,
          tipo,
          jerarquiaControl: jerarquia || undefined,
          descripcion: descripcion.trim(),
          responsableNombre: responsableNombre || undefined,
          responsableTipo,
          fechaEjecucion: fechaEjecucion || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo crear la acción");
      }
      onAviso("Acción registrada");
      limpiar();
      onActualizado();
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : "Error al crear la acción");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (accion: AccionAT, nuevoEstado: EstadoAccion) => {
    try {
      const hoy = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const res = await fetch(`/api/accidentes/acciones/${accion.recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: nuevoEstado,
          fechaCierre:
            nuevoEstado === "Cerrada" ? accion.fechaCierre ?? hoy : accion.fechaCierre,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo actualizar la acción");
      }
      onActualizado();
    } catch (e) {
      onAviso(e instanceof Error ? e.message : "Error al actualizar la acción");
    }
  };

  const eliminar = async (accion: AccionAT) => {
    if (!confirm(`¿Desactivar la acción ${accion.idAccion}?`)) return;
    try {
      const res = await fetch(`/api/accidentes/acciones/${accion.recordId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo desactivar la acción");
      }
      onAviso("Acción desactivada");
      onActualizado();
    } catch (e) {
      onAviso(e instanceof Error ? e.message : "Error al desactivar la acción");
    }
  };

  return (
    <section className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/15 p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">
          Acciones preventivas y correctivas
        </h2>
        <button
          onClick={() => setMostrarFormulario((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/15 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </div>

      {mostrarFormulario && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
          {errorLocal && <p className="text-red-300 text-sm">{errorLocal}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoAccion)}
                className={claseInput}
              >
                {TIPOS_ACCION.map((t) => (
                  <option key={t} value={t} className="bg-slate-800">
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Jerarquía de control
              </label>
              <select
                value={jerarquia}
                onChange={(e) => setJerarquia(e.target.value as JerarquiaControl | "")}
                className={claseInput}
              >
                <option value="" className="bg-slate-800">
                  Sin especificar
                </option>
                {JERARQUIAS_CONTROL.map((j) => (
                  <option key={j} value={j} className="bg-slate-800">
                    {j}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Descripción <span className="text-red-300">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className={claseInput}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Responsable
              </label>
              <input
                type="text"
                value={responsableNombre}
                onChange={(e) => setResponsableNombre(e.target.value)}
                className={claseInput}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Tipo de responsable
              </label>
              <select
                value={responsableTipo}
                onChange={(e) => setResponsableTipo(e.target.value as TipoResponsable)}
                className={claseInput}
              >
                {TIPOS_RESPONSABLE.map((t) => (
                  <option key={t} value={t} className="bg-slate-800">
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Fecha de ejecución
              </label>
              <input
                type="date"
                value={fechaEjecucion}
                onChange={(e) => setFechaEjecucion(e.target.value)}
                className={claseInput}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={limpiar}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/15"
            >
              Cancelar
            </button>
            <button
              onClick={crear}
              disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              {guardando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar acción
            </button>
          </div>
        </div>
      )}

      {acciones.length === 0 ? (
        <p className="text-sm text-white/40">
          No hay acciones registradas para este evento.
        </p>
      ) : (
        <div className="space-y-3">
          {acciones.map((accion) => (
            <div
              key={accion.recordId}
              className="bg-white/5 border border-white/10 rounded-lg p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-white/40">
                      {accion.idAccion}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] border ${
                        accion.tipo === "Preventiva"
                          ? "bg-blue-500/20 text-blue-200 border-blue-400/30"
                          : "bg-orange-500/20 text-orange-200 border-orange-400/30"
                      }`}
                    >
                      {accion.tipo}
                    </span>
                    {accion.jerarquiaControl && (
                      <span className="text-[11px] text-white/40">
                        {accion.jerarquiaControl}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/90">{accion.descripcion}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {accion.responsableNombre || "Sin responsable"}
                    {accion.responsableTipo ? ` (${accion.responsableTipo})` : ""} ·
                    Ejecución: {formatearFecha(accion.fechaEjecucion)}
                    {accion.fechaCierre
                      ? ` · Cierre: ${formatearFecha(accion.fechaCierre)}`
                      : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={accion.estado || "Pendiente"}
                    onChange={(e) =>
                      cambiarEstado(accion, e.target.value as EstadoAccion)
                    }
                    className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                  >
                    {ESTADOS_ACCION.map((e) => (
                      <option key={e} value={e} className="bg-slate-800">
                        {e}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => eliminar(accion)}
                    title="Desactivar acción"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ══════════════════════════════════════════════════════════
// Auxiliares
// ══════════════════════════════════════════════════════════
function Lectura({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-white/50">{etiqueta}</p>
      <p className="text-white/90">{valor}</p>
    </div>
  );
}

function CampoTexto({
  etiqueta,
  valor,
  onChange,
  filas = 2,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  filas?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/60 mb-1.5">
        {etiqueta}
      </label>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        rows={filas}
        className={claseInput}
      />
    </div>
  );
}
