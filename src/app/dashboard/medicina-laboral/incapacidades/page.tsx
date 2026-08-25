"use client";

// ══════════════════════════════════════════════════════════
// Medicina Laboral — Incapacidades y Licencias
// Registro de incapacidades médicas, prórrogas y licencias
// ══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import {
  AreaTexto,
  BotonNuevo,
  CabeceraSubmodulo,
  Campo,
  Casilla,
  Etiqueta,
  EstadoLista,
  ModalFormulario,
  Opciones,
  PaginaSubmodulo,
  SelectorPeriodo,
  SelectorTrabajador,
  TablaRegistros,
  Texto,
  formatearFecha,
  hoyColombia,
  rangoDelMes,
  useRecurso,
  useTrabajadores,
  type Columna,
} from "../_components/ui";
import {
  TIPOS_INCAPACIDAD,
  type CrearIncapacidadPayload,
  type Incapacidad,
  type TipoIncapacidad,
} from "@/lib/medicina-laboral/types";

interface Formulario {
  recordId?: string;
  idEmpleadoCore: string;
  tipo: TipoIncapacidad | "";
  diagnostico: string;
  fechaInicio: string;
  fechaFin: string;
  entidadEmisora: string;
  numeroIncapacidad: string;
  prorroga: boolean;
  incapacidadOrigenRecordId: string;
  observaciones: string;
}

function formularioVacio(): Formulario {
  return {
    idEmpleadoCore: "",
    tipo: "",
    diagnostico: "",
    fechaInicio: hoyColombia(),
    fechaFin: hoyColombia(),
    entidadEmisora: "",
    numeroIncapacidad: "",
    prorroga: false,
    incapacidadOrigenRecordId: "",
    observaciones: "",
  };
}

function desdeIncapacidad(i: Incapacidad): Formulario {
  return {
    recordId: i.recordId,
    idEmpleadoCore: i.idEmpleadoCore,
    tipo: i.tipo,
    diagnostico: i.diagnostico || "",
    fechaInicio: i.fechaInicio.slice(0, 10),
    fechaFin: i.fechaFin.slice(0, 10),
    entidadEmisora: i.entidadEmisora || "",
    numeroIncapacidad: i.numeroIncapacidad || "",
    prorroga: i.prorroga,
    incapacidadOrigenRecordId: i.incapacidadOrigenRecordId || "",
    observaciones: i.observaciones || "",
  };
}

/** Días calendario entre dos fechas, ambos extremos incluidos. */
function diasEntre(inicio: string, fin: string): number {
  if (!inicio || !fin) return 0;
  const ms = Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`);
  if (Number.isNaN(ms)) return 0;
  return Math.floor(ms / 86_400_000) + 1;
}

export default function IncapacidadesPage() {
  const [hoy] = useState(hoyColombia);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));
  const [filtroTipo, setFiltroTipo] = useState<TipoIncapacidad | "">("");

  const periodo = useMemo(() => rangoDelMes(anio, mes), [anio, mes]);
  const query = useMemo(() => {
    const p = new URLSearchParams({ desde: periodo.desde, hasta: periodo.hasta });
    if (filtroTipo) p.set("tipo", filtroTipo);
    return p.toString();
  }, [periodo, filtroTipo]);

  const { items, cargando, error, guardar, eliminar } =
    useRecurso<Incapacidad>("incapacidades", query);
  const { personal, cargandoPersonal } = useTrabajadores();

  const [form, setForm] = useState<Formulario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const set = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setForm((f) => (f ? { ...f, [campo]: valor } : f));

  const totalDias = useMemo(
    () => items.reduce((suma, i) => suma + (i.diasIncapacidad || 0), 0),
    [items]
  );

  /** Incapacidades del mismo trabajador, candidatas a ser el origen de una prórroga. */
  const candidatasOrigen = useMemo(
    () =>
      items.filter(
        (i) =>
          i.idEmpleadoCore === form?.idEmpleadoCore && i.recordId !== form?.recordId
      ),
    [items, form?.idEmpleadoCore, form?.recordId]
  );

  async function enviar() {
    if (!form) return;
    setErrorForm(null);

    const persona = personal.find((p) => p.idEmpleado === form.idEmpleadoCore);
    if (!persona) {
      setErrorForm("Debe seleccionar el trabajador");
      return;
    }
    if (!form.tipo) {
      setErrorForm("El tipo de incapacidad es obligatorio");
      return;
    }
    if (!form.fechaInicio || !form.fechaFin) {
      setErrorForm("Las fechas de inicio y fin son obligatorias");
      return;
    }
    if (form.fechaFin < form.fechaInicio) {
      setErrorForm("La fecha de fin debe ser mayor o igual a la fecha de inicio");
      return;
    }

    const payload: CrearIncapacidadPayload = {
      tipo: form.tipo,
      idEmpleadoCore: persona.idEmpleado,
      nombreEmpleado: persona.nombreCompleto,
      numeroDocumento: persona.numeroDocumento,
      cargo: persona.tipoPersonal,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      prorroga: form.prorroga,
      ...(form.diagnostico ? { diagnostico: form.diagnostico } : {}),
      ...(form.entidadEmisora ? { entidadEmisora: form.entidadEmisora } : {}),
      ...(form.numeroIncapacidad ? { numeroIncapacidad: form.numeroIncapacidad } : {}),
      ...(form.prorroga && form.incapacidadOrigenRecordId
        ? { incapacidadOrigenRecordId: form.incapacidadOrigenRecordId }
        : {}),
      ...(form.observaciones ? { observaciones: form.observaciones } : {}),
    };

    setGuardando(true);
    try {
      await guardar(payload, form.recordId);
      setForm(null);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(i: Incapacidad) {
    if (!confirm(`¿Eliminar la incapacidad ${i.consecutivo} de ${i.nombreEmpleado}?`)) return;
    try {
      await eliminar(i.recordId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  const columnas: Columna<Incapacidad>[] = [
    { titulo: "Consecutivo", render: (i) => <span className="font-mono text-xs">{i.consecutivo}</span> },
    { titulo: "Trabajador", render: (i) => (
      <div>
        <div className="text-white">{i.nombreEmpleado}</div>
        <div className="text-white/50 text-xs">{i.numeroDocumento} · {i.cargo}</div>
      </div>
    ) },
    { titulo: "Tipo", render: (i) => <Etiqueta texto={i.tipo} /> },
    { titulo: "Periodo", render: (i) => (
      <span className="whitespace-nowrap">
        {formatearFecha(i.fechaInicio)} → {formatearFecha(i.fechaFin)}
      </span>
    ) },
    { titulo: "Días", render: (i) => <span className="font-semibold text-white">{i.diasIncapacidad}</span> },
    { titulo: "Entidad", render: (i) => i.entidadEmisora || "—" },
    { titulo: "N.º incapacidad", render: (i) => i.numeroIncapacidad || "—" },
    { titulo: "Prórroga", render: (i) => (i.prorroga ? <Etiqueta texto="Sí" /> : <span className="text-white/40">—</span>) },
  ];

  return (
    <PaginaSubmodulo>
      <CabeceraSubmodulo
        titulo="Incapacidades y Licencias"
        descripcion="Incapacidades por enfermedad general, enfermedad laboral y accidente de trabajo, junto con licencias de maternidad y paternidad."
        etiquetas={["Estándar 3.1.6", "Decreto 1072/2015"]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <SelectorPeriodo anio={anio} mes={mes} setAnio={setAnio} setMes={setMes} />
          <div className="w-56">
            <Opciones
              valor={filtroTipo}
              onChange={setFiltroTipo}
              opciones={TIPOS_INCAPACIDAD}
              placeholder="Todos los tipos"
            />
          </div>
          {!cargando && items.length > 0 && (
            <span className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm">
              {totalDias} días en el periodo
            </span>
          )}
        </div>
        <BotonNuevo texto="Nueva incapacidad" onClick={() => setForm(formularioVacio())} />
      </div>

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={items.length === 0}
        mensajeVacio="No hay incapacidades registradas en el periodo seleccionado."
      />

      {!cargando && !error && items.length > 0 && (
        <TablaRegistros
          columnas={columnas}
          filas={items}
          onEditar={(i) => setForm(desdeIncapacidad(i))}
          onEliminar={borrar}
        />
      )}

      {form && (
        <ModalFormulario
          titulo={form.recordId ? "Editar incapacidad" : "Nueva incapacidad"}
          onCerrar={() => setForm(null)}
          onGuardar={enviar}
          guardando={guardando}
          error={errorForm}
        >
          <Campo label="Trabajador" obligatorio ancho="completo">
            <SelectorTrabajador
              personal={personal}
              valor={form.idEmpleadoCore}
              onChange={(v) => set("idEmpleadoCore", v)}
              cargando={cargandoPersonal}
            />
          </Campo>
          <Campo label="Tipo de incapacidad" obligatorio>
            <Opciones valor={form.tipo} onChange={(v) => set("tipo", v)} opciones={TIPOS_INCAPACIDAD} />
          </Campo>
          <Campo label="Entidad emisora">
            <Texto valor={form.entidadEmisora} onChange={(v) => set("entidadEmisora", v)} placeholder="EPS, ARL o IPS" />
          </Campo>
          <Campo label="Fecha de inicio" obligatorio>
            <Texto tipo="date" valor={form.fechaInicio} onChange={(v) => set("fechaInicio", v)} />
          </Campo>
          <Campo label="Fecha de fin" obligatorio>
            <Texto tipo="date" valor={form.fechaFin} onChange={(v) => set("fechaFin", v)} />
          </Campo>
          <Campo label="Días de incapacidad (calculado)">
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm">
              {diasEntre(form.fechaInicio, form.fechaFin)} días
            </div>
          </Campo>
          <Campo label="N.º de incapacidad">
            <Texto valor={form.numeroIncapacidad} onChange={(v) => set("numeroIncapacidad", v)} />
          </Campo>
          <Casilla
            etiqueta="Es una prórroga de una incapacidad anterior"
            valor={form.prorroga}
            onChange={(v) => set("prorroga", v)}
          />
          {form.prorroga && (
            <Campo label="Incapacidad de origen" ancho="completo">
              <select
                value={form.incapacidadOrigenRecordId}
                onChange={(e) => set("incapacidadOrigenRecordId", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm
                           focus:outline-none focus:border-blue-400/60 focus:bg-white/10 transition-colors"
              >
                <option value="" className="bg-slate-800">
                  Sin vincular
                </option>
                {candidatasOrigen.map((i) => (
                  <option key={i.recordId} value={i.recordId} className="bg-slate-800">
                    {i.consecutivo} — {formatearFecha(i.fechaInicio)} a {formatearFecha(i.fechaFin)}
                  </option>
                ))}
              </select>
              {form.idEmpleadoCore && candidatasOrigen.length === 0 && (
                <span className="text-white/50 text-xs">
                  No hay incapacidades previas de este trabajador en el periodo consultado.
                </span>
              )}
            </Campo>
          )}
          <Campo label="Diagnóstico" ancho="completo">
            <AreaTexto valor={form.diagnostico} onChange={(v) => set("diagnostico", v)} />
          </Campo>
          <Campo label="Observaciones" ancho="completo">
            <AreaTexto valor={form.observaciones} onChange={(v) => set("observaciones", v)} />
          </Campo>
        </ModalFormulario>
      )}
    </PaginaSubmodulo>
  );
}
