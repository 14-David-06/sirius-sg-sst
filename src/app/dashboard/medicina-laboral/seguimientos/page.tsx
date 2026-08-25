"use client";

// ══════════════════════════════════════════════════════════
// Medicina Laboral — Seguimientos Médicos
// Restricciones médicas, controles periódicos y valoraciones
// ══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import {
  AreaTexto,
  BotonNuevo,
  CabeceraSubmodulo,
  Campo,
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
  TIPOS_SEGUIMIENTO,
  type CrearSeguimientoPayload,
  type SeguimientoMedico,
  type TipoSeguimiento,
} from "@/lib/medicina-laboral/types";

interface Formulario {
  recordId?: string;
  idEmpleadoCore: string;
  fechaSeguimiento: string;
  tipoSeguimiento: TipoSeguimiento | "";
  diagnostico: string;
  accionesRealizadas: string;
  recomendaciones: string;
  proximaCita: string;
  observaciones: string;
}

function formularioVacio(): Formulario {
  return {
    idEmpleadoCore: "",
    fechaSeguimiento: hoyColombia(),
    tipoSeguimiento: "",
    diagnostico: "",
    accionesRealizadas: "",
    recomendaciones: "",
    proximaCita: "",
    observaciones: "",
  };
}

function desdeSeguimiento(s: SeguimientoMedico): Formulario {
  return {
    recordId: s.recordId,
    idEmpleadoCore: s.idEmpleadoCore,
    fechaSeguimiento: s.fechaSeguimiento.slice(0, 10),
    tipoSeguimiento: s.tipoSeguimiento,
    diagnostico: s.diagnostico || "",
    accionesRealizadas: s.accionesRealizadas || "",
    recomendaciones: s.recomendaciones || "",
    proximaCita: s.proximaCita?.slice(0, 10) || "",
    observaciones: s.observaciones || "",
  };
}

export default function SeguimientosMedicosPage() {
  const [hoy] = useState(hoyColombia);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));
  const [filtroTipo, setFiltroTipo] = useState<TipoSeguimiento | "">("");

  const periodo = useMemo(() => rangoDelMes(anio, mes), [anio, mes]);
  const query = useMemo(() => {
    const p = new URLSearchParams({ desde: periodo.desde, hasta: periodo.hasta });
    if (filtroTipo) p.set("tipoSeguimiento", filtroTipo);
    return p.toString();
  }, [periodo, filtroTipo]);

  const { items, cargando, error, guardar, eliminar } =
    useRecurso<SeguimientoMedico>("seguimientos", query);
  const { personal, cargandoPersonal } = useTrabajadores();

  const [form, setForm] = useState<Formulario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const set = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setForm((f) => (f ? { ...f, [campo]: valor } : f));

  async function enviar() {
    if (!form) return;
    setErrorForm(null);

    const persona = personal.find((p) => p.idEmpleado === form.idEmpleadoCore);
    if (!persona) {
      setErrorForm("Debe seleccionar el trabajador");
      return;
    }
    if (!form.fechaSeguimiento) {
      setErrorForm("La fecha del seguimiento es obligatoria");
      return;
    }
    if (!form.tipoSeguimiento) {
      setErrorForm("El tipo de seguimiento es obligatorio");
      return;
    }
    if (form.proximaCita && form.proximaCita < form.fechaSeguimiento) {
      setErrorForm("La próxima cita no puede ser anterior a la fecha del seguimiento");
      return;
    }

    const payload: CrearSeguimientoPayload = {
      fechaSeguimiento: form.fechaSeguimiento,
      tipoSeguimiento: form.tipoSeguimiento,
      idEmpleadoCore: persona.idEmpleado,
      nombreEmpleado: persona.nombreCompleto,
      numeroDocumento: persona.numeroDocumento,
      cargo: persona.tipoPersonal,
      ...(form.diagnostico ? { diagnostico: form.diagnostico } : {}),
      ...(form.accionesRealizadas ? { accionesRealizadas: form.accionesRealizadas } : {}),
      ...(form.recomendaciones ? { recomendaciones: form.recomendaciones } : {}),
      ...(form.proximaCita ? { proximaCita: form.proximaCita } : {}),
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

  async function borrar(s: SeguimientoMedico) {
    if (!confirm(`¿Eliminar el seguimiento ${s.consecutivo} de ${s.nombreEmpleado}?`)) return;
    try {
      await eliminar(s.recordId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  const columnas: Columna<SeguimientoMedico>[] = [
    { titulo: "Consecutivo", render: (s) => <span className="font-mono text-xs">{s.consecutivo}</span> },
    { titulo: "Fecha", render: (s) => formatearFecha(s.fechaSeguimiento) },
    { titulo: "Trabajador", render: (s) => (
      <div>
        <div className="text-white">{s.nombreEmpleado}</div>
        <div className="text-white/50 text-xs">{s.numeroDocumento} · {s.cargo}</div>
      </div>
    ) },
    { titulo: "Tipo", render: (s) => <Etiqueta texto={s.tipoSeguimiento} /> },
    { titulo: "Diagnóstico", render: (s) => (
      <span className="block max-w-xs truncate" title={s.diagnostico || ""}>
        {s.diagnostico || "—"}
      </span>
    ) },
    { titulo: "Próxima cita", render: (s) => formatearFecha(s.proximaCita) },
  ];

  return (
    <PaginaSubmodulo>
      <CabeceraSubmodulo
        titulo="Seguimientos Médicos"
        descripcion="Seguimiento de restricciones médicas, controles periódicos y valoraciones especializadas de los trabajadores."
        etiquetas={["Estándar 3.1.6", "Decreto 1072/2015"]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-3">
          <SelectorPeriodo anio={anio} mes={mes} setAnio={setAnio} setMes={setMes} />
          <div className="w-56">
            <Opciones
              valor={filtroTipo}
              onChange={setFiltroTipo}
              opciones={TIPOS_SEGUIMIENTO}
              placeholder="Todos los tipos"
            />
          </div>
        </div>
        <BotonNuevo texto="Nuevo seguimiento" onClick={() => setForm(formularioVacio())} />
      </div>

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={items.length === 0}
        mensajeVacio="No hay seguimientos médicos registrados en el periodo seleccionado."
      />

      {!cargando && !error && items.length > 0 && (
        <TablaRegistros
          columnas={columnas}
          filas={items}
          onEditar={(s) => setForm(desdeSeguimiento(s))}
          onEliminar={borrar}
        />
      )}

      {form && (
        <ModalFormulario
          titulo={form.recordId ? "Editar seguimiento médico" : "Nuevo seguimiento médico"}
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
          <Campo label="Fecha del seguimiento" obligatorio>
            <Texto tipo="date" valor={form.fechaSeguimiento} onChange={(v) => set("fechaSeguimiento", v)} />
          </Campo>
          <Campo label="Tipo de seguimiento" obligatorio>
            <Opciones valor={form.tipoSeguimiento} onChange={(v) => set("tipoSeguimiento", v)} opciones={TIPOS_SEGUIMIENTO} />
          </Campo>
          <Campo label="Próxima cita">
            <Texto tipo="date" valor={form.proximaCita} onChange={(v) => set("proximaCita", v)} />
          </Campo>
          <Campo label="Diagnóstico" ancho="completo">
            <AreaTexto valor={form.diagnostico} onChange={(v) => set("diagnostico", v)} />
          </Campo>
          <Campo label="Acciones realizadas" ancho="completo">
            <AreaTexto valor={form.accionesRealizadas} onChange={(v) => set("accionesRealizadas", v)} />
          </Campo>
          <Campo label="Recomendaciones" ancho="completo">
            <AreaTexto valor={form.recomendaciones} onChange={(v) => set("recomendaciones", v)} />
          </Campo>
          <Campo label="Observaciones" ancho="completo">
            <AreaTexto valor={form.observaciones} onChange={(v) => set("observaciones", v)} />
          </Campo>
        </ModalFormulario>
      )}
    </PaginaSubmodulo>
  );
}
