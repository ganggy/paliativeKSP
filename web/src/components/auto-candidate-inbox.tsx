"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clinicRules } from "@/lib/clinic-rules";
import type { ActiveTreatmentReport, ActiveTreatmentRow, HosCandidate } from "@/lib/types";

function formatThaiDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { headers: { "content-type": "application/json" }, ...init });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" | "warn" | "danger" }) {
  const toneClass =
    tone === "accent"
      ? "border-[rgba(107,226,211,0.34)] bg-[rgba(107,226,211,0.12)] text-[#bff8ef]"
      : tone === "warn"
        ? "border-[rgba(243,189,106,0.34)] bg-[rgba(243,189,106,0.12)] text-[#f8dcae]"
        : tone === "danger"
          ? "border-[rgba(241,142,151,0.34)] bg-[rgba(241,142,151,0.12)] text-[#f8b7be]"
          : "border-[rgba(179,213,228,0.2)] bg-[rgba(179,213,228,0.06)] text-[#d8e8f4]";
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${toneClass}`}>{children}</span>;
}

function StatCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="glass-panel-strong rounded-3xl p-4 sm:p-5">
      <div className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--muted)]">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-[#f5fbff]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{note}</div>
    </div>
  );
}

export function AutoCandidateInbox() {
  const [clinic, setClinic] = useState("all");
  const [category, setCategory] = useState("all");
  const [ucOnly, setUcOnly] = useState(true);
  const [report, setReport] = useState<ActiveTreatmentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        clinic,
        category,
        mode: "area",
        status: "N",
        ucOnly: ucOnly ? "1" : "0",
      });
      const data = (await requestJson(`/api/legacy-report?${query.toString()}`)) as ActiveTreatmentReport;
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic, category, ucOnly]);

  const summary = useMemo(() => {
    const rows = report?.rows ?? [];
    const activeRows = rows as ActiveTreatmentRow[];
    return {
      patients: rows.length,
      chronic: activeRows.filter((row) => row.dxFlag === "Y" && row.z718Flag === "Y").length,
      opioid: activeRows.filter((row) => row.cancerFlag === "Y" && row.drugFlag === "Y").length,
      uc: activeRows.filter((row) => row.inscl === "UCS").length,
      due: activeRows.filter((row) => row.homeVisitCount >= 6).length,
      money: activeRows.reduce((total, row) => total + (row.money ?? 0), 0),
    };
  }, [report]);

  const registerCandidate = async (row: ActiveTreatmentRow) => {
    setRegistering(row.hn);
    try {
      const candidates = (await requestJson(`/api/candidates?hn=${encodeURIComponent(row.hn)}&area=all`)) as HosCandidate[];
      const candidate = candidates[0];
      if (!candidate) {
        throw new Error("ไม่พบรายละเอียด HN สำหรับลงทะเบียน");
      }
      await requestJson("/api/candidates/register", {
        method: "POST",
        body: JSON.stringify(candidate),
      });
      await fetchReport();
    } finally {
      setRegistering(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="glass-panel-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(243,189,106,0.24)] bg-[rgba(243,189,106,0.1)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#f8dcae]">
              Auto inbox
            </div>
            <h1 className="section-title mt-3 text-3xl font-semibold text-[#f5fbff] sm:text-4xl">ดึงคนไข้ที่ยังมีชีวิตอยู่</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              หน้านี้ดึงคนไข้ที่ยังมีชีวิตอยู่จาก HOSXP ขึ้นมาให้ทันที พร้อมแสดงจำนวนครั้งเยี่ยม เหตุผลที่เข้าเกณฑ์ และวันที่พบโรคนั้น
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/candidates"
              className="rounded-full border border-[rgba(179,213,228,0.18)] bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-medium text-[#eaf4fb] transition hover:-translate-y-0.5"
            >
              กลับหน้าคัดเลือก
            </Link>
            <button
              type="button"
              onClick={fetchReport}
              className="rounded-full border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.16)] px-5 py-3 text-sm font-semibold text-[#dffcf8] transition hover:-translate-y-0.5"
            >
              {loading ? "กำลังดึง..." : "ดึงรายชื่อเข้าเกณฑ์"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[0.7fr_0.7fr_0.6fr]">
          <select
            value={clinic}
            onChange={(event) => setClinic(event.target.value)}
            className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none focus:border-[rgba(107,226,211,0.42)]"
          >
            <option value="all">ทุก รพ.สต.</option>
            {clinicRules.map((rule) => (
              <option key={rule.shortName} value={rule.shortName}>
                {rule.clinicName}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none focus:border-[rgba(107,226,211,0.42)]"
          >
            <option value="all">ทั้งหมด</option>
            <option value="Chronic">Chronic</option>
            <option value="Opioid">Opioid</option>
          </select>
          <button
            type="button"
            onClick={fetchReport}
            className="rounded-full border border-[rgba(243,189,106,0.3)] bg-[rgba(243,189,106,0.12)] px-5 py-3 text-sm font-semibold text-[#f8dcae] transition hover:-translate-y-0.5"
          >
            ดึงรายชื่อเข้าเกณฑ์
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[color:var(--muted)]">
          <label className="inline-flex items-center gap-2 rounded-full border border-[rgba(179,213,228,0.14)] bg-[rgba(255,255,255,0.03)] px-4 py-2">
            <input
              type="checkbox"
              checked={ucOnly}
              onChange={(event) => setUcOnly(event.target.checked)}
              className="h-4 w-4 accent-[color:var(--accent)]"
            />
            เฉพาะสิทธิ UC
          </label>
          <span>เปิดไว้จะคัดเฉพาะ `inscl = UCS` ในรายชื่อคนไข้ที่ยังมีชีวิตอยู่</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="คนไข้มีชีวิต" value={summary.patients} note="จำนวนคนไข้ที่ยังมีชีวิตอยู่" />
          <StatCard label="UC" value={summary.uc} note="จำนวนคนไข้สิทธิ UC" />
          <StatCard label="ยังไม่ครบ / ครบ 6" value={`${summary.patients - summary.due} / ${summary.due}`} note="แยกกลุ่มรอเยี่ยมกับครบช่วงการให้บริการ" />
          <StatCard label="ยอดเงิน" value={`${summary.money.toLocaleString()} บาท`} note="รวมจาก rcmdb.repeclaim" />
        </div>
      </header>

      <section className="glass-panel rounded-[2rem] p-5 sm:p-6">
        <div className="overflow-hidden rounded-[1.5rem] border border-[rgba(179,213,228,0.12)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-[rgba(255,255,255,0.03)] text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-4">HN / ชื่อ</th>
                  <th className="px-4 py-4">สิทธิ</th>
                  <th className="px-4 py-4">รพ.สต.</th>
                  <th className="px-4 py-4">โรค / เงื่อนไข</th>
                  <th className="px-4 py-4">Z515 / Z718</th>
                  <th className="px-4 py-4">เยี่ยมบ้าน</th>
                  <th className="px-4 py-4">e-claim</th>
                  <th className="px-4 py-4">ลงทะเบียน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(179,213,228,0.08)]">
                {(report?.rows ?? []).length ? (
                  (report?.rows ?? []).map((row) => {
                    const detail = row as ActiveTreatmentRow;
                    return (
                      <tr key={`${row.hn}-${row.lastVisitAt}`} className="transition hover:bg-[rgba(255,255,255,0.04)]">
                        <td className="px-4 py-4">
                          <div className="font-medium text-[#f5fbff]">{row.fullName}</div>
                          <div className="mt-1 text-xs text-[color:var(--muted)]">
                            <Link href={`/candidates/${encodeURIComponent(row.hn)}`} className="hover:text-[#6be2d3]">
                              HN {row.hn}
                            </Link>
                            {" · "}
                            CID {row.cid} · {row.age} ปี
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.inscl ?? row.pttypeName ?? "—"}</td>
                        <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.clinicName ?? "—"}</td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-[#dfeaf3]">{row.primaryDxCode ?? "—"}</div>
                          <div className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                            {detail.listName ? `ยา: ${detail.listName}` : "—"}
                          </div>
                          {detail.diag ? <div className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{detail.diag}</div> : null}
                          <div className="mt-1 flex flex-wrap gap-2">
                            {detail.eligibleReason ? (
                              <Badge tone="accent">{detail.eligibleReason}</Badge>
                            ) : (
                              <Badge tone="danger">ยังไม่พบ dx เข้าเกณฑ์</Badge>
                            )}
                            {detail.matchedDxCode ? <Badge tone="warn">รหัส {detail.matchedDxCode}</Badge> : <Badge>—</Badge>}
                            {row.cancerFlag === "Y" ? <Badge tone="warn">Cancer</Badge> : null}
                            {row.drugFlag === "Y" ? <Badge tone="warn">Drug</Badge> : null}
                          </div>
                          <div className="mt-2 text-xs leading-5 text-[color:var(--muted)]">
                            {detail.matchedDxDate ? `พบครั้งแรก ${formatThaiDate(detail.matchedDxDate)}` : "ยังไม่พบวันที่เข้าเกณฑ์"} · เข้าเงื่อนไขจาก HOSXP
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {row.z515Flag === "Y" ? <Badge tone="accent">Z515</Badge> : <Badge>—</Badge>}
                            {row.z718Flag === "Y" ? <Badge tone="warn">Z718</Badge> : <Badge>—</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.homeVisitCount} ครั้ง</td>
                        <td className="px-4 py-4">
                          <Badge tone={row.eclaimCount ? "accent" : "default"}>{row.eclaimCount} ราย</Badge>
                          <div className="mt-2 text-xs text-[color:var(--muted)]">{row.money.toLocaleString()} บาท</div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            disabled={registering === row.hn}
                            onClick={() => void registerCandidate(row)}
                            className="rounded-full border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.12)] px-4 py-2 text-xs font-semibold text-[#dffcf8] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {registering === row.hn ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
                          </button>
                          <div className="mt-2 text-xs text-[color:var(--muted)]">{formatThaiDate(row.lastVisitAt)}</div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-sm text-[color:var(--muted)]">
                      ไม่มีรายชื่อคนไข้ที่ยังมีชีวิตอยู่ในขณะนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
