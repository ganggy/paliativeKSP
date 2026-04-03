import { NextResponse } from "next/server";
import { saveVisit } from "@/lib/data-service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  await saveVisit(Number(id), {
    visitDate: body.visitDate,
    visitor: body.visitor ?? "ทีมเยี่ยมบ้าน",
    authenCode: body.authenCode,
    serviceFee: body.serviceFee,
    homeVisitFee: body.homeVisitFee,
    changeReason: body.changeReason,
    note: body.note,
  });

  return NextResponse.json({ ok: true });
}
