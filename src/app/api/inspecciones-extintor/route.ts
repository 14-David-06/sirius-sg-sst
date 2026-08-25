// ══════════════════════════════════════════════════════════
// GET  /api/inspecciones-extintor  — Listar inspecciones y catálogos
// POST /api/inspecciones-extintor  — Crear inspección de extintores
// ══════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import { handleCrear, handleListar } from "@/lib/inspecciones-emergencia/handlers";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) => handleListar("extintor", req);
export const POST = (req: NextRequest) => handleCrear("extintor", req);
