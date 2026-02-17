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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Video de fondo */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src="/Background%20Patos.mp4" type="video/mp4" />
      </video>

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
