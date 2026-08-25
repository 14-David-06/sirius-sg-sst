// ══════════════════════════════════════════════════════════
// Configuración por tipo de inspección de emergencia
// Mapea cada tipo a sus tablas y field IDs en la base SG-SST,
// para que el repositorio genérico opere sobre cualquiera.
// ══════════════════════════════════════════════════════════
import { airtableSGSSTConfig } from "@/infrastructure/config/airtableSGSST";
import type { FormaDetalle, TipoInspeccion } from "./types";

export interface ConfigInspeccion {
  tipo: TipoInspeccion;
  /** Prefijo del consecutivo: INSPBOT-20260819-A1B2 */
  prefijo: string;
  /** Etiqueta legible para mensajes de error y el informe mensual. */
  etiqueta: string;
  forma: FormaDetalle;

  cabeceraTableId: string;
  cabeceraFields: Record<string, string>;

  detalleTableId: string;
  detalleFields: Record<string, string>;

  responsablesTableId: string;
  responsablesFields: Record<string, string>;

  /** Catálogo del equipo (botiquines, extintores, camillas, kits). */
  equiposTableId: string;
  equiposFields: Record<string, string>;

  /** Catálogo de elementos. Ausente en extintor (usa criterios). */
  elementosTableId?: string;
  elementosFields?: Record<string, string>;

  /** Campo del detalle que enlaza al equipo del catálogo. */
  detalleEquipoLinkField: string;
  /** Campo del detalle que enlaza al elemento. Solo forma "elementos". */
  detalleElementoLinkField?: string;
  /** Campo de vencimiento en el detalle, si el tipo lo maneja. */
  detalleVencimientoField?: string;

  /** Criterios válidos para forma "criterios": clave del payload → field ID. */
  criterios?: Record<string, string>;

  /** Tabla de verificaciones de procedimiento. Solo kit de derrames. */
  verificacionesTableId?: string;
  verificacionesFields?: Record<string, string>;
}

/**
 * Devuelve la configuración del tipo indicado.
 *
 * Se resuelve en llamada (no en constante de módulo) porque los field IDs
 * vienen de `process.env` y deben leerse cuando el request ya corre.
 */
export function getConfigInspeccion(tipo: TipoInspeccion): ConfigInspeccion {
  const c = airtableSGSSTConfig;

  switch (tipo) {
    case "botiquin":
      return {
        tipo,
        prefijo: "INSPBOT",
        etiqueta: "Botiquín",
        forma: "elementos",
        cabeceraTableId: c.inspBotiquinTableId,
        cabeceraFields: c.inspBotiquinFields,
        detalleTableId: c.detalleBotiquinTableId,
        detalleFields: c.detalleBotiquinFields,
        responsablesTableId: c.respBotiquinTableId,
        responsablesFields: c.respBotiquinFields,
        equiposTableId: c.botiquinesTableId,
        equiposFields: c.botiquinesFields,
        elementosTableId: c.elementosBotiquinTableId,
        elementosFields: c.elementosBotiquinFields,
        detalleEquipoLinkField: c.detalleBotiquinFields.BOTIQUIN_LINK,
        detalleElementoLinkField: c.detalleBotiquinFields.ELEMENTO_LINK,
        detalleVencimientoField: c.detalleBotiquinFields.FECHA_VENCIMIENTO,
      };

    case "extintor":
      return {
        tipo,
        prefijo: "INSPEXT",
        etiqueta: "Extintor",
        forma: "criterios",
        cabeceraTableId: c.inspExtintorTableId,
        cabeceraFields: c.inspExtintorFields,
        detalleTableId: c.detalleExtintorTableId,
        detalleFields: c.detalleExtintorFields,
        responsablesTableId: c.respExtintorTableId,
        responsablesFields: c.respExtintorFields,
        equiposTableId: c.extintoresTableId,
        equiposFields: c.extintoresFields,
        detalleEquipoLinkField: c.detalleExtintorFields.EXTINTOR_LINK,
        criterios: {
          presion: c.detalleExtintorFields.PRESION,
          selloGarantia: c.detalleExtintorFields.SELLO_GARANTIA,
          manometro: c.detalleExtintorFields.MANOMETRO,
          estadoCilindro: c.detalleExtintorFields.ESTADO_CILINDRO,
          manija: c.detalleExtintorFields.MANIJA,
          boquillaManguera: c.detalleExtintorFields.BOQUILLA_MANGUERA,
          anilloSeguridad: c.detalleExtintorFields.ANILLO_SEGURIDAD,
          pinSeguridad: c.detalleExtintorFields.PIN_SEGURIDAD,
          pintura: c.detalleExtintorFields.PINTURA,
          tarjetaInspeccion: c.detalleExtintorFields.TARJETA_INSPECCION,
        },
      };

    case "camilla":
      return {
        tipo,
        prefijo: "INSPCAM",
        etiqueta: "Camilla",
        forma: "elementos",
        cabeceraTableId: c.inspCamillaTableId,
        cabeceraFields: c.inspCamillaFields,
        detalleTableId: c.detalleCamillaTableId,
        detalleFields: c.detalleCamillaFields,
        responsablesTableId: c.respCamillaTableId,
        responsablesFields: c.respCamillaFields,
        equiposTableId: c.camillasTableId,
        equiposFields: c.camillasFields,
        elementosTableId: c.elementosCamillaTableId,
        elementosFields: c.elementosCamillaFields,
        detalleEquipoLinkField: c.detalleCamillaFields.CAMILLA_LINK,
        detalleElementoLinkField: c.detalleCamillaFields.ELEMENTO_LINK,
        // El detalle de camilla no maneja vencimiento.
      };

    case "kit-derrames":
      return {
        tipo,
        prefijo: "INSPKIT",
        etiqueta: "Kit de derrames",
        forma: "elementos",
        cabeceraTableId: c.inspKitDerTableId,
        cabeceraFields: c.inspKitDerFields,
        detalleTableId: c.detalleKitDerTableId,
        detalleFields: c.detalleKitDerFields,
        responsablesTableId: c.respKitDerTableId,
        responsablesFields: c.respKitDerFields,
        equiposTableId: c.kitsDerTableId,
        equiposFields: c.kitsDerFields,
        elementosTableId: c.elementosKitDerTableId,
        elementosFields: c.elementosKitDerFields,
        detalleEquipoLinkField: c.detalleKitDerFields.KIT_LINK,
        detalleElementoLinkField: c.detalleKitDerFields.ELEMENTO_LINK,
        detalleVencimientoField: c.detalleKitDerFields.FECHA_VENCIMIENTO,
        verificacionesTableId: c.verificacionesKitDerTableId,
        verificacionesFields: c.verificacionesKitDerFields,
      };
  }
}

/** Los cuatro tipos, para recorrerlos en el consolidado del informe. */
export const TIPOS_INSPECCION: TipoInspeccion[] = [
  "botiquin",
  "extintor",
  "camilla",
  "kit-derrames",
];
