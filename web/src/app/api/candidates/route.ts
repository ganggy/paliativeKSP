import { NextResponse } from "next/server";
import { findHosCandidateByHn, findHosCandidateByHnAnyArea, getHosCandidates } from "@/lib/data-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const visitDate = url.searchParams.get("visitDate") ?? undefined;
  const clinic = url.searchParams.get("clinic") ?? "all";
  const search = url.searchParams.get("search") ?? "";
  const hn = url.searchParams.get("hn") ?? "";
  const area = url.searchParams.get("area") ?? "clinic";

  if (hn.trim()) {
    const direct = area === "all" ? await findHosCandidateByHnAnyArea(hn) : await findHosCandidateByHn(hn, clinic);
    return NextResponse.json(direct ? [direct] : []);
  }

  const rows = await getHosCandidates(visitDate, clinic, search);
  return NextResponse.json(rows);
}
