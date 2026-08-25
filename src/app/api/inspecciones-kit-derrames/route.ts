// ══════════════════════════════════════════════════════════
// GET  /api/inspecciones-kit-derrames  — Listar inspecciones y catálogos
// POST /api/inspecciones-kit-derrames  — Crear inspección de kits de derrames
// ══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import { handleCrear, handleListar } from "@/lib/inspecciones-emergencia/handlers";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) => handleListar("kit-derrames", req);
export const POST = (req: NextRequest) => handleCrear("kit-derrames", req);
