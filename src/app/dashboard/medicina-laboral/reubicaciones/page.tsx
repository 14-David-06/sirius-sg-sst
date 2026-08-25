"use client";

// ══════════════════════════════════════════════════════════
// Medicina Laboral — Reubicaciones Laborales
// Resolución 1918/2009 · reubicación temporal, definitiva y rehabilitación
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
  ESTADOS_REUBICACION,
  TIPOS_REUBICACION,
  type CrearReubicacionPayload,
  type EstadoReubicacion,
  type Reubicacion,
  type TipoReubicacion,
} from "@/lib/medicina-laboral/types";

interface Formulario {
  recordId?: string;
  idEmpleadoCore: string;
  tipo: TipoReubicacion | "";
  cargoOrigen: string;
  cargoDestino: string;
  fechaInicio: string;
  fechaFinEstimada: string;
  fechaCierre: string;
  motivo: string;
  restricciones: string;
  estado: EstadoReubicacion | "";
  rehabilitado: boolean;
  observaciones: string;
}

function formularioVacio(): Formulario {
  return {
    idEmpleadoCore: "",
    tipo: "",
    cargoOrigen: "",
    cargoDestino: "",
    fechaInicio: hoyColombia(),
    fechaFinEstimada: "",
    fechaCierre: "",
    motivo: "",
    restricciones: "",
    estado: "Activa",
    rehabilitado: false,
    observaciones: "",
  };
}

function desdeReubicacion(r: Reubicacion): Formulario {
  return {
    recordId: r.recordId,
    idEmpleadoCore: r.idEmpleadoCore,
    tipo: r.tipo,
    cargoOrigen: r.cargoOrigen,
    cargoDestino: r.cargoDestino,
    fechaInicio: r.fechaInicio.slice(0, 10),
    fechaFinEstimada: r.fechaFinEstimada?.slice(0, 10) || "",
    fechaCierre: r.fechaCierre?.slice(0, 10) || "",
    motivo: r.motivo || "",
    restricciones: r.restricciones || "",
    estado: r.estado,
    rehabilitado: r.rehabilitado,
    observaciones: r.observaciones || "",
  };
}

export default function ReubicacionesPage() {
  const [hoy] = useState(hoyColombia);
  const [anio, setAnio] = useState(() => Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoy.slice(5, 7)));
  const [filtroTipo, setFiltroTipo] = useState<TipoReubicacion | "">("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoReubicacion | "">("");

  const periodo = useMemo(() => rangoDelMes(anio, mes), [anio, mes]);
  const query = useMemo(() => {
    const p = new URLSearchParams({ desde: periodo.desde, hasta: periodo.hasta });
    if (filtroTipo) p.set("tipo", filtroTipo);
    if (filtroEstado) p.set("estado", filtroEstado);
    return p.toString();
  }, [periodo, filtroTipo, filtroEstado]);

  const { items, cargando, error, guardar, eliminar } =
    useRecurso<Reubicacion>("reubicaciones", query);
  const { personal, cargandoPersonal } = useTrabajadores();

  const [form, setForm] = useState<Formulario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const set = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setForm((f) => (f ? { ...f, [campo]: valor } : f));

  /** Al elegir el trabajador se propone su cargo actual como cargo de origen. */
  function elegirTrabajador(idEmpleado: string) {
    const persona = personal.find((p) => p.idEmpleado === idEmpleado);
    setForm((f) =>
      f
        ? {
            ...f,
            idEmpleadoCore: idEmpleado,
            cargoOrigen: f.cargoOrigen || persona?.tipoPersonal || "",
          }
        : f
    );
  }

  async function enviar() {
    if (!form) return;
    setErrorForm(null);

    const persona = personal.find((p) => p.idEmpleado === form.idEmpleadoCore);
    if (!persona) {
      setErrorForm("Debe seleccionar el trabajador");
      return;
    }
    if (!form.tipo) {
      setErrorForm("El tipo de reubicación es obligatorio");
      return;
    }
    if (!form.cargoOrigen.trim() || !form.cargoDestino.trim()) {
      setErrorForm("Los cargos de origen y destino son obligatorios");
      return;
    }
    if (!form.fechaInicio) {
      setErrorForm("La fecha de inicio es obligatoria");
      return;
    }
    if (form.fechaFinEstimada && form.fechaFinEstimada < form.fechaInicio) {
      setErrorForm("La fecha fin estimada no puede ser anterior a la de inicio");
      return;
    }
    if (form.fechaCierre && form.fechaCierre < form.fechaInicio) {
      setErrorForm("La fecha de cierre no puede ser anterior a la de inicio");
      return;
    }

    const payload: CrearReubicacionPayload & {
      fechaCierre?: string;
      rehabilitado?: boolean;
    } = {
      tipo: form.tipo,
      idEmpleadoCore: persona.idEmpleado,
      nombreEmpleado: persona.nombreCompleto,
      numeroDocumento: persona.numeroDocumento,
      cargoOrigen: form.cargoOrigen.trim(),
      cargoDestino: form.cargoDestino.trim(),
      fechaInicio: form.fechaInicio,
      ...(form.fechaFinEstimada ? { fechaFinEstimada: form.fechaFinEstimada } : {}),
      ...(form.motivo ? { motivo: form.motivo } : {}),
      ...(form.restricciones ? { restricciones: form.restricciones } : {}),
      ...(form.estado ? { estado: form.estado } : {}),
      ...(form.observaciones ? { observaciones: form.observaciones } : {}),
      // Cierre y rehabilitación solo se registran al actualizar
      ...(form.recordId
        ? {
            rehabilitado: form.rehabilitado,
            ...(form.fechaCierre ? { fechaCierre: form.fechaCierre } : {}),
          }
        : {}),
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

  async function borrar(r: Reubicacion) {
    if (!confirm(`¿Eliminar la reubicación ${r.consecutivo} de ${r.nombreEmpleado}?`)) return;
    try {
      await eliminar(r.recordId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  const columnas: Columna<Reubicacion>[] = [
    { titulo: "Consecutivo", render: (r) => <span className="font-mono text-xs">{r.consecutivo}</span> },
    { titulo: "Trabajador", render: (r) => (
      <div>
        <div className="text-white">{r.nombreEmpleado}</div>
        <div className="text-white/50 text-xs">{r.numeroDocumento}</div>
      </div>
    ) },
    { titulo: "Tipo", render: (r) => <Etiqueta texto={r.tipo} /> },
    { titulo: "Cargo", render: (r) => (
      <span className="whitespace-nowrap text-xs">
        {r.cargoOrigen} → <span className="text-white">{r.cargoDestino}</span>
      </span>
    ) },
    { titulo: "Inicio", render: (r) => formatearFecha(r.fechaInicio) },
    { titulo: "Fin estimado", render: (r) => formatearFecha(r.fechaFinEstimada) },
    { titulo: "Estado", render: (r) => <Etiqueta texto={r.estado} /> },
    { titulo: "Rehabilitado", render: (r) => (r.rehabilitado ? <Etiqueta texto="Sí" /> : <span className="text-white/40">—</span>) },
  ];

  return (
    <PaginaSubmodulo>
      <CabeceraSubmodulo
        titulo="Reubicaciones Laborales"
        descripcion="Reubicaciones temporales y definitivas por condición de salud, con seguimiento de restricciones, cierre y rehabilitación del trabajador."
        etiquetas={["Estándar 3.1.6", "Resolución 1918/2009"]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-3">
          <SelectorPeriodo anio={anio} mes={mes} setAnio={setAnio} setMes={setMes} />
          <div className="w-44">
            <Opciones
              valor={filtroTipo}
              onChange={setFiltroTipo}
              opciones={TIPOS_REUBICACION}
              placeholder="Todos los tipos"
            />
          </div>
          <div className="w-44">
            <Opciones
              valor={filtroEstado}
              onChange={setFiltroEstado}
              opciones={ESTADOS_REUBICACION}
              placeholder="Todos los estados"
            />
          </div>
        </div>
        <BotonNuevo texto="Nueva reubicación" onClick={() => setForm(formularioVacio())} />
      </div>

      <EstadoLista
        cargando={cargando}
        error={error}
        vacio={items.length === 0}
        mensajeVacio="No hay reubicaciones registradas en el periodo seleccionado."
      />

      {!cargando && !error && items.length > 0 && (
        <TablaRegistros
          columnas={columnas}
          filas={items}
          onEditar={(r) => setForm(desdeReubicacion(r))}
          onEliminar={borrar}
        />
      )}

      {form && (
        <ModalFormulario
          titulo={form.recordId ? "Editar reubicación laboral" : "Nueva reubicación laboral"}
          onCerrar={() => setForm(null)}
          onGuardar={enviar}
          guardando={guardando}
          error={errorForm}
        >
          <Campo label="Trabajador" obligatorio ancho="completo">
            <SelectorTrabajador
              personal={personal}
              valor={form.idEmpleadoCore}
              onChange={elegirTrabajador}
              cargando={cargandoPersonal}
            />
          </Campo>
          <Campo label="Tipo de reubicación" obligatorio>
            <Opciones valor={form.tipo} onChange={(v) => set("tipo", v)} opciones={TIPOS_REUBICACION} />
          </Campo>
          <Campo label="Estado">
            <Opciones valor={form.estado} onChange={(v) => set("estado", v)} opciones={ESTADOS_REUBICACION} />
          </Campo>
          <Campo label="Cargo de origen" obligatorio>
            <Texto valor={form.cargoOrigen} onChange={(v) => set("cargoOrigen", v)} />
          </Campo>
          <Campo label="Cargo de destino" obligatorio>
            <Texto valor={form.cargoDestino} onChange={(v) => set("cargoDestino", v)} />
          </Campo>
          <Campo label="Fecha de inicio" obligatorio>
            <Texto tipo="date" valor={form.fechaInicio} onChange={(v) => set("fechaInicio", v)} />
          </Campo>
          <Campo label="Fecha fin estimada">
            <Texto tipo="date" valor={form.fechaFinEstimada} onChange={(v) => set("fechaFinEstimada", v)} />
          </Campo>
          {form.recordId && (
            <>
              <Campo label="Fecha de cierre">
                <Texto tipo="date" valor={form.fechaCierre} onChange={(v) => set("fechaCierre", v)} />
              </Campo>
              <Casilla
                etiqueta="El trabajador fue rehabilitado"
                valor={form.rehabilitado}
                onChange={(v) => set("rehabilitado", v)}
              />
            </>
          )}
          <Campo label="Motivo" ancho="completo">
            <AreaTexto valor={form.motivo} onChange={(v) => set("motivo", v)} />
          </Campo>
          <Campo label="Restricciones" ancho="completo">
            <AreaTexto valor={form.restricciones} onChange={(v) => set("restricciones", v)} />
          </Campo>
          <Campo label="Observaciones" ancho="completo">
            <AreaTexto valor={form.observaciones} onChange={(v) => set("observaciones", v)} />
          </Campo>
        </ModalFormulario>
      )}
    </PaginaSubmodulo>
  );
}
