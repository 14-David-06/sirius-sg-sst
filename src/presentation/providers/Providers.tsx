"use client";

import { ReactNode } from "react";
import { SessionProvider } from "@/presentation/context/SessionContext";

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
