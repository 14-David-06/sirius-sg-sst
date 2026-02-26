"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ClipboardCheck } from "lucide-react";
import { useSession } from "@/presentation/context/SessionContext";
import EvaluacionFlow from "@/components/evaluaciones/EvaluacionFlow";

export default function EvaluacionesPage() {
  const router = useRouter();
  const { user, isLoaded } = useSession();

  if (!isLoaded) return null;

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">Mis Evaluaciones</h1>
              <p className="text-xs text-slate-400">{user.nombreCompleto}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <EvaluacionFlow
          idEmpleadoCore={user.idEmpleado}
          nombres={user.nombreCompleto}
          cedula={user.numeroDocumento}
          cargo={user.tipoPersonal}
          onFinished={() => router.push("/dashboard")}
        />
      </main>
    </div>
  );
}
