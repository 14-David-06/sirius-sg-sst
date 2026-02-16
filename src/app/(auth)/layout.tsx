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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {children}
    </div>
  );
}
