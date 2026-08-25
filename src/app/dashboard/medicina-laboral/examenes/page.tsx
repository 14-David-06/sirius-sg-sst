"use client";

// ══════════════════════════════════════════════════════════
// Medicina Laboral — Exámenes Médicos Ocupacionales
// Resolución 2346/2007 · ingreso, periódicos, egreso y reintegro
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
  CONCEPTOS_APTITUD,
  ESTADOS_EXAMEN,
  TIPOS_EXAMEN,
  type ConceptoAptitud,
  type CrearExamenPayload,
  type EstadoExamen,
  type ExamenMedico,
  type TipoExamen,
} from "@/lib/medicina-laboral/types";

interface Formulario {
  recordId?: string;
  idEmpleadoCore: string;
  fechaExamen: string;
  tipoExamen: TipoExamen | "";
  ipsEntidad: string;
  conceptoAptitud: ConceptoAptitud | "";
  estado: EstadoExamen | "";
  fechaProgramada: string;
  restricciones: string;
  recomendaciones: string;
  observaciones: string;
}

function formularioVacio(): Formulario {
  return {
    idEmpleadoCore: "",
    fechaExamen: hoyColombia(),
    tipoExamen: "",
    ipsEntidad: "",
    conceptoAptitud: "",
    estado: "Programado",
    fechaProgramada: "",
    restricciones: "",
    recomendaciones: "",
    observaciones: "",
  };
}

function desdeExamen(e: ExamenMedico): Formulario {
  return {
    recordId: e.recordId,
    idEmpleadoCore: e.idEmpleadoCore,
    fechaExamen: e.fechaExamen.slice(0, 10),
    tipoExamen: e.tipoExamen,
    ipsEntidad: e.ipsEntidad || "",
    conceptoAptitud: e.conceptoAptitud || "",
    estado: e.estado,
    fechaProgramada: e.fechaProgramada?.slice(0, 10) || "",
    restricciones: e.restricciones || "",
    recomendaciones: e.recomendaciones || "",
    observaciones: e.observaciones || "",
  };
}

export default function ExamenesMedicosPage() {
  const [hoy] = useState(hoyColombia);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));
  const [filtroTipo, setFiltroTipo] = useState<TipoExamen | "">("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoExamen | "">("");

  const periodo = useMemo(() => rangoDelMes(anio, mes), [anio, mes]);
  const query = useMemo(() => {
    const p = new URLSearchParams({ desde: periodo.desde, hasta: periodo.hasta });
    if (filtroTipo) p.set("tipoExamen", filtroTipo);
    if (filtroEstado) p.set("estado", filtroEstado);
    return p.toString();
  }, [periodo, filtroTipo, filtroEstado]);

  const { items, cargando, error, guardar, eliminar } =
    useRecurso<ExamenMedico>("examenes", query);
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
    if (!form.fechaExamen) {
      setErrorForm("La fecha del examen es obligatoria");
      return;
    }
    if (!form.tipoExamen) {
      setErrorForm("El tipo de examen es obligatorio");
      return;
    }

    const payload: CrearExamenPayload = {
      fechaExamen: form.fechaExamen,
      tipoExamen: form.tipoExamen,
      idEmpleadoCore: persona.idEmpleado,
      nombreEmpleado: persona.nombreCompleto,
      numeroDocumento: persona.numeroDocumento,
      cargo: persona.tipoPersonal,
      ...(form.ipsEntidad ? { ipsEntidad: form.ipsEntidad } : {}),
      ...(form.conceptoAptitud ? { conceptoAptitud: form.conceptoAptitud } : {}),
      ...(form.estado ? { estado: form.estado } : {}),
      ...(form.fechaProgramada ? { fechaProgramada: form.fechaProgramada } : {}),
      ...(form.restricciones ? { restricciones: form.restricciones } : {}),
      ...(form.recomendaciones ? { recomendaciones: form.recomendaciones } : {}),
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

  async function borrar(examen: ExamenMedico) {
    if (!confirm(`¿Eliminar el examen ${examen.consecutivo} de ${examen.nombreEmpleado}?`)) {
      return;
    }
    try {
      await eliminar(examen.recordId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  const columnas: Columna<ExamenMedico>[] = [
    { titulo: "Consecutivo", render: (e) => <span className="font-mono text-xs">{e.consecutivo}</span> },
    { titulo: "Fecha", render: (e) => formatearFecha(e.fechaExamen) },
    { titulo: "Trabajador", render: (e) => (
      <div>
        <div className="text-white">{e.nombreEmpleado}</div>
        <div className="text-white/50 text-xs">{e.numeroDocumento} · {e.cargo}</div>
      </div>
    ) },
    { titulo: "Tipo", render: (e) => <Etiqueta texto={e.tipoExamen} /> },
    { titulo: "IPS / Entidad", render: (e) => e.ipsEntidad || "—" },
    { titulo: "Concepto de aptitud", render: (e) => <Etiqueta texto={e.conceptoAptitud} /> },
    { titulo: "Estado", render: (e) => <Etiqueta texto={e.estado} /> },
  ];

  return (
    <PaginaSubmodulo>
      <CabeceraSubmodulo
        titulo="Exámenes Médicos Ocupacionales"
        descripcion="Exámenes de ingreso, periódicos, de egreso y de reintegro, con su concepto de aptitud, restricciones y recomendaciones."
        etiquetas={["Estándar 3.1.6", "Resolución 2346/2007"]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-3">
          <SelectorPeriodo anio={anio} mes={mes} setAnio={setAnio} setMes={setMes} />
          <div className="w-44">
            <Opciones
              valor={filtroTipo}
              onChange={setFiltroTipo}
              opciones={TIPOS_EXAMEN}
              placeholder="Todos los tipos"
            />
          </div>
          <div className="w-44">
            <Opciones
              valor={filtroEstado}
              onChange={setFiltroEstado}
              opciones={ESTADOS_EXAMEN}
              placeholder="Todos los estados"
            />
          </div>
        </div>
        <BotonNuevo texto="Nuevo examen" onClick={() => setForm(formularioVacio())} />
      </div>

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={items.length === 0}
        mensajeVacio="No hay exámenes médicos registrados en el periodo seleccionado."
      />

      {!cargando && !error && items.length > 0 && (
        <TablaRegistros
          columnas={columnas}
          filas={items}
          onEditar={(e) => setForm(desdeExamen(e))}
          onEliminar={borrar}
        />
      )}

      {form && (
        <ModalFormulario
          titulo={form.recordId ? "Editar examen médico" : "Nuevo examen médico"}
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
          <Campo label="Fecha del examen" obligatorio>
            <Texto tipo="date" valor={form.fechaExamen} onChange={(v) => set("fechaExamen", v)} />
          </Campo>
          <Campo label="Tipo de examen" obligatorio>
            <Opciones valor={form.tipoExamen} onChange={(v) => set("tipoExamen", v)} opciones={TIPOS_EXAMEN} />
          </Campo>
          <Campo label="IPS / Entidad">
            <Texto valor={form.ipsEntidad} onChange={(v) => set("ipsEntidad", v)} placeholder="Ej. IPS Salud Ocupacional" />
          </Campo>
          <Campo label="Estado">
            <Opciones valor={form.estado} onChange={(v) => set("estado", v)} opciones={ESTADOS_EXAMEN} />
          </Campo>
          <Campo label="Concepto de aptitud">
            <Opciones valor={form.conceptoAptitud} onChange={(v) => set("conceptoAptitud", v)} opciones={CONCEPTOS_APTITUD} />
          </Campo>
          <Campo label="Fecha programada">
            <Texto tipo="date" valor={form.fechaProgramada} onChange={(v) => set("fechaProgramada", v)} />
          </Campo>
          <Campo label="Restricciones" ancho="completo">
            <AreaTexto valor={form.restricciones} onChange={(v) => set("restricciones", v)} />
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
