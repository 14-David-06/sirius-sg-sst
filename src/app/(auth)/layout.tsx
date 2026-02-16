import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión | Sirius SG-SST",
  description: "Accede al sistema de gestión de seguridad y salud en el trabajo",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sirius-verde-fondo via-white to-sirius-sutileza">
      {children}
    </div>
  );
}
