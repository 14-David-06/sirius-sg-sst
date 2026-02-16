import Link from "next/link";
import Image from "next/image";
import { Container } from "@/presentation/components/ui";

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-md border-b border-sirius-cotiledon/40">
      <Container>
        <nav className="flex items-center justify-between py-4">
          <div className="flex flex-1">
            <Link href="/" className="-m-1.5 p-1.5">
              <Image
                src="/logo.png"
                alt="Sirius SG-SST"
                width={160}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>
          </div>

          <div className="flex items-center gap-x-6">
            <Link
              href="#modulos"
              className="hidden sm:block text-sm font-semibold text-sirius-imperial/70 hover:text-sirius-azul transition-colors"
            >
              Módulos
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-sirius-azul px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sirius-azul/90 focus:outline-none focus:ring-2 focus:ring-sirius-cielo focus:ring-offset-2 transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </nav>
      </Container>
    </header>
  );
}
