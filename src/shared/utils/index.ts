// Shared utility functions

/**
 * Combines class names, filtering out falsy values
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ══════════════════════════════════════════════════════════
// Utilidades de Fecha - Timezone Colombia (America/Bogota)
// ══════════════════════════════════════════════════════════
const COLOMBIA_TIMEZONE = "America/Bogota";

/**
 * Obtiene la fecha actual en Colombia
 */
export function getNowColombia(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: COLOMBIA_TIMEZONE }));
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) o Date a string legible
 * Siempre usa timezone Colombia para evitar desfases
 */
export function formatFechaColombia(
  fecha: string | Date | null | undefined,
  options: {
    includeTime?: boolean;
    format?: "short" | "long" | "numeric";
  } = {}
): string {
  if (!fecha) return "—";
  
  try {
    // Si es string YYYY-MM-DD, añadir mediodía para evitar desfase UTC
    let date: Date;
    if (typeof fecha === "string") {
      // Si ya tiene T (es datetime), usarlo directo
      if (fecha.includes("T")) {
        date = new Date(fecha);
      } else {
        // Es solo fecha YYYY-MM-DD, añadir mediodía Colombia
        date = new Date(fecha + "T12:00:00");
      }
    } else {
      date = fecha;
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: COLOMBIA_TIMEZONE,
    };

    if (options.format === "numeric") {
      formatOptions.day = "2-digit";
      formatOptions.month = "2-digit";
      formatOptions.year = "numeric";
    } else if (options.format === "long") {
      formatOptions.day = "numeric";
      formatOptions.month = "long";
      formatOptions.year = "numeric";
    } else {
      // short (default)
      formatOptions.day = "2-digit";
      formatOptions.month = "short";
      formatOptions.year = "numeric";
    }

    if (options.includeTime) {
      formatOptions.hour = "2-digit";
      formatOptions.minute = "2-digit";
    }

    return date.toLocaleDateString("es-CO", formatOptions);
  } catch {
    return typeof fecha === "string" ? fecha : "—";
  }
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (timezone Colombia)
 */
export function getTodayColombia(): string {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: COLOMBIA_TIMEZONE });
}

/**
 * Formatea datetime ISO a string con hora
 */
export function formatFechaHoraColombia(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      timeZone: COLOMBIA_TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Formats a date to a locale string
 * @deprecated Use formatFechaColombia instead
 */
export function formatDate(date: Date, locale = "es-CO"): string {
  return date.toLocaleDateString(locale, {
    timeZone: COLOMBIA_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ══════════════════════════════════════════════════════════
// Galería del dispositivo
// ══════════════════════════════════════════════════════════

/** Detecta iOS / iPadOS (incluye iPad con user agent de escritorio) */
export function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && (navigator.maxTouchPoints ?? 0) > 1)
  );
}

/**
 * Guarda una imagen en la galería / archivos del dispositivo.
 *
 * En Android y escritorio se usa la descarga vía <a download>.
 * En iOS Safari ese click sobre un blob: puede navegar fuera de la página
 * (perdiendo el formulario y las fotos ya cargadas), por lo que allí se
 * intenta la hoja de compartir nativa y, si no está disponible o el
 * navegador la rechaza, simplemente no se guarda copia local.
 *
 * Nunca lanza: guardar copia es opcional y no debe romper el flujo.
 */
export function guardarEnGaleria(file: File): void {
  try {
    if (esIOS()) {
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        // El usuario decide si guarda en Fotos; si rechaza, se ignora
        nav.share({ files: [file] } as ShareData).catch(() => {});
      }
      return;
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    a.download = `evidencia_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.warn("No se pudo guardar copia local de la evidencia:", err);
  }
}

// ══════════════════════════════════════════════════════════
// Normalización de fotos de evidencia
// ══════════════════════════════════════════════════════════

/** Extensiones de imagen aceptadas (iOS entrega HEIC/HEIF de la Fototeca) */
const EXTENSIONES_IMAGEN = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

/**
 * Valida que el archivo elegido sea una imagen.
 * En iOS `file.type` llega vacío o como image/heic, por lo que se
 * valida también por extensión antes de rechazar.
 */
export function esArchivoImagen(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return EXTENSIONES_IMAGEN.includes(ext);
}

/**
 * Convierte cualquier foto (incluido HEIC de iPhone) a JPEG reducido.
 * Corrige además la orientación EXIF y baja el peso para no exceder
 * el límite de payload del servidor.
 */
export async function normalizarFotoEvidencia(file: File): Promise<File> {
  const imageCompression = (await import("browser-image-compression")).default;

  const comprimido = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.8,
  });

  const nombreBase =
    file.name.replace(/\.[^.]+$/, "") || `evidencia_${comprimido.size}`;

  return new File([comprimido], `${nombreBase}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

