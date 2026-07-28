export interface User {
  id: string;
  idEmpleado: string;
  nombreCompleto: string;
  correoElectronico: string;
  numeroDocumento: string;
  telefono: string;
  tipoPersonal: string;
  estadoActividad: string;
  fotoPerfil?: {
    url: string;
    filename: string;
    width: number;
    height: number;
    thumbnails?: {
      small?: { url: string; width: number; height: number };
      large?: { url: string; width: number; height: number };
    };
  };
  /** Nombre del rol resuelto desde "Roles y Permisos" (lookup en Personal) */
  rol: string;
  rolIds: string[];
  /** Nombre del nivel de acceso: "Super Admin" | "Admin" | "Usuario" | ... */
  nivelAcceso: string;
  /** Orden jerárquico del nivel — 1 = Super Admin. Ver NIVELES_ACCESO */
  ordenNivel: number;
  areasIds: string[];
  accesosIds: string[];
}

export interface VerifyResponse {
  success: boolean;
  message: string;
  needsPassword?: boolean;
  nombreCompleto?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Omit<User, "id">;
}
