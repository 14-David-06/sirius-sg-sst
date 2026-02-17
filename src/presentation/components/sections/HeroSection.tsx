import Link from "next/link";
import { Container } from "@/presentation/components/ui";

export default function HeroSection() {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video de fondo */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src="/ESTRELLAS%20PRUEBA%202.mp4" type="video/mp4" />
      </video>

      {/* Gradiente para legibilidad */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/30"
        style={{ zIndex: 1 }}
      />

      {/* Contenido */}
      <div className="relative" style={{ zIndex: 2 }}>
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl leading-[1.05]" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>
              Sistema de Gestión de{" "}
              <span className="text-sirius-cielo" style={{ textShadow: '0 4px 40px rgba(0,163,255,0.5)' }}>
                Seguridad y Salud
              </span>{" "}
              en el Trabajo
            </h1>

            <p className="mt-8 text-xl leading-relaxed text-white/90 max-w-2xl mx-auto" style={{ textShadow: '0 2px 15px rgba(0,0,0,0.5)' }}>
              Gestiona evaluaciones de riesgo, capacitaciones, incidentes y
              cumplimiento normativo de tu equipo desde un solo lugar.
            </p>

            <div className="mt-12 flex items-center justify-center">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center rounded-full bg-sirius-azul px-10 py-4 text-lg font-bold text-white shadow-2xl shadow-sirius-azul/40 hover:shadow-sirius-azul/60 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Ingresar al sistema
                <svg className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}
