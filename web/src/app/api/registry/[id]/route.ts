import { NextResponse } from "next/server";
import { savePatientPatch } from "@/lib/data-service";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  await savePatientPatch(Number(id), {
    phone: body.phone,
    relativePhone: body.relativePhone,
    lineId: body.lineId,
    notes: body.notes,
    nextVisitAt: body.nextVisitAt,
    authenCode: body.authenCode,
    careStatus: body.careStatus,
    serviceMonthCount: body.serviceMonthCount,
  });

  return NextResponse.json({ ok: true });
}
