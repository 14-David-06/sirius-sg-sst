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
  rolIds: string[];
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
