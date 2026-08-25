"use client";

// ══════════════════════════════════════════════════════════
// Medicina Laboral — Enfermedades Laborales
// Calificación de origen, PCL y reconocimiento por la ARL
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
  ESTADOS_ENFERMEDAD_LABORAL,
  type CrearEnfermedadLaboralPayload,
  type EnfermedadLaboral,
  type EstadoEnfermedadLaboral,
} from "@/lib/medicina-laboral/types";

interface Formulario {
  recordId?: string;
  idEmpleadoCore: string;
  diagnostico: string;
  fechaDiagnostico: string;
  fechaInicioSintomas: string;
  estado: EstadoEnfermedadLaboral | "";
  entidadCalificadora: string;
  fechaCalificacion: string;
  pcl: string;
  fechaEstructuracion: string;
  observaciones: string;
}

function formularioVacio(): Formulario {
  return {
    idEmpleadoCore: "",
    diagnostico: "",
    fechaDiagnostico: hoyColombia(),
    fechaInicioSintomas: "",
    estado: "En proceso de calificación",
    entidadCalificadora: "",
    fechaCalificacion: "",
    pcl: "",
    fechaEstructuracion: "",
    observaciones: "",
  };
}

function desdeEnfermedad(e: EnfermedadLaboral): Formulario {
  return {
    recordId: e.recordId,
    idEmpleadoCore: e.idEmpleadoCore,
    diagnostico: e.diagnostico || "",
    fechaDiagnostico: e.fechaDiagnostico.slice(0, 10),
    fechaInicioSintomas: e.fechaInicioSintomas?.slice(0, 10) || "",
    estado: e.estado,
    entidadCalificadora: e.entidadCalificadora || "",
    fechaCalificacion: e.fechaCalificacion?.slice(0, 10) || "",
    pcl: e.pcl !== null ? String(e.pcl) : "",
    fechaEstructuracion: e.fechaEstructuracion?.slice(0, 10) || "",
    observaciones: e.observaciones || "",
  };
}

export default function EnfermedadesLaboralesPage() {
  const [hoy] = useState(hoyColombia);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));
  const [filtroEstado, setFiltroEstado] = useState<EstadoEnfermedadLaboral | "">("");

  const periodo = useMemo(() => rangoDelMes(anio, mes), [anio, mes]);
  const query = useMemo(() => {
    const p = new URLSearchParams({ desde: periodo.desde, hasta: periodo.hasta });
    if (filtroEstado) p.set("estado", filtroEstado);
    return p.toString();
  }, [periodo, filtroEstado]);

  const { items, cargando, error, guardar, eliminar } =
    useRecurso<EnfermedadLaboral>("enfermedades-laborales", query);
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
    if (!form.fechaDiagnostico) {
      setErrorForm("La fecha de diagnóstico es obligatoria");
      return;
    }
    if (form.fechaInicioSintomas && form.fechaInicioSintomas > form.fechaDiagnostico) {
      setErrorForm("El inicio de síntomas no puede ser posterior al diagnóstico");
      return;
    }

    let pcl: number | undefined;
    if (form.pcl.trim()) {
      pcl = Number(form.pcl);
      if (!Number.isFinite(pcl) || pcl < 0 || pcl > 100) {
        setErrorForm("La PCL debe ser un porcentaje entre 0 y 100");
        return;
      }
    }

    const payload: CrearEnfermedadLaboralPayload = {
      idEmpleadoCore: persona.idEmpleado,
      nombreEmpleado: persona.nombreCompleto,
      numeroDocumento: persona.numeroDocumento,
      cargo: persona.tipoPersonal,
      fechaDiagnostico: form.fechaDiagnostico,
      ...(form.diagnostico ? { diagnostico: form.diagnostico } : {}),
      ...(form.fechaInicioSintomas ? { fechaInicioSintomas: form.fechaInicioSintomas } : {}),
      ...(form.estado ? { estado: form.estado } : {}),
      ...(form.entidadCalificadora ? { entidadCalificadora: form.entidadCalificadora } : {}),
      ...(form.fechaCalificacion ? { fechaCalificacion: form.fechaCalificacion } : {}),
      ...(pcl !== undefined ? { pcl } : {}),
      ...(form.fechaEstructuracion ? { fechaEstructuracion: form.fechaEstructuracion } : {}),
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

  async function borrar(e: EnfermedadLaboral) {
    if (!confirm(`¿Eliminar la enfermedad laboral ${e.consecutivo} de ${e.nombreEmpleado}?`)) return;
    try {
      await eliminar(e.recordId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  const columnas: Columna<EnfermedadLaboral>[] = [
    { titulo: "Consecutivo", render: (e) => <span className="font-mono text-xs">{e.consecutivo}</span> },
    { titulo: "Trabajador", render: (e) => (
      <div>
        <div className="text-white">{e.nombreEmpleado}</div>
        <div className="text-white/50 text-xs">{e.numeroDocumento} · {e.cargo}</div>
      </div>
    ) },
    { titulo: "Diagnóstico", render: (e) => (
      <span className="block max-w-xs truncate" title={e.diagnostico || ""}>
        {e.diagnostico || "—"}
      </span>
    ) },
    { titulo: "Fecha diagnóstico", render: (e) => formatearFecha(e.fechaDiagnostico) },
    { titulo: "Estado", render: (e) => <Etiqueta texto={e.estado} /> },
    { titulo: "Entidad calificadora", render: (e) => e.entidadCalificadora || "—" },
    { titulo: "PCL", render: (e) => (e.pcl !== null ? `${e.pcl}%` : "—") },
    { titulo: "Estructuración", render: (e) => formatearFecha(e.fechaEstructuracion) },
  ];

  return (
    <PaginaSubmodulo>
      <CabeceraSubmodulo
        titulo="Enfermedades Laborales"
        descripcion="Enfermedades en proceso de calificación de origen y reconocidas por la ARL, con porcentaje de pérdida de capacidad laboral y fecha de estructuración."
        etiquetas={["Estándar 3.1.6", "Decreto 1477/2014"]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-3">
          <SelectorPeriodo anio={anio} mes={mes} setAnio={setAnio} setMes={setMes} />
          <div className="w-64">
            <Opciones
              valor={filtroEstado}
              onChange={setFiltroEstado}
              opciones={ESTADOS_ENFERMEDAD_LABORAL}
              placeholder="Todos los estados"
            />
          </div>
        </div>
        <BotonNuevo texto="Nueva enfermedad laboral" onClick={() => setForm(formularioVacio())} />
      </div>

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={items.length === 0}
        mensajeVacio="No hay enfermedades laborales registradas en el periodo seleccionado."
      />

      {!cargando && !error && items.length > 0 && (
        <TablaRegistros
          columnas={columnas}
          filas={items}
          onEditar={(e) => setForm(desdeEnfermedad(e))}
          onEliminar={borrar}
        />
      )}

      {form && (
        <ModalFormulario
          titulo={form.recordId ? "Editar enfermedad laboral" : "Nueva enfermedad laboral"}
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
          <Campo label="Fecha de diagnóstico" obligatorio>
            <Texto tipo="date" valor={form.fechaDiagnostico} onChange={(v) => set("fechaDiagnostico", v)} />
          </Campo>
          <Campo label="Inicio de síntomas">
            <Texto tipo="date" valor={form.fechaInicioSintomas} onChange={(v) => set("fechaInicioSintomas", v)} />
          </Campo>
          <Campo label="Estado">
            <Opciones valor={form.estado} onChange={(v) => set("estado", v)} opciones={ESTADOS_ENFERMEDAD_LABORAL} />
          </Campo>
          <Campo label="Entidad calificadora">
            <Texto
              valor={form.entidadCalificadora}
              onChange={(v) => set("entidadCalificadora", v)}
              placeholder="ARL, EPS o Junta de Calificación"
            />
          </Campo>
          <Campo label="Fecha de calificación">
            <Texto tipo="date" valor={form.fechaCalificacion} onChange={(v) => set("fechaCalificacion", v)} />
          </Campo>
          <Campo label="PCL (% pérdida de capacidad laboral)">
            <Texto tipo="number" min={0} max={100} valor={form.pcl} onChange={(v) => set("pcl", v)} />
          </Campo>
          <Campo label="Fecha de estructuración">
            <Texto tipo="date" valor={form.fechaEstructuracion} onChange={(v) => set("fechaEstructuracion", v)} />
          </Campo>
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
