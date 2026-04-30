import { NextRequest } from "next/server";
import { handleDescargarPdf } from "@/lib/comites/handlers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleDescargarPdf("COCOLAB", id);
}
