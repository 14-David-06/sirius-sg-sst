import type { Metadata } from "next";
import Image from "next/image";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Imagen de fondo */}
      <Image
        src="/20032025-DSC_3717.jpg"
        alt=""
        fill
        className="object-cover"
        priority
        quality={85}
        style={{ zIndex: 0 }}
      />

      {/* Gradiente para legibilidad */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/30"
        style={{ zIndex: 1 }}
      />

      {/* Contenido */}
      <div className="relative w-full flex items-center justify-center" style={{ zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}
