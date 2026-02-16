import Link from "next/link";
import { Container } from "@/presentation/components/ui";

export default function HeroSection() {
  return (
    <section id="inicio" className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Background — Sirius: sutiles gradientes de la paleta */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-sirius-verde-fondo via-white to-sirius-sutileza" />
        <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-sirius-cotiledon/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-sirius-retono/40 blur-3xl" />
      </div>

      <Container>
        <div className="mx-auto max-w-3xl text-center">

          <h1 className="text-4xl font-bold tracking-tight text-sirius-imperial sm:text-6xl leading-[1.1]">
            Sistema de Gestión de{" "}
            <span className="text-sirius-azul">Seguridad y Salud</span>{" "}
            en el Trabajo
          </h1>
          <p className="mt-6 text-lg leading-8 text-sirius-imperial/60">
            Gestiona evaluaciones de riesgo, capacitaciones, incidentes y
            cumplimiento normativo de tu equipo desde un solo lugar.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-sirius-azul px-8 py-3.5 text-lg font-bold text-white shadow-lg shadow-sirius-azul/25 hover:bg-sirius-azul/90 focus:outline-none focus:ring-2 focus:ring-sirius-cielo focus:ring-offset-2 transition-all"
            >
              Ingresar al sistema
            </Link>
            <a
              href="#modulos"
              className="inline-flex items-center justify-center rounded-lg border-2 border-sirius-azul px-8 py-3.5 text-lg font-bold text-sirius-azul hover:bg-sirius-sutileza transition-colors"
            >
              Ver módulos
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
