import Link from "next/link";
import { Container } from "@/presentation/components/ui";

export default function HeroSection() {
  return (
    <section id="inicio" className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-indigo-100/50 blur-3xl" />
      </div>

      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
            Plataforma interna Sirius
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Sistema de Gestión de{" "}
            <span className="text-blue-600">Seguridad y Salud</span> en el
            Trabajo
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Gestiona evaluaciones de riesgo, capacitaciones, incidentes y
            cumplimiento normativo de tu equipo desde un solo lugar.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3.5 text-lg font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Ingresar al sistema
            </Link>
            <a
              href="#modulos"
              className="inline-flex items-center justify-center rounded-lg border-2 border-blue-600 px-8 py-3.5 text-lg font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Ver módulos
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
