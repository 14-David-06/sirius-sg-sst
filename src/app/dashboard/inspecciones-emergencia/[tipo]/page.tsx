"use client";

// ══════════════════════════════════════════════════════════
// Formulario de captura — Inspecciones de equipos de emergencia
//
// Una sola pantalla sirve a los cuatro tipos: el metadato del slug decide si
// el detalle se captura por elementos del catálogo (botiquín, camilla, kit) o
// por criterios de verificación (extintor).
// ══════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useSession } from "@/presentation/context/SessionContext";
import {
  ESTADOS_CRITERIO,
  ESTADOS_ELEMENTO,
  TIPOS_RESPONSABLE,
  type CrearInspeccionPayload,
  type DetallePayload,
  type ElementoCatalogo,
  type EstadoCriterio,
  type EstadoElemento,
  type EstadoInspeccion,
  type ItemCatalogo,
  type ResponsablePayload,
  type TipoResponsable,
} from "@/lib/inspecciones-emergencia/types";
import { VERIFICACIONES_KIT, getMetaTipo } from "../_components/config";
import {
  Aviso,
  BotonPrimario,
  BotonSecundario,
  BotonVolver,
  Cabecera,
  Campo,
  Casilla,
  CLASE_CONTROL,
  AreaTexto,
  EstadoLista,
  Opciones,
  PaginaInspeccion,
  Panel,
  Texto,
  hoyColombia,
} from "../_components/ui";

// ── Estado local del formulario ────────────────────────────

/** Una fila del checklist de elementos. Sin estado ⇒ no se envía. */
interface FilaElemento {
  estado: EstadoElemento | "";
  cantidad: string;
  fechaVencimiento: string;
  observaciones: string;
}

/** Un equipo inspeccionado dentro de la misma inspección. */
interface BloqueEquipo {
  /** Clave estable para el `key` de React; el equipo puede cambiar. */
  uid: string;
  equipoRecordId: string;
  /** Solo forma "elementos": elementoRecordId → fila. */
  filas: Record<string, FilaElemento>;
  /** Solo forma "criterios": clave del criterio → estado. */
  criterios: Record<string, EstadoCriterio | "">;
  observaciones: string;
}

const FILA_VACIA: FilaElemento = {
  estado: "",
  cantidad: "1",
  fechaVencimiento: "",
  observaciones: "",
};

let contadorUid = 0;
function nuevoBloque(): BloqueEquipo {
  contadorUid += 1;
  return {
    uid: `eq-${contadorUid}`,
    equipoRecordId: "",
    filas: {},
    criterios: {},
    observaciones: "",
  };
}

export default function NuevaInspeccionPage() {
  const router = useRouter();
  const params = useParams<{ tipo: string }>();
  const { user } = useSession();

  const meta = useMemo(() => getMetaTipo(params?.tipo ?? ""), [params?.tipo]);

  // ── Catálogos ────────────────────────────────────────────
  const [equipos, setEquipos] = useState<ItemCatalogo[]>([]);
  const [elementos, setElementos] = useState<ElementoCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // ── Cabecera ─────────────────────────────────────────────
  const [fecha, setFecha] = useState(hoyColombia);
  const [inspector, setInspector] = useState("");
  const [cargoInspector, setCargoInspector] = useState("");
  const [observaciones, setObservaciones] = useState("");
  // "Firmada" no se ofrece: no hay flujo de firma para estos cuatro tipos.
  const [estadoInsp, setEstadoInsp] = useState<EstadoInspeccion>("Completada");

  // ── Detalle ──────────────────────────────────────────────
  const [bloques, setBloques] = useState<BloqueEquipo[]>([nuevoBloque()]);
  const [responsables, setResponsables] = useState<ResponsablePayload[]>([]);
  const [verificaciones, setVerificaciones] = useState({
    conoceProcedimiento: false,
    almacenamientoAdecuado: false,
    rotuladoSenalizado: false,
  });

  // ── Envío ────────────────────────────────────────────────
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Prellenar con la sesión: el inspector suele ser quien captura.
  useEffect(() => {
    if (!user) return;
    setInspector((v) => v || user.nombreCompleto);
    setCargoInspector((v) => v || user.tipoPersonal || "");
    setResponsables((rs) =>
      rs.length > 0
        ? rs
        : [{ tipo: "Inspector", nombre: user.nombreCompleto, cargo: user.tipoPersonal || "" }]
    );
  }, [user]);

  const cargarCatalogos = useCallback(async () => {
    if (!meta) return;
    setCargando(true);
    setErrorCarga(null);
    try {
      const base = `/api/inspecciones-${meta.slug}`;
      const peticiones: Promise<Response>[] = [fetch(`${base}?catalogo=equipos`)];
      if (meta.forma === "elementos") {
        peticiones.push(fetch(`${base}?catalogo=elementos`));
      }

      const respuestas = await Promise.all(peticiones);
      for (const res of respuestas) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
      }

      const [jsonEquipos, jsonElementos] = await Promise.all(
        respuestas.map((r) => r.json())
      );

      if (!jsonEquipos?.success) {
        throw new Error(jsonEquipos?.message || "No se pudo cargar el catálogo de equipos");
      }
      setEquipos(jsonEquipos.data as ItemCatalogo[]);

      if (meta.forma === "elementos") {
        if (!jsonElementos?.success) {
          throw new Error(
            jsonElementos?.message || "No se pudo cargar el catálogo de elementos"
          );
        }
        setElementos(jsonElementos.data as ElementoCatalogo[]);
      }
    } catch (e) {
      console.error(`[inspecciones-${meta.slug}] cargar catálogos:`, e);
      setErrorCarga(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }, [meta, router]);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  if (!meta) {
    return (
      <PaginaInspeccion>
        <BotonVolver
          href="/dashboard/inspecciones-emergencia"
          texto="Volver a Equipos de Emergencia"
        />
        <Aviso tono="error">
          El tipo de inspección «{params?.tipo}» no existe.
        </Aviso>
      </PaginaInspeccion>
    );
  }

  // ── Mutadores de bloques ─────────────────────────────────

  function actualizarBloque(uid: string, cambios: Partial<BloqueEquipo>) {
    setBloques((bs) => bs.map((b) => (b.uid === uid ? { ...b, ...cambios } : b)));
  }

  function actualizarFila(uid: string, elementoId: string, cambios: Partial<FilaElemento>) {
    setBloques((bs) =>
      bs.map((b) =>
        b.uid === uid
          ? {
              ...b,
              filas: {
                ...b.filas,
                [elementoId]: { ...FILA_VACIA, ...b.filas[elementoId], ...cambios },
              },
            }
          : b
      )
    );
  }

  /** Equipos ya elegidos en otros bloques, para no inspeccionar dos veces el mismo. */
  function equiposDisponibles(uidActual: string): ItemCatalogo[] {
    const usados = new Set(
      bloques.filter((b) => b.uid !== uidActual && b.equipoRecordId).map((b) => b.equipoRecordId)
    );
    return equipos.filter((e) => !usados.has(e.recordId));
  }

  // ── Construcción del payload ─────────────────────────────

  function construirDetalles(): DetallePayload[] {
    const detalles: DetallePayload[] = [];

    for (const bloque of bloques) {
      if (!bloque.equipoRecordId) continue;

      if (meta!.forma === "criterios") {
        const criterios: Record<string, EstadoCriterio> = {};
        for (const [clave, valor] of Object.entries(bloque.criterios)) {
          if (valor) criterios[clave] = valor;
        }
        if (Object.keys(criterios).length === 0) continue;
        detalles.push({
          equipoRecordId: bloque.equipoRecordId,
          criterios,
          observaciones: bloque.observaciones.trim() || undefined,
        });
        continue;
      }

      for (const [elementoRecordId, fila] of Object.entries(bloque.filas)) {
        if (!fila.estado) continue;
        detalles.push({
          equipoRecordId: bloque.equipoRecordId,
          elementoRecordId,
          estadoElemento: fila.estado,
          cantidad: Number(fila.cantidad) || 0,
          ...(meta!.manejaVencimiento && fila.fechaVencimiento
            ? { fechaVencimiento: fila.fechaVencimiento }
            : {}),
          observaciones: fila.observaciones.trim() || undefined,
        });
      }
    }

    return detalles;
  }

  /**
   * Valida en el cliente lo mismo que valida el handler, para no gastar un
   * viaje al servidor con un formulario a medio llenar.
   */
  function validar(detalles: DetallePayload[]): string | null {
    if (!fecha) return "La fecha de inspección es obligatoria";
    if (!inspector.trim()) return "El nombre del inspector es obligatorio";
    if (detalles.length === 0) {
      return meta!.forma === "criterios"
        ? `Marca al menos un criterio en algún ${meta!.equipoSingular.toLowerCase()}`
        : `Marca el estado de al menos un elemento en algún ${meta!.equipoSingular.toLowerCase()}`;
    }
    const conNombre = responsables.filter((r) => r.nombre.trim());
    if (conNombre.length === 0) return "Debe registrar al menos un responsable";
    return null;
  }

  async function guardar() {
    setError(null);
    setExito(null);

    const detalles = construirDetalles();
    const problema = validar(detalles);
    if (problema) {
      setError(problema);
      return;
    }

    const payload: CrearInspeccionPayload = {
      fechaInspeccion: fecha,
      inspector: inspector.trim(),
      cargoInspector: cargoInspector.trim(),
      observacionesGenerales: observaciones.trim() || undefined,
      estado: estadoInsp,
      detalles,
      responsables: responsables
        .filter((r) => r.nombre.trim())
        .map((r) => ({ tipo: r.tipo, nombre: r.nombre.trim(), cargo: r.cargo.trim() })),
      ...(meta!.manejaVerificaciones ? { verificaciones } : {}),
    };

    setGuardando(true);
    try {
      const res = await fetch(`/api/inspecciones-${meta!.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No se pudo guardar la inspección");
      }
      setExito(`Inspección ${json.data.idInspeccion} registrada correctamente.`);
      // Se limpia el detalle pero se conservan fecha, inspector y responsables:
      // lo normal es registrar varias inspecciones seguidas en la misma ronda.
      setBloques([nuevoBloque()]);
      setObservaciones("");
    } catch (e) {
      console.error(`[inspecciones-${meta!.slug}] guardar:`, e);
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setGuardando(false);
    }
  }

  // ── Render ───────────────────────────────────────────────

  /**
   * Sin equipos no hay qué inspeccionar; en la forma "elementos", sin catálogo
   * de elementos la tabla saldría vacía y el formulario no podría enviarse.
   */
  const catalogoIncompleto =
    equipos.length === 0 || (meta.forma === "elementos" && elementos.length === 0);

  return (
    <PaginaInspeccion>
      <BotonVolver
        href="/dashboard/inspecciones-emergencia"
        texto="Volver a Equipos de Emergencia"
      />

      <Cabecera
        titulo={`Inspección de ${meta.etiqueta}`}
        descripcion={meta.descripcion}
        acciones={
          <BotonSecundario
            onClick={() =>
              router.push(`/dashboard/inspecciones-emergencia/${meta.slug}/historial`)
            }
          >
            Ver historial
          </BotonSecundario>
        }
      />

      <EstadoLista
        cargando={cargando}
        error={errorCarga}
        vacio={!cargando && !errorCarga && catalogoIncompleto}
        mensajeVacio={
          equipos.length === 0
            ? `No hay ${meta.equipoPlural.toLowerCase()} activos en el catálogo. Regístralos en Airtable antes de inspeccionar.`
            : "El catálogo de elementos está vacío. Sin elementos no hay nada que verificar."
        }
      />

      {!cargando && !errorCarga && !catalogoIncompleto && (
        <>
          <Panel titulo="Datos de la inspección">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Fecha de inspección" obligatorio>
                <Texto tipo="date" valor={fecha} onChange={setFecha} />
              </Campo>
              <Campo label="Inspector" obligatorio>
                <Texto valor={inspector} onChange={setInspector} placeholder="Nombre completo" />
              </Campo>
              <Campo label="Cargo del inspector">
                <Texto
                  valor={cargoInspector}
                  onChange={setCargoInspector}
                  placeholder="Cargo o rol"
                />
              </Campo>
              <Campo label="Estado">
                <select
                  value={estadoInsp}
                  onChange={(e) => setEstadoInsp(e.target.value as EstadoInspeccion)}
                  className={`${CLASE_CONTROL} w-full`}
                >
                  <option value="Completada" className="bg-slate-800">
                    Completada
                  </option>
                  <option value="Borrador" className="bg-slate-800">
                    Borrador
                  </option>
                </select>
              </Campo>
              <Campo label="Observaciones generales" ancho="completo">
                <AreaTexto
                  valor={observaciones}
                  onChange={setObservaciones}
                  placeholder="Hallazgos generales de la ronda de inspección"
                />
              </Campo>
            </div>
          </Panel>

          {bloques.map((bloque, indice) => (
            <Panel
              key={bloque.uid}
              titulo={`${meta.equipoSingular} ${indice + 1}`}
              descripcion={
                meta.forma === "criterios"
                  ? "Marca cada criterio de verificación."
                  : "Marca el estado de los elementos que verificaste. Los que dejes sin estado no se registran."
              }
            >
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-5">
                <div className="flex-1">
                  <Campo label={`${meta.equipoSingular} inspeccionado`} obligatorio>
                    <select
                      value={bloque.equipoRecordId}
                      onChange={(e) =>
                        actualizarBloque(bloque.uid, { equipoRecordId: e.target.value })
                      }
                      className={`${CLASE_CONTROL} w-full`}
                    >
                      <option value="" className="bg-slate-800">
                        Seleccionar…
                      </option>
                      {equiposDisponibles(bloque.uid).map((eq) => (
                        <option key={eq.recordId} value={eq.recordId} className="bg-slate-800">
                          {eq.codigo} — {eq.nombre}
                          {eq.ubicacion ? ` (${eq.ubicacion})` : ""}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>
                {bloques.length > 1 && (
                  <BotonSecundario
                    onClick={() =>
                      setBloques((bs) => bs.filter((b) => b.uid !== bloque.uid))
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                    Quitar
                  </BotonSecundario>
                )}
              </div>

              {meta.forma === "criterios" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {meta.criterios!.map((c) => (
                    <Campo key={c.clave} label={c.etiqueta}>
                      <Opciones<EstadoCriterio>
                        valor={bloque.criterios[c.clave] ?? ""}
                        onChange={(v) =>
                          actualizarBloque(bloque.uid, {
                            criterios: { ...bloque.criterios, [c.clave]: v },
                          })
                        }
                        opciones={ESTADOS_CRITERIO}
                        placeholder="Sin evaluar"
                      />
                    </Campo>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-3 py-2.5 text-left text-white/60 font-medium">
                          Elemento
                        </th>
                        <th className="px-3 py-2.5 text-left text-white/60 font-medium w-40">
                          Estado
                        </th>
                        <th className="px-3 py-2.5 text-left text-white/60 font-medium w-28">
                          Cantidad
                        </th>
                        {meta.manejaVencimiento && (
                          <th className="px-3 py-2.5 text-left text-white/60 font-medium w-44">
                            Vencimiento
                          </th>
                        )}
                        <th className="px-3 py-2.5 text-left text-white/60 font-medium">
                          Observaciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {elementos.map((el) => {
                        const fila = bloque.filas[el.recordId] ?? FILA_VACIA;
                        return (
                          <tr key={el.recordId} className="border-b border-white/5 last:border-0">
                            <td className="px-3 py-2 text-white/80">
                              {el.nombre}
                              {el.unidad && (
                                <span className="text-white/40 text-xs"> · {el.unidad}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <Opciones<EstadoElemento>
                                valor={fila.estado}
                                onChange={(v) =>
                                  actualizarFila(bloque.uid, el.recordId, { estado: v })
                                }
                                opciones={ESTADOS_ELEMENTO}
                                placeholder="Sin verificar"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Texto
                                tipo="number"
                                min={0}
                                valor={fila.cantidad}
                                onChange={(v) =>
                                  actualizarFila(bloque.uid, el.recordId, { cantidad: v })
                                }
                              />
                            </td>
                            {meta.manejaVencimiento && (
                              <td className="px-3 py-2">
                                {el.requiereVencimiento ? (
                                  <Texto
                                    tipo="date"
                                    valor={fila.fechaVencimiento}
                                    onChange={(v) =>
                                      actualizarFila(bloque.uid, el.recordId, {
                                        fechaVencimiento: v,
                                      })
                                    }
                                  />
                                ) : (
                                  <span className="text-white/30 text-xs">No aplica</span>
                                )}
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <Texto
                                valor={fila.observaciones}
                                onChange={(v) =>
                                  actualizarFila(bloque.uid, el.recordId, { observaciones: v })
                                }
                                placeholder="Opcional"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {meta.forma === "criterios" && (
                <div className="mt-4">
                  <Campo label="Observaciones del equipo">
                    <AreaTexto
                      valor={bloque.observaciones}
                      onChange={(v) => actualizarBloque(bloque.uid, { observaciones: v })}
                      filas={2}
                      placeholder="Opcional"
                    />
                  </Campo>
                </div>
              )}
            </Panel>
          ))}

          {equipos.length > bloques.length && (
            <div className="mb-6">
              <BotonSecundario onClick={() => setBloques((bs) => [...bs, nuevoBloque()])}>
                <Plus className="w-4 h-4" />
                Agregar otro {meta.equipoSingular.toLowerCase()}
              </BotonSecundario>
            </div>
          )}

          {meta.manejaVerificaciones && (
            <Panel
              titulo="Verificaciones del procedimiento"
              descripcion="Aplican a la ronda completa, no a un kit en particular."
            >
              {VERIFICACIONES_KIT.map((v) => (
                <Casilla
                  key={v.clave}
                  etiqueta={v.etiqueta}
                  valor={verificaciones[v.clave]}
                  onChange={(valor) =>
                    setVerificaciones((prev) => ({ ...prev, [v.clave]: valor }))
                  }
                />
              ))}
            </Panel>
          )}

          <Panel
            titulo="Responsables"
            descripcion="Quiénes avalan la inspección. Se registran pendientes de firma."
          >
            <div className="flex flex-col gap-3">
              {responsables.map((resp, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[10rem_1fr_1fr_auto] gap-3">
                  <select
                    value={resp.tipo}
                    onChange={(e) =>
                      setResponsables((rs) =>
                        rs.map((r, j) =>
                          j === i ? { ...r, tipo: e.target.value as TipoResponsable } : r
                        )
                      )
                    }
                    className={CLASE_CONTROL}
                  >
                    {TIPOS_RESPONSABLE.map((t) => (
                      <option key={t} value={t} className="bg-slate-800">
                        {t}
                      </option>
                    ))}
                  </select>
                  <Texto
                    valor={resp.nombre}
                    onChange={(v) =>
                      setResponsables((rs) =>
                        rs.map((r, j) => (j === i ? { ...r, nombre: v } : r))
                      )
                    }
                    placeholder="Nombre completo"
                  />
                  <Texto
                    valor={resp.cargo}
                    onChange={(v) =>
                      setResponsables((rs) =>
                        rs.map((r, j) => (j === i ? { ...r, cargo: v } : r))
                      )
                    }
                    placeholder="Cargo"
                  />
                  <button
                    onClick={() => setResponsables((rs) => rs.filter((_, j) => j !== i))}
                    disabled={responsables.length === 1}
                    className="p-2 rounded-lg text-white/50 hover:text-red-300 hover:bg-red-500/15
                               transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Quitar responsable"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <BotonSecundario
                onClick={() =>
                  setResponsables((rs) => [
                    ...rs,
                    { tipo: "Responsable SG-SST", nombre: "", cargo: "" },
                  ])
                }
              >
                <Plus className="w-4 h-4" />
                Agregar responsable
              </BotonSecundario>
            </div>
          </Panel>

          <div className="flex flex-col gap-3">
            {error && <Aviso tono="error">{error}</Aviso>}
            {exito && <Aviso tono="exito">{exito}</Aviso>}

            <div className="flex justify-end gap-3">
              <BotonSecundario
                onClick={() => router.push("/dashboard/inspecciones-emergencia")}
                deshabilitado={guardando}
              >
                Cancelar
              </BotonSecundario>
              <BotonPrimario onClick={guardar} cargando={guardando}>
                Guardar inspección
              </BotonPrimario>
            </div>
          </div>
        </>
      )}
    </PaginaInspeccion>
  );
}
