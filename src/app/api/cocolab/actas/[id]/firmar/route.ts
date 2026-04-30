import { NextRequest } from "next/server";
import { handleFirmar } from "@/lib/comites/handlers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleFirmar("COCOLAB", id, req);
}
