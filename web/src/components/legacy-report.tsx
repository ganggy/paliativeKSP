"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clinicRules } from "@/lib/clinic-rules";
import type { LegacyPalliativeReport, LegacyPalliativeRow } from "@/lib/types";

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStartKey(date = new Date()) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-01`;
}

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

export function LegacyReport() {
  const [startDate, setStartDate] = useState(monthStartKey());
  const [endDate, setEndDate] = useState(dateKey());
  const [clinic, setClinic] = useState("all");
  const [status, setStatus] = useState("99999");
  const [report, setReport] = useState<LegacyPalliativeReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
        clinic,
        status,
      });
      const data = (await requestJson(`/api/legacy-report?${query.toString()}`)) as LegacyPalliativeReport;
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const rows = report?.rows ?? [];
    return {
      patients: rows.length,
      homeVisits: rows.reduce((total, row) => total + row.homeVisitCount, 0),
      eclaims: rows.reduce((total, row) => total + row.eclaimCount, 0),
      money: rows.reduce((total, row) => total + row.money, 0),
      z718: rows.reduce((total, row) => total + row.z718Count, 0),
    };
  }, [report]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="glass-panel-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(243,189,106,0.24)] bg-[rgba(243,189,106,0.1)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#f8dcae]">
              Legacy report
            </div>
            <h1 className="section-title mt-3 text-3xl font-semibold text-[#f5fbff] sm:text-4xl">
              รายงานแบบเดียวกับโปรแกรม PHP เดิม
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              ดึงข้อมูลทะเบียน palliative, เยี่ยมบ้าน, e-claim และเงินเบิกในมุมมองเดียว พร้อมกรองตามช่วงวันที่และสถานะ
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-[rgba(179,213,228,0.18)] bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-medium text-[#eaf4fb] transition hover:-translate-y-0.5"
            >
              กลับ dashboard
            </Link>
            <button
              type="button"
              onClick={fetchReport}
              className="rounded-full border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.16)] px-5 py-3 text-sm font-semibold text-[#dffcf8] transition hover:-translate-y-0.5"
            >
              {loading ? "กำลังดึง..." : "ดึงรายงาน"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[0.7fr_0.7fr_0.6fr_0.5fr]">
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none focus:border-[rgba(107,226,211,0.42)]"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none focus:border-[rgba(107,226,211,0.42)]"
          />
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
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none focus:border-[rgba(107,226,211,0.42)]"
          >
            <option value="99999">ทุกสถานะ</option>
            <option value="N">ยังมีชีวิต</option>
            <option value="Y">เสียชีวิต</option>
          </select>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="ผู้ป่วยในรายงาน" value={summary.patients} note="จำนวนคนไข้ที่เข้าเงื่อนไขช่วงวันที่เลือก" />
          <StatCard label="เยี่ยมบ้าน" value={summary.homeVisits} note="จำนวน visit ที่มีข้อมูลการเยี่ยมใน HOSXP" />
          <StatCard label="Z718" value={summary.z718} note="การเยี่ยมที่มีรหัส Z718" />
          <StatCard label="e-claim" value={summary.eclaims} note="จำนวนรายการเบิกที่พบ" />
          <StatCard label="เงินเบิก" value={`${summary.money.toLocaleString()} บาท`} note="รวมจาก rcmdb.repeclaim" />
        </div>
      </header>

      <section className="glass-panel rounded-[2rem] p-5 sm:p-6">
        <div className="overflow-hidden rounded-[1.5rem] border border-[rgba(179,213,228,0.12)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-[rgba(255,255,255,0.03)] text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-4">ที่</th>
                  <th className="px-4 py-4">วันที่ล่าสุด</th>
                  <th className="px-4 py-4">HN</th>
                  <th className="px-4 py-4">สิทธิ</th>
                  <th className="px-4 py-4">เลขบัตร</th>
                  <th className="px-4 py-4">ชื่อ - สกุล</th>
                  <th className="px-4 py-4">วันเกิด</th>
                  <th className="px-4 py-4">อายุ</th>
                  <th className="px-4 py-4">ที่อยู่</th>
                  <th className="px-4 py-4">รพ.สต.</th>
                  <th className="px-4 py-4">PDX</th>
                  <th className="px-4 py-4">เยี่ยมบ้าน Z718</th>
                  <th className="px-4 py-4">เยี่ยมบ้าน รพ.</th>
                  <th className="px-4 py-4">e-claim</th>
                  <th className="px-4 py-4">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(179,213,228,0.08)]">
                {(report?.rows ?? []).length ? (
                  (report?.rows ?? []).map((row: LegacyPalliativeRow) => (
                    <tr key={`${row.hn}-${row.lastVisitAt}`} className="transition hover:bg-[rgba(255,255,255,0.04)]">
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.rowNo}</td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{formatThaiDate(row.lastVisitAt)}</td>
                      <td className="px-4 py-4">
                        <Link href={`/candidates/${encodeURIComponent(row.hn)}`} className="font-medium text-[#f5fbff] hover:text-[#6be2d3]">
                          {row.hn}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.pttypeName ?? "—"}</td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.cid}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-[#f5fbff]">{row.fullName}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge tone={row.death === "Y" ? "danger" : "accent"}>{row.death === "Y" ? "เสียชีวิต" : "ยังมีชีวิต"}</Badge>
                          {row.primaryDxCode ? <Badge tone="warn">{row.primaryDxCode}</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{formatThaiDate(row.birthday)}</td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.age ?? "—"}</td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.address ?? "—"}</td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.clinicName ?? "—"}</td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-[#dfeaf3]">{row.primaryDxCode ?? "—"}</div>
                        <div className="mt-1 text-xs text-[color:var(--muted)]">Z515 {row.z515Count} · Z718 {row.z718Count}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.z718Count} ครั้ง</td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.homeVisitCount} ครั้ง</td>
                      <td className="px-4 py-4">
                        <Badge tone={row.eclaimCount ? "accent" : "default"}>{row.eclaimCount} ราย</Badge>
                        <div className="mt-2 text-xs text-[color:var(--muted)]">{row.money.toLocaleString()} บาท</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[color:var(--muted)]">{row.note}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-sm text-[color:var(--muted)]">
                      ยังไม่มีข้อมูลรายงาน ให้ลองเปลี่ยนช่วงวันที่หรือกดดึงรายงานใหม่
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
