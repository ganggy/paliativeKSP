import { NextResponse } from "next/server";
import { saveDischarge } from "@/lib/data-service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  await saveDischarge(Number(id), body.reason);
  return NextResponse.json({ ok: true });
}
