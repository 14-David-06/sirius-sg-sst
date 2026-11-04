/**
 * Tipos compartidos para el MCP SGSST
 */

// ============================================================================
// Tipos de Respuesta API
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Autenticación y Sesión
// ============================================================================

export interface AuthCredentials {
  email: string;
  password?: string;
  numeroDocumento?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    cargo: string;
    nivel: number;
  };
}

export interface SessionInfo {
  isAuthenticated: boolean;
  user?: AuthResponse["user"];
  token?: string;
}

// ============================================================================
// Personal y Nómina
// ============================================================================

export interface Empleado {
  id: string;
  numeroDocumento: string;
  nombre: string;
  cargo: string;
  email?: string;
  telefono?: string;
  area?: string;
  nivel?: number;
  estado?: string;
}

export interface ValidacionNominaCore {
  esValido: boolean;
  empleado?: Empleado;
  mensaje?: string;
}

// ============================================================================
// Capacitaciones
// ============================================================================

export interface Capacitacion {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  duracion?: number;
  estado?: string;
}

export interface EventoCapacitacion {
  id: string;
  capacitacionId: string;
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  facilitador?: string;
  lugar?: string;
  asistentes?: number;
  estado?: string;
}

export interface RegistroAsistencia {
  id: string;
  eventoId: string;
  empleadoId: string;
  presente: boolean;
  fechaFirma?: string;
  evaluacionId?: string;
}

// ============================================================================
// Evaluaciones
// ============================================================================

export interface Evaluacion {
  id: string;
  plantillaId: string;
  eventoId?: string;
  empleadoId?: string;
  fechaAplicacion: string;
  calificacion?: number;
  aprobada?: boolean;
  estado: string;
}

export interface PlantillaEvaluacion {
  id: string;
  nombre: string;
  descripcion?: string;
  notaMinima: number;
  preguntas?: number;
}

export interface RespuestaEvaluacion {
  preguntaId: string;
  respuestaSeleccionada: string;
  esCorrecta?: boolean;
}

// ============================================================================
// Inventario EPP
// ============================================================================

export interface InsumoEPP {
  id: string;
  nombre: string;
  categoria: string;
  codigo?: string;
  unidadMedida?: string;
  stockMinimo?: number;
  stockActual?: number;
}

export interface MovimientoInventario {
  id: string;
  insumoId: string;
  tipo: "INGRESO" | "SALIDA" | "AJUSTE";
  cantidad: number;
  motivo?: string;
  fecha: string;
  responsable?: string;
}

export interface EntregaEPP {
  id: string;
  empleadoId: string;
  fecha: string;
  tipo: "EPP" | "DOTACION";
  insumos: Array<{
    insumoId: string;
    cantidad: number;
  }>;
  firmada: boolean;
  estado: string;
}

// ============================================================================
// Inspecciones
// ============================================================================

export interface InspeccionBase {
  id: string;
  fecha: string;
  responsable?: string;
  observaciones?: string;
  estado: "BORRADOR" | "COMPLETADA" | "FIRMADA";
}

export interface InspeccionEPP extends InspeccionBase {
  empleadoId: string;
  criterios: Array<{
    nombre: string;
    cumple: boolean;
    observacion?: string;
  }>;
}

export interface InspeccionArea extends InspeccionBase {
  area: string;
  categoria: string;
  criterios: Array<{
    criterio: string;
    cumple: boolean;
    accionCorrectiva?: string;
  }>;
}

export interface InspeccionEquipoEmergencia extends InspeccionBase {
  equipoId: string;
  tipo: "BOTIQUIN" | "EXTINTOR" | "CAMILLA" | "KIT_DERRAMES";
  elementos?: Array<{
    elementoId: string;
    estado: string;
    cantidad?: number;
  }>;
  verificaciones?: Array<{
    criterio: string;
    cumple: boolean;
  }>;
}

// ============================================================================
// Medicina Laboral
// ============================================================================

export interface ExamenOcupacional {
  id: string;
  empleadoId: string;
  tipo: "INGRESO" | "PERIODICO" | "EGRESO" | "REINTEGRO";
  fecha: string;
  resultado?: string;
  recomendaciones?: string;
  restricciones?: string;
}

export interface SeguimientoMedico {
  id: string;
  empleadoId: string;
  fecha: string;
  motivo: string;
  hallazgos?: string;
  recomendaciones?: string;
  proximaSeguimiento?: string;
}

export interface Incapacidad {
  id: string;
  empleadoId: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  tipo: "ENFERMEDAD_COMUN" | "ACCIDENTE_TRABAJO" | "ENFERMEDAD_LABORAL";
  diagnostico?: string;
  entidad?: string;
}

export interface ReubicacionLaboral {
  id: string;
  empleadoId: string;
  tipo: "TEMPORAL" | "DEFINITIVA";
  fechaInicio: string;
  fechaFin?: string;
  cargoActual?: string;
  cargoNuevo?: string;
  motivo: string;
}

// ============================================================================
// Accidentes e Incidentes
// ============================================================================

export interface EventoAccidente {
  id: string;
  consecutivo?: string;
  tipo: "ACCIDENTE" | "INCIDENTE";
  empleadoId: string;
  fecha: string;
  lugar?: string;
  descripcion: string;
  gravedad?: "LEVE" | "GRAVE" | "MORTAL";
  tieneInvestigacion: boolean;
}

export interface InvestigacionAccidente {
  id: string;
  eventoId: string;
  consecutivo?: string;
  causasInmediatas?: string;
  causasBasicas?: string;
  factoresPersonales?: string;
  factoresTrabajo?: string;
  conclusiones?: string;
}

export interface AccionCorrectiva {
  id: string;
  tipo: "PREVENTIVA" | "CORRECTIVA";
  descripcion: string;
  responsable?: string;
  fechaCompromiso?: string;
  estado: string;
  jerarquiaControl?: string;
}

// ============================================================================
// Comités
// ============================================================================

export interface MiembroComite {
  id: string;
  comite: "COPASST" | "COCOLAB";
  empleadoId: string;
  cargo: "PRESIDENTE" | "SECRETARIO" | "MIEMBRO";
  fechaInicio: string;
  fechaFin?: string;
  vigente: boolean;
}

export interface ActaComite {
  id: string;
  comite: "COPASST" | "COCOLAB";
  numero: string;
  fecha: string;
  tema?: string;
  asistentes?: string[];
  compromisos?: Array<{
    descripcion: string;
    responsable: string;
    fechaCompromiso: string;
  }>;
  firmada: boolean;
}

// ============================================================================
// Políticas
// ============================================================================

export interface Politica {
  id: string;
  nombre: string;
  descripcion?: string;
  contenido?: string;
  version?: string;
  fechaPublicacion?: string;
  vigente: boolean;
}

export interface FirmaPolitica {
  id: string;
  politicaId: string;
  empleadoId: string;
  fechaFirma: string;
  aceptada: boolean;
}

// ============================================================================
// Informes
// ============================================================================

export interface IndicadorSST {
  nombre: string;
  valor: number | string;
  unidad?: string;
  periodo?: string;
}

export interface InformeMensual {
  mes: number;
  anio: number;
  indicadores: IndicadorSST[];
  inspecciones: {
    epp: number;
    areas: number;
    equipos: number;
    emergencia: number;
  };
  actividades: {
    capacitaciones: number;
    inducciones: number;
    reunionesComite: number;
  };
  medicina: {
    examenes: number;
    seguimientos: number;
    incapacidades: number;
  };
  accidentalidad: {
    accidentes: number;
    incidentes: number;
    diasPerdidos: number;
  };
}

// ============================================================================
// Inducciones
// ============================================================================

export interface Induccion {
  id: string;
  empleadoId: string;
  tipo: "GENERAL" | "ESPECIFICA" | "REINDUCCION";
  fecha: string;
  temas?: string[];
  facilitador?: string;
  duracion?: number;
  aprobada: boolean;
}

// ============================================================================
// Configuración del MCP
// ============================================================================

export interface MCPConfig {
  apiUrl: string;
  apiTimeout: number;
  nominaCoreUrl?: string;
  nominaCoreApiKey?: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface ToolContext {
  config: MCPConfig;
  session?: SessionInfo;
}
