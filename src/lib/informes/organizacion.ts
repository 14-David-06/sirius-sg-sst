// ══════════════════════════════════════════════════════════
// Datos de identificación del informe mensual
//
// El formato impreso exige en su encabezado la razón social, el responsable
// del informe, su cargo y el número de licencia SST. Son datos que cambian
// pocas veces al año —cuando cambia el responsable o se renueva la licencia—
// así que viven en variables de entorno y no en una tabla.
//
// Los valores por defecto corresponden a los del informe vigente, para que el
// documento salga correcto aunque el entorno no esté configurado. Quien firma
// necesita saber si lo que lee es el dato real o el de reserva: eso lo indica
// `usandoValoresPorDefecto`.
// ══════════════════════════════════════════════════════════

export interface DatosOrganizacion {
  /** Razón social completa, como debe figurar en el documento. */
  razonSocial: string;
  responsableNombre: string;
  responsableCargo: string;
  /** Tal como se imprime: "2674 de 2024". */
  licenciaSST: string;
  /**
   * `true` cuando alguno de los cuatro campos cayó a su valor por defecto.
   * El PDF lo usa para avisar que el encabezado debe verificarse.
   */
  usandoValoresPorDefecto: boolean;
  /** Qué campos cayeron al valor por defecto, para el aviso. */
  camposPorDefecto: string[];
}

import { RAZON_SOCIAL } from "@/lib/pdf/corporativo";

const POR_DEFECTO = {
  razonSocial: RAZON_SOCIAL,
  responsableNombre: "María Alejandra Polania Perdomo",
  responsableCargo: "Líder de Regeneración Ambiental",
  licenciaSST: "2674 de 2024",
} as const;

const ETIQUETAS: Record<keyof typeof POR_DEFECTO, string> = {
  razonSocial: "razón social",
  responsableNombre: "responsable del informe",
  responsableCargo: "cargo del responsable",
  licenciaSST: "licencia SST",
};

const VARIABLES: Record<keyof typeof POR_DEFECTO, string> = {
  razonSocial: "SST_RAZON_SOCIAL",
  responsableNombre: "SST_RESPONSABLE_NOMBRE",
  responsableCargo: "SST_RESPONSABLE_CARGO",
  licenciaSST: "SST_LICENCIA",
};

/**
 * Resuelve los datos del encabezado leyendo el entorno.
 *
 * Se resuelve en llamada, no en constante de módulo, para que un cambio de
 * variable no exija reconstruir la aplicación.
 */
export function obtenerDatosOrganizacion(): DatosOrganizacion {
  const camposPorDefecto: string[] = [];

  function leer(
    campo: keyof typeof POR_DEFECTO,
    { avisar = true }: { avisar?: boolean } = {}
  ): string {
    const valor = process.env[VARIABLES[campo]]?.trim();
    if (valor) return valor;
    if (avisar) camposPorDefecto.push(ETIQUETAS[campo]);
    return POR_DEFECTO[campo];
  }

  // El orden de las llamadas fija el orden del aviso; se deja igual al del
  // encabezado impreso.
  //
  // La razón social no avisa: su valor por defecto es la constante corporativa
  // del proyecto, no un dato sin configurar. Los otros tres sí, porque
  // identifican a una persona y una licencia que la ARL verifica.
  const razonSocial = leer("razonSocial", { avisar: false });
  const responsableNombre = leer("responsableNombre");
  const responsableCargo = leer("responsableCargo");
  const licenciaSST = leer("licenciaSST");

  return {
    razonSocial,
    responsableNombre,
    responsableCargo,
    licenciaSST,
    usandoValoresPorDefecto: camposPorDefecto.length > 0,
    camposPorDefecto,
  };
}
