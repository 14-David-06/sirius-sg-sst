import { NextRequest } from "next/server";
import {
  handleActualizar,
  handleObtener,
} from "@/lib/comites/handlers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleObtener("COCOLAB", id);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleActualizar("COCOLAB", id, req);
}
