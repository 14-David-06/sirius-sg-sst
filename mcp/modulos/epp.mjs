/**
 * Elementos de protección personal y dotación: inventario, entregas y su
 * registro.
 *
 * La entrega se registra igual que desde el dashboard: queda Pendiente hasta
 * que el trabajador firma, y descuenta el stock con un movimiento de salida.
 */

import { z } from "zod";

import { CONDICIONES_EPP, ESTADOS_ENTREGA, TALLAS_EPP } from "../catalogos.mjs";
import {
  ESCRITURA,
  FECHA,
  LIMITE,
  SOLO_LECTURA,
  consulta,
  contiene,
  hoy,
  limpiar,
  normalizar,
  recortar,
  resolverTrabajador,
  respuesta,
} from "../comun.mjs";

/** El responsable de las entregas: el select solo tiene esta opción. */
const RESPONSABLE_ENTREGA = "Coordinador SST";

function resumirInsumo(insumo) {
  return limpiar({
    codigo: insumo.codigo,
    nombre: insumo.nombre,
    referencia: insumo.referenciaComercial,
    unidad: insumo.unidadMedida,
    stockActual: insumo.stockActual,
    stockMinimo: insumo.stockMinimo,
    bajoMinimo: insumo.stockActual <= insumo.stockMinimo,
  });
}

/** Lo que interesa de una entrega. Los tokens y hashes de firma, nunca. */
function resumirEntrega(entrega, trabajador) {
  return limpiar({
    idEntrega: entrega.idEntrega,
    fechaEntrega: entrega.fechaEntrega,
    trabajador: trabajador ?? entrega.nombreEmpleado,
    idEmpleado: entrega.idEmpleadoCore,
    estado: entrega.estado,
    motivo: entrega.motivo,
    fechaConfirmacion: entrega.fechaConfirmacion,
    observaciones: entrega.observaciones,
    elementos: (entrega.detalles ?? []).map((d) =>
      limpiar({
        codigo: d.codigoInsumo,
        nombre: d.nombreInsumo,
        cantidad: d.cantidad,
        talla: d.talla,
        condicion: d.condicion,
      }),
    ),
  });
}

/** Un día antes: `fechaDesde` del historial es exclusivo y aquí se pide inclusivo. */
function diaAnterior(fecha) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Un insumo del inventario por código, record id o nombre. Ante varios
 * candidatos no elige: entregar otro EPP del que se pidió es peor que preguntar.
 */
function resolverInsumo(inventario, referencia) {
  const buscado = normalizar(referencia);
  const exacto = inventario.find(
    (i) => i.id === referencia || normalizar(i.codigo) === buscado || normalizar(i.nombre) === buscado,
  );
  if (exacto) return exacto;

  const palabras = buscado.split(" ").filter(Boolean);
  const parciales = inventario.filter((i) =>
    palabras.every((p) => normalizar(`${i.nombre} ${i.referenciaComercial ?? ""}`).includes(p)),
  );
  if (parciales.length === 1) return parciales[0];

  if (parciales.length === 0) {
    throw new Error(
      `No hay ningún EPP activo que coincida con «${referencia}». Usa sgsst_inventario_epp.`,
    );
  }
  const lista = parciales
    .slice(0, 10)
    .map((i) => `${i.codigo} — ${i.nombre} (stock ${i.stockActual})`)
    .join("; ");
  throw new Error(`«${referencia}» coincide con ${parciales.length} EPP: ${lista}. Precisa cuál.`);
}

export function lectura(servidor, api) {
  servidor.registerTool(
    "sgsst_inventario_epp",
    {
      title: "Inventario de EPP y dotación",
      description:
        "Elementos de protección personal y dotación activos con su stock actual (calculado de " +
        "los movimientos) y su stock mínimo. Con soloBajoMinimo trae lo que hay que reponer.",
      inputSchema: {
        texto: z.string().optional().describe("Parte del nombre, código o referencia."),
        soloBajoMinimo: z.boolean().optional(),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ texto, soloBajoMinimo = false, limite = 100 }) => {
      const { data = [] } = await api.obtener("/api/insumos/epp");
      const filtrados = data
        .filter(
          (i) =>
            !texto ||
            contiene(i.nombre, texto) ||
            contiene(i.codigo, texto) ||
            contiene(i.referenciaComercial, texto),
        )
        .filter((i) => !soloBajoMinimo || i.stockActual <= i.stockMinimo)
        .map(resumirInsumo);
      return respuesta(recortar(filtrados, limite));
    },
  );

  servidor.registerTool(
    "sgsst_listar_entregas_epp",
    {
      title: "Listar entregas de EPP",
      description:
        "Entregas de EPP y dotación con sus elementos y su estado de firma (Pendiente, " +
        "Confirmada, Anulada). Con trabajador trae su historial y un resumen; sin trabajador " +
        "recorre todo el histórico, que es más lento.",
      inputSchema: {
        trabajador: z.string().optional().describe("Nombre, documento o ID de empleado."),
        desde: FECHA.optional(),
        hasta: FECHA.optional(),
        estado: z.enum(ESTADOS_ENTREGA).optional(),
        limite: LIMITE,
      },
      annotations: SOLO_LECTURA,
    },
    async ({ trabajador, desde, hasta, estado, limite = 50 }) => {
      if (trabajador) {
        const persona = await resolverTrabajador(api, trabajador);
        const { data } = await api.obtener(
          `/api/entregas-epp/historial${consulta({
            idEmpleado: persona.idEmpleado,
            estado,
            fechaDesde: desde ? diaAnterior(desde) : undefined,
            fechaHasta: hasta,
          })}`,
        );
        return respuesta({
          trabajador: persona.nombreCompleto,
          resumen: data.resumen,
          ...recortar(
            (data.entregas ?? []).map((e) =>
              resumirEntrega({ ...e, idEmpleadoCore: persona.idEmpleado }, persona.nombreCompleto),
            ),
            limite,
          ),
        });
      }

      const { data = [] } = await api.obtener("/api/entregas-epp");
      const filtradas = data
        .filter((e) => (!desde || e.fechaEntrega >= desde) && (!hasta || e.fechaEntrega <= hasta))
        .filter((e) => !estado || e.estado === estado)
        .sort((a, b) => String(b.fechaEntrega).localeCompare(String(a.fechaEntrega)))
        .map((e) => resumirEntrega(e));
      return respuesta(recortar(filtradas, limite));
    },
  );
}

export function escritura(servidor, api) {
  servidor.registerTool(
    "sgsst_registrar_entrega_epp",
    {
      title: "Registrar entrega de EPP",
      description:
        "Registra una entrega de EPP o dotación a un trabajador, igual que el dashboard: crea la " +
        "entrega en estado Pendiente (falta la firma del trabajador), su historial y un " +
        "movimiento de salida por elemento que descuenta el stock. No deja entregar más de lo " +
        "que hay en stock. Confirma antes con la persona el trabajador, los elementos y las " +
        "cantidades: el acta de entrega es un soporte legal.",
      inputSchema: {
        trabajador: z.string().describe("Nombre, documento o ID de empleado de quien recibe."),
        elementos: z
          .array(
            z.object({
              insumo: z.string().describe("Código (SIRIUS-INS-XXXX), nombre o record id del EPP."),
              cantidad: z.number().int().min(1),
              talla: z.enum(TALLAS_EPP).optional().describe("Por defecto Única."),
              condicion: z.enum(CONDICIONES_EPP).optional().describe("Por defecto Nuevo."),
            }),
          )
          .min(1),
        motivo: z
          .string()
          .min(3)
          .describe(
            "Dotación Inicial, Reposición por Desgaste, Reposición por Pérdida, Reposición por " +
              "Vencimiento, Cambio de Cargo/Área, u otro motivo en texto libre.",
          ),
        fechaEntrega: FECHA.optional().describe("Por defecto hoy."),
        observaciones: z.string().optional(),
      },
      annotations: ESCRITURA,
    },
    async ({ trabajador, elementos, motivo, fechaEntrega, observaciones }) => {
      const [persona, { data: inventario = [] }, { data: sesion }] = await Promise.all([
        resolverTrabajador(api, trabajador),
        api.obtener("/api/insumos/epp"),
        api.obtener("/api/auth/sesion"),
      ]);

      // Se resuelve y se suma por insumo antes de comparar con el stock: dos
      // renglones del mismo EPP cuentan juntos, como en el dashboard.
      const lineas = elementos.map((e) => ({ ...e, insumo: resolverInsumo(inventario, e.insumo) }));
      const pedidoPorInsumo = new Map();
      for (const l of lineas) {
        pedidoPorInsumo.set(l.insumo.id, (pedidoPorInsumo.get(l.insumo.id) ?? 0) + l.cantidad);
      }
      const sinStock = lineas
        .filter((l, i, todas) => todas.findIndex((x) => x.insumo.id === l.insumo.id) === i)
        .filter((l) => pedidoPorInsumo.get(l.insumo.id) > (l.insumo.stockActual ?? 0))
        .map((l) => `${l.insumo.nombre}: se piden ${pedidoPorInsumo.get(l.insumo.id)}, hay ${l.insumo.stockActual ?? 0}`);
      if (sinStock.length > 0) {
        throw new Error(`No hay stock suficiente. ${sinStock.join("; ")}.`);
      }

      const resultado = await api.crear("/api/entregas-epp", {
        beneficiarios: [
          {
            idEmpleado: persona.idEmpleado,
            nombreCompleto: persona.nombreCompleto,
            numeroDocumento: persona.numeroDocumento,
            lineas: lineas.map((l) => ({
              insumoId: l.insumo.id,
              codigoInsumo: l.insumo.codigo,
              nombre: l.insumo.nombre,
              cantidad: l.cantidad,
              talla: l.talla ?? "Única",
              condicion: l.condicion ?? "Nuevo",
            })),
          },
        ],
        responsable: RESPONSABLE_ENTREGA,
        responsableId: sesion.idEmpleado,
        observaciones: observaciones ?? "",
        motivo,
        fechaEntrega: fechaEntrega ?? hoy(),
      });

      return respuesta({
        registrada: true,
        trabajador: persona.nombreCompleto,
        estado: "Pendiente",
        fechaEntrega: fechaEntrega ?? hoy(),
        entregaRecordId: resultado.entregas?.[0]?.entregaId,
        elementos: lineas.map((l) =>
          limpiar({ codigo: l.insumo.codigo, nombre: l.insumo.nombre, cantidad: l.cantidad, talla: l.talla, condicion: l.condicion }),
        ),
        siguientePaso:
          "Falta la firma del trabajador. En el dashboard, Inventario EPP → Historial de " +
          "entregas: se elige al trabajador y se genera el enlace de firma (vence a las 48 horas).",
      });
    },
  );
}
