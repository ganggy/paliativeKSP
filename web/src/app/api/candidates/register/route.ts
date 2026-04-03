import { NextResponse } from "next/server";
import { registerHosCandidate } from "@/lib/data-service";
import type { HosCandidate } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as HosCandidate;
  const result = await registerHosCandidate(body);
  return NextResponse.json(result);
}
