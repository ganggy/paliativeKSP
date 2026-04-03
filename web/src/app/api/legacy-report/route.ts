import { NextResponse } from "next/server";
import { getActiveTreatmentReport, getHospitalAreaReport, getLegacyPalliativeReport } from "@/lib/data-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") ?? undefined;
    const endDate = url.searchParams.get("endDate") ?? undefined;
    const clinic = url.searchParams.get("clinic") ?? "all";
    const status = url.searchParams.get("status") ?? "99999";
    const category = url.searchParams.get("category") ?? "all";
    const ucOnly = url.searchParams.get("ucOnly") === "1" || url.searchParams.get("ucOnly") === "true";
    const mode = url.searchParams.get("mode") ?? "diagnosis";

    const report =
      mode === "active"
        ? await getActiveTreatmentReport(startDate, endDate, clinic, status, category, ucOnly)
        : mode === "area"
          ? await getHospitalAreaReport(startDate, endDate, clinic, status, category, ucOnly)
          : await getLegacyPalliativeReport(startDate, endDate, clinic, status, category, ucOnly);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown legacy report error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
