"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/presentation/context/SessionContext";

/**
 * Layout protegido para todas las rutas bajo /dashboard
 * Redirige automáticamente a /login si no hay sesión activa
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoaded } = useSession();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login");
    }
  }, [isLoaded, user, router]);

  // Mostrar loading mientras se verifica la sesión
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mb-4"></div>
          <p className="text-white/60">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario después de cargar, no renderizar nada (se está redirigiendo)
  if (!user) {
    return null;
  }

  // Usuario autenticado - renderizar children
  return <>{children}</>;
}
