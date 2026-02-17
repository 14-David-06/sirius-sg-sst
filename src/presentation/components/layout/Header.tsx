"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/presentation/components/ui";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-sirius-imperial/80 backdrop-blur-xl shadow-lg shadow-black/10"
          : "bg-transparent"
      }`}
    >
      <Container>
        <nav className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Sirius SG-SST"
              width={240}
              height={64}
              className="h-24 w-auto"
              priority
            />
          </Link>

          <div className="flex items-center gap-x-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-7 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-all duration-200"
            >
              Iniciar sesión
            </Link>
          </div>
        </nav>
      </Container>
    </header>
  );
}
