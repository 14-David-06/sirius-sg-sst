import { handleCompromisosPendientes } from "@/lib/comites/handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleCompromisosPendientes("COCOLAB");
}
