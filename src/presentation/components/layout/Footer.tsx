import { Container } from "@/presentation/components/ui";

export default function Footer() {
  return (
    <footer className="relative bg-sirius-imperial">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <Container className="py-6">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-white/50">
            &copy; {new Date().getFullYear()} Sirius Regenerative. Todos los derechos reservados.
          </p>
          <p className="text-xs text-white/30">
            Uso interno exclusivo &mdash; Sistema de Gestión SG-SST
          </p>
        </div>
      </Container>
    </footer>
  );
}
