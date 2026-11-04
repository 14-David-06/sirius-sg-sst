/**
 * Utilidades de formateo
 */

/**
 * Formatea una fecha para Colombia (DD/MM/YYYY)
 */
export function formatearFechaColombia(fecha: string | Date): string {
  const date = typeof fecha === "string" ? new Date(fecha) : fecha;

  if (isNaN(date.getTime())) {
    return "Fecha inválida";
  }

  return date.toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Formatea una fecha y hora para Colombia
 */
export function formatearFechaHoraColombia(fecha: string | Date): string {
  const date = typeof fecha === "string" ? new Date(fecha) : fecha;

  if (isNaN(date.getTime())) {
    return "Fecha inválida";
  }

  return date.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatea un número de documento con separadores de miles
 */
export function formatearNumeroDocumento(doc: string | number): string {
  const numStr = String(doc);
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formatea un número como moneda colombiana
 */
export function formatearMonedaCOP(monto: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

/**
 * Formatea un porcentaje
 */
export function formatearPorcentaje(valor: number, decimales: number = 1): string {
  return `${valor.toFixed(decimales)}%`;
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalizarPalabras(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncarTexto(texto: string, maxLength: number = 100): string {
  if (texto.length <= maxLength) return texto;
  return texto.slice(0, maxLength - 3) + "...";
}

/**
 * Formatea un estado para mostrar
 */
export function formatearEstado(estado: string): string {
  const estados: Record<string, string> = {
    BORRADOR: "📝 Borrador",
    COMPLETADA: "✅ Completada",
    FIRMADA: "✍️ Firmada",
    PENDIENTE: "⏳ Pendiente",
    EN_PROCESO: "🔄 En Proceso",
    APROBADA: "👍 Aprobada",
    RECHAZADA: "❌ Rechazada",
    VIGENTE: "🟢 Vigente",
    VENCIDA: "🔴 Vencida",
    ACTIVO: "🟢 Activo",
    INACTIVO: "⚪ Inactivo",
  };

  return estados[estado] || estado;
}

/**
 * Formatea un tipo de inspección
 */
export function formatearTipoInspeccion(tipo: string): string {
  const tipos: Record<string, string> = {
    EPP: "🦺 EPP",
    AREAS: "🏢 Áreas",
    EQUIPOS: "🧰 Equipos",
    BOTIQUIN: "💊 Botiquín",
    EXTINTOR: "🧯 Extintor",
    CAMILLA: "🛏️ Camilla",
    KIT_DERRAMES: "🚰 Kit Derrames",
  };

  return tipos[tipo] || tipo;
}

/**
 * Formatea una gravedad de accidente
 */
export function formatearGravedad(gravedad: string): string {
  const gravedades: Record<string, string> = {
    LEVE: "🟡 Leve",
    GRAVE: "🟠 Grave",
    MORTAL: "🔴 Mortal",
  };

  return gravedades[gravedad] || gravedad;
}

/**
 * Formatea el nombre de un cargo
 */
export function formatearCargo(cargo: string): string {
  return capitalizarPalabras(cargo.replace(/_/g, " "));
}

/**
 * Genera un resumen de una lista de items
 */
export function generarResumen<T>(
  items: T[],
  maxItems: number = 5
): string {
  if (items.length === 0) return "Sin items";
  if (items.length <= maxItems) return `${items.length} item(s)`;
  return `${maxItems} de ${items.length} items mostrados`;
}

/**
 * Formatea un periodo (mes/año)
 */
export function formatearPeriodo(mes: number, anio: number): string {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return `${meses[mes - 1]} ${anio}`;
}

/**
 * Formatea duración en minutos a formato legible
 */
export function formatearDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}min`;
}

/**
 * Calcula días entre dos fechas
 */
export function calcularDiasEntreFechas(desde: string, hasta: string): number {
  const date1 = new Date(desde);
  const date2 = new Date(hasta);
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
}

/**
 * Genera una descripción amigable de un error
 */
export function formatearError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Error desconocido";
}

/**
 * Formatea un consecutivo con ceros a la izquierda
 */
export function formatearConsecutivo(
  prefijo: string,
  numero: number,
  anio: number
): string {
  const numeroFormateado = String(numero).padStart(3, "0");
  return `${prefijo}-${anio}-${numeroFormateado}`;
}
