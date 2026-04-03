import { NextResponse } from "next/server";
import { syncHosCandidates } from "@/lib/data-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const visitDate = typeof body.visitDate === "string" ? body.visitDate : undefined;
  const result = await syncHosCandidates(visitDate);
  return NextResponse.json(result);
}
