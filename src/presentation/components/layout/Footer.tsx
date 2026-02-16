import { Container } from "@/presentation/components/ui";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <Container className="py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Sirius. Todos los derechos reservados.
          </p>
          <p className="text-xs">
            Uso interno exclusivo &mdash; Sistema de Gestión SG-SST
          </p>
        </div>
      </Container>
    </footer>
  );
}
