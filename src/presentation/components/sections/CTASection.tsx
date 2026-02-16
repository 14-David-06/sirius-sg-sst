import Link from "next/link";
import { Container } from "@/presentation/components/ui";

export default function CTASection() {
  return (
    <section className="py-20 bg-blue-600">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            ¿Listo para comenzar?
          </h2>
          <p className="mt-4 text-lg leading-8 text-blue-100">
            Accede al sistema y gestiona la seguridad y salud en el trabajo de
            Sirius de forma eficiente.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-lg font-semibold text-blue-600 shadow-sm hover:bg-blue-50 transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
