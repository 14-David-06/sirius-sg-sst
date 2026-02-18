"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ── Tipo de usuario en sesión ───────────────────────────
export interface SessionUser {
  idEmpleado: string;
  nombreCompleto: string;
  correoElectronico: string;
  numeroDocumento: string;
  tipoPersonal: string;
  estadoActividad: string;
  fotoPerfil?: {
    url: string;
    filename: string;
  };
}

interface SessionContextType {
  user: SessionUser | null;
  isLoaded: boolean;
  login: (user: SessionUser) => void;
  logout: () => void;
}

const SESSION_KEY = "sirius_sgsst_session";

const SessionContext = createContext<SessionContextType>({
  user: null,
  isLoaded: false,
  login: () => {},
  logout: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restaurar sesión desde localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setIsLoaded(true);
  }, []);

  const login = (userData: SessionUser) => {
    setUser(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <SessionContext.Provider value={{ user, isLoaded, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
