// ══════════════════════════════════════════════════════════
// Metadatos de UI por tipo de inspección de emergencia
//
// Espeja `src/lib/inspecciones-emergencia/config.ts`, pero sin tocar
// `airtableSGSST.ts`: esa config lee `process.env` con los tokens de Airtable
// y no puede viajar al cliente. Aquí solo vive lo que la pantalla necesita.
// ══════════════════════════════════════════════════════════

import type { FormaDetalle, TipoInspeccion } from "@/lib/inspecciones-emergencia/types";

export interface MetaTipo {
  tipo: TipoInspeccion;
  /** Segmento de la ruta y del endpoint: /api/inspecciones-<slug> */
  slug: string;
  etiqueta: string;
  /** Nombre del equipo en singular, para los rótulos del formulario. */
  equipoSingular: string;
  equipoPlural: string;
  descripcion: string;
  forma: FormaDetalle;
  /** El detalle admite fecha de vencimiento por elemento. */
  manejaVencimiento: boolean;
  /** El tipo captura verificaciones de procedimiento (solo kit de derrames). */
  manejaVerificaciones: boolean;
  /** Criterios de verificación en orden de captura. Solo forma "criterios". */
  criterios?: { clave: string; etiqueta: string }[];
  /** Clases Tailwind del acento de color de la tarjeta y la cabecera. */
  acento: {
    texto: string;
    borde: string;
    fondo: string;
    fondoHover: string;
  };
}

const META: Record<TipoInspeccion, MetaTipo> = {
  botiquin: {
    tipo: "botiquin",
    slug: "botiquin",
    etiqueta: "Botiquines",
    equipoSingular: "Botiquín",
    equipoPlural: "Botiquines",
    descripcion:
      "Verificación de elementos, cantidades y fechas de vencimiento de cada botiquín.",
    forma: "elementos",
    manejaVencimiento: true,
    manejaVerificaciones: false,
    acento: {
      texto: "text-green-300",
      borde: "border-green-400/30",
      fondo: "bg-green-500/15",
      fondoHover: "hover:bg-green-500/25",
    },
  },

  extintor: {
    tipo: "extintor",
    slug: "extintor",
    etiqueta: "Extintores",
    equipoSingular: "Extintor",
    equipoPlural: "Extintores",
    descripcion:
      "Diez criterios de verificación por extintor: presión, sellos, manómetro y estado físico.",
    forma: "criterios",
    manejaVencimiento: false,
    manejaVerificaciones: false,
    criterios: [
      { clave: "presion", etiqueta: "Presión" },
      { clave: "selloGarantia", etiqueta: "Sello de garantía" },
      { clave: "manometro", etiqueta: "Manómetro" },
      { clave: "estadoCilindro", etiqueta: "Estado del cilindro" },
      { clave: "manija", etiqueta: "Manija" },
      { clave: "boquillaManguera", etiqueta: "Boquilla y manguera" },
      { clave: "anilloSeguridad", etiqueta: "Anillo de seguridad" },
      { clave: "pinSeguridad", etiqueta: "Pin de seguridad" },
      { clave: "pintura", etiqueta: "Pintura" },
      { clave: "tarjetaInspeccion", etiqueta: "Tarjeta de inspección" },
    ],
    acento: {
      texto: "text-red-300",
      borde: "border-red-400/30",
      fondo: "bg-red-500/15",
      fondoHover: "hover:bg-red-500/25",
    },
  },

  camilla: {
    tipo: "camilla",
    slug: "camilla",
    etiqueta: "Camillas",
    equipoSingular: "Camilla",
    equipoPlural: "Camillas",
    descripcion:
      "Estado de la camilla y de sus elementos: inmovilizadores, correas y accesorios.",
    forma: "elementos",
    manejaVencimiento: false,
    manejaVerificaciones: false,
    acento: {
      texto: "text-blue-300",
      borde: "border-blue-400/30",
      fondo: "bg-blue-500/15",
      fondoHover: "hover:bg-blue-500/25",
    },
  },

  "kit-derrames": {
    tipo: "kit-derrames",
    slug: "kit-derrames",
    etiqueta: "Kits de derrames",
    equipoSingular: "Kit de derrames",
    equipoPlural: "Kits de derrames",
    descripcion:
      "Elementos del kit, vencimientos y verificaciones del procedimiento de atención.",
    forma: "elementos",
    manejaVencimiento: true,
    manejaVerificaciones: true,
    acento: {
      texto: "text-amber-300",
      borde: "border-amber-400/30",
      fondo: "bg-amber-500/15",
      fondoHover: "hover:bg-amber-500/25",
    },
  },
};

export const TIPOS_UI: MetaTipo[] = [
  META.botiquin,
  META.extintor,
  META.camilla,
  META["kit-derrames"],
];

/** Resuelve el metadato del slug de la URL. `null` si el slug no existe. */
export function getMetaTipo(slug: string): MetaTipo | null {
  return TIPOS_UI.find((m) => m.slug === slug) ?? null;
}

/** Etiquetas de las verificaciones de procedimiento del kit de derrames. */
export const VERIFICACIONES_KIT = [
  { clave: "conoceProcedimiento", etiqueta: "El personal conoce el procedimiento de atención de derrames" },
  { clave: "almacenamientoAdecuado", etiqueta: "El kit está almacenado en un lugar adecuado y de fácil acceso" },
  { clave: "rotuladoSenalizado", etiqueta: "El kit está rotulado y señalizado correctamente" },
] as const;
