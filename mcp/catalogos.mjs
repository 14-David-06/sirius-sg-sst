/**
 * Los catálogos que las herramientas ofrecen como `enum`.
 *
 * Son copia de los de la app: el servidor stdio corre con `node` a secas y no
 * puede importar TypeScript. Tenerlos en el esquema de cada herramienta le dice
 * a Claude qué valores existen antes de llamar, en vez de enterarse por un 400.
 *
 * `npm run check:mcp` compara esta copia con el original y falla si se
 * desalinean. La ruta sigue siendo la que valida: si algo se escapa, responde
 * 400 con el motivo.
 */

/* ---- src/lib/accidentes/types.ts ---- */
export const TIPOS_EVENTO = ["Accidente de trabajo", "Incidente de trabajo"];
export const MECANISMOS = [
  "Caída de personas",
  "Caída de objetos",
  "Pisada, choque o golpe",
  "Atrapamiento",
  "Sobreesfuerzo",
  "Contacto con electricidad",
  "Contacto con temperatura extrema",
  "Contacto con sustancias químicas",
  "Exposición a ruido o vibración",
  "Accidente de tránsito",
  "Agresión o violencia",
  "Otro",
];
export const TIPOS_LESION = [
  "Sin lesión",
  "Golpe o contusión",
  "Herida",
  "Fractura",
  "Quemadura",
  "Lesión ocular",
  "Esguince o torcedura",
  "Amputación",
  "Intoxicación",
  "Trauma superficial",
  "Otro",
];
export const PARTES_CUERPO = [
  "Cabeza",
  "Ojos",
  "Cuello",
  "Tronco",
  "Espalda",
  "Miembros superiores",
  "Manos",
  "Miembros inferiores",
  "Pies",
  "Múltiples partes",
  "Otro",
];
export const ESTADOS_ARL = [
  "Pendiente de reporte",
  "Reportado a ARL",
  "Reconocido por ARL",
  "Objetado por ARL",
  "En junta de calificación",
];
export const ESTADOS_EVENTO = ["Abierto", "En investigación", "Cerrado"];
export const TIPOS_ACCION = ["Preventiva", "Correctiva"];
export const JERARQUIAS_CONTROL = [
  "Eliminación",
  "Sustitución",
  "Control de ingeniería",
  "Control administrativo",
  "Elemento de protección personal",
];
export const TIPOS_RESPONSABLE = ["Empresa", "Trabajador", "Contratista", "ARL"];
export const ESTADOS_ACCION = ["Pendiente", "En proceso", "Cerrada", "Vencida"];
export const TIPOS_REPORTE = ["Casi accidente", "Acto inseguro", "Condición insegura"];
export const NIVELES_RIESGO = ["Bajo", "Medio", "Alto", "Crítico"];
export const ESTADOS_REPORTE = ["Abierto", "En gestión", "Cerrado"];

/* ---- src/lib/medicina-laboral/types.ts ---- */
export const TIPOS_EXAMEN = ["Ingreso", "Periódico", "Egreso", "Reintegro"];
export const ESTADOS_EXAMEN = ["Programado", "Realizado", "Cancelado"];
export const TIPOS_SEGUIMIENTO = [
  "Restricción médica",
  "Control periódico",
  "Valoración especializada",
  "Otro",
];
export const TIPOS_INCAPACIDAD = [
  "Enfermedad general",
  "Enfermedad laboral",
  "Accidente de trabajo",
  "Licencia maternidad",
  "Licencia paternidad",
];
export const TIPOS_REUBICACION = ["Temporal", "Definitiva"];
export const ESTADOS_REUBICACION = ["Activa", "Rehabilitado", "Cerrada"];
export const ESTADOS_ENFERMEDAD_LABORAL = [
  "En proceso de calificación",
  "Reconocida por ARL",
  "Objetada",
  "En junta de calificación",
  "Cerrada",
];

/* ---- Entregas EPP: opciones reales de los selects en Airtable ---- */
export const TALLAS_EPP = ["XS", "S", "M", "L", "XL", "XXL", "Única", "N/A"];
export const CONDICIONES_EPP = ["Nuevo", "Reacondicionado", "Usado - Buen Estado"];
export const ESTADOS_ENTREGA = ["Pendiente", "Confirmada", "Anulada"];
