import { NextRequest } from "next/server";
import {
  handleCrear,
  handleListar,
} from "@/lib/comites/handlers";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) => handleListar("COPASST", req);
export const POST = (req: NextRequest) => handleCrear("COPASST", req);
