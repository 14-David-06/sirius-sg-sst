import Link from "next/link";
import { Container } from "@/presentation/components/ui";

export default function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-sirius-azul to-sirius-cielo">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            ¿Listo para comenzar?
          </h2>
          <p className="mt-4 text-lg leading-8 text-white/80">
            Accede al sistema y gestiona la seguridad y salud en el trabajo de
            Sirius de forma eficiente.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-lg font-bold text-sirius-azul shadow-lg shadow-black/10 hover:bg-sirius-sutileza transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
