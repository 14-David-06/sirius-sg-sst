// ══════════════════════════════════════════════════════════
// GET  /api/inspecciones-camilla  — Listar inspecciones y catálogos
// POST /api/inspecciones-camilla  — Crear inspección de camillas
// ══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import { handleCrear, handleListar } from "@/lib/inspecciones-emergencia/handlers";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) => handleListar("camilla", req);
export const POST = (req: NextRequest) => handleCrear("camilla", req);
