"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { HosCandidate } from "@/lib/types";

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { headers: { "content-type": "application/json" }, ...init });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" | "warn" }) {
  const toneClass =
    tone === "accent"
      ? "border-[rgba(107,226,211,0.34)] bg-[rgba(107,226,211,0.12)] text-[#bff8ef]"
      : tone === "warn"
        ? "border-[rgba(243,189,106,0.34)] bg-[rgba(243,189,106,0.12)] text-[#f8dcae]"
        : "border-[rgba(179,213,228,0.2)] bg-[rgba(179,213,228,0.06)] text-[#d8e8f4]";
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${toneClass}`}>{children}</span>;
}

export function CandidateSelector({ clinicNames }: { clinicNames: Array<{ shortName: string; clinicName: string }> }) {
  const searchParams = useSearchParams();
  const [visitDate, setVisitDate] = useState(dateKey());
  const [clinic, setClinic] = useState("all");
  const [hn, setHn] = useState(searchParams.get("hn") ?? "");
  const [searchAll, setSearchAll] = useState(false);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<HosCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        visitDate,
        clinic,
        search: search.trim(),
        area: searchAll ? "all" : "clinic",
      });

      if (hn.trim()) {
        query.set("hn", hn.trim());
      }

      const data = (await requestJson(`/api/candidates?${query.toString()}`)) as HosCandidate[];
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hnParam = searchParams.get("hn");
    if (hnParam) {
      setHn(hnParam);
    }
    void fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filteredCount = useMemo(() => rows.length, [rows]);
  const topMatch = useMemo(() => rows.find((row) => row.hn === hn.trim() || row.hn === hn.trim().replace(/^0+/, "")), [hn, rows]);

  const registerCandidate = async (candidate: HosCandidate) => {
    setRegistering(candidate.hn);
    try {
      await requestJson("/api/candidates/register", {
        method: "POST",
        body: JSON.stringify(candidate),
      });
      await fetchRows();
    } finally {
      setRegistering(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="glass-panel-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(243,189,106,0.24)] bg-[rgba(243,189,106,0.1)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#f8dcae]">
              Candidate selection
            </div>
            <h1 className="section-title mt-3 text-3xl font-semibold text-[#f5fbff] sm:text-4xl">เลือกคนไข้เข้า palliative จาก HOSXP</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              ค้นหา HN, CID หรือชื่อคนไข้ได้โดยตรง แล้วเลือกลงทะเบียนเฉพาะรายที่เข้าเกณฑ์
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/candidates/auto"
              className="rounded-full border border-[rgba(243,189,106,0.3)] bg-[rgba(243,189,106,0.12)] px-5 py-3 text-sm font-medium text-[#f8dcae] transition hover:-translate-y-0.5"
            >
              รายชื่อเข้าเกณฑ์อัตโนมัติ
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[rgba(179,213,228,0.18)] bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-medium text-[#eaf4fb] transition hover:-translate-y-0.5"
            >
              กลับ dashboard
            </Link>
            <button
              type="button"
              onClick={fetchRows}
              className="rounded-full border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.16)] px-5 py-3 text-sm font-semibold text-[#dffcf8] transition hover:-translate-y-0.5"
            >
              ดึงรายชื่อใหม่
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_0.6fr_0.6fr_0.4fr]">
          <input
            value={hn}
            onChange={(event) => setHn(event.target.value)}
            placeholder="ค้นหา HN โดยตรง"
            className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none placeholder:text-[#7f96ac] focus:border-[rgba(107,226,211,0.42)]"
          />
          <select
            value={clinic}
            onChange={(event) => setClinic(event.target.value)}
            className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none focus:border-[rgba(107,226,211,0.42)]"
          >
            <option value="all">ทุก รพ.สต.</option>
            {clinicNames.map((item) => (
              <option key={item.shortName} value={item.shortName}>
                {item.clinicName}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={visitDate}
            onChange={(event) => setVisitDate(event.target.value)}
            className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none focus:border-[rgba(107,226,211,0.42)]"
          />
          <button
            type="button"
            onClick={fetchRows}
            className="rounded-full border border-[rgba(243,189,106,0.3)] bg-[rgba(243,189,106,0.12)] px-4 py-3 text-sm font-semibold text-[#f8dcae] transition hover:-translate-y-0.5"
          >
            {loading ? "..." : "ค้นหา"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.4fr]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหา ชื่อ, CID, โรค, รพ.สต."
            className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none placeholder:text-[#7f96ac] focus:border-[rgba(107,226,211,0.42)]"
          />
          <button
            type="button"
            onClick={fetchRows}
            className="rounded-full border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.12)] px-4 py-3 text-sm font-semibold text-[#dffcf8] transition hover:-translate-y-0.5"
          >
            ค้นหา HN
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[color:var(--muted)]">
          <label className="inline-flex items-center gap-2 rounded-full border border-[rgba(179,213,228,0.14)] bg-[rgba(255,255,255,0.03)] px-4 py-2">
            <input
              type="checkbox"
              checked={searchAll}
              onChange={(event) => setSearchAll(event.target.checked)}
              className="h-4 w-4 accent-[color:var(--accent)]"
            />
            ค้นหาทุก HN แม้ไม่เข้าเขต
          </label>
          <span>ถ้าเลือกโหมดนี้ ระบบจะค้นจาก HOSXP ตรง ๆ โดยไม่บังคับเงื่อนไขพื้นที่</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[color:var(--muted)]">
          <Badge tone="accent">พบ {filteredCount} ราย</Badge>
          {topMatch ? <Badge tone="warn">HN ตรงกับ {topMatch.fullName}</Badge> : null}
          <span>เลือกเฉพาะคนที่เข้าเกณฑ์จาก HOSXP</span>
        </div>
      </header>

      <section className="glass-panel rounded-[2rem] p-5 sm:p-6">
        <div className="overflow-hidden rounded-[1.5rem] border border-[rgba(179,213,228,0.12)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-[rgba(255,255,255,0.03)] text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-4">HN / ชื่อ</th>
                  <th className="px-4 py-4">รพ.สต.</th>
                  <th className="px-4 py-4">โรคหลัก</th>
                  <th className="px-4 py-4">ให้บริการแล้ว</th>
                  <th className="px-4 py-4">ล่าสุด</th>
                  <th className="px-4 py-4">ลงทะเบียน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(179,213,228,0.08)]">
                {rows.length ? (
                  rows.map((row) => (
                    <tr key={`${row.hn}-${row.cid}`} className="transition hover:bg-[rgba(255,255,255,0.04)]">
                      <td className="px-4 py-4">
                        <div className="font-medium text-[#f5fbff]">{row.fullName}</div>
                        <div className="mt-1 text-xs text-[color:var(--muted)]">
                          HN {row.hn} · CID {row.cid} · {row.age} ปี
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.clinicShortName}</td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-[#dfeaf3]">{row.primaryDxCode}</div>
                        <div className="mt-1 text-xs text-[color:var(--muted)]">{row.eligibleReason}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.serviceCount} ครั้ง</td>
                      <td className="px-4 py-4 text-sm text-[#d6e5f1]">{row.lastServiceAt ?? row.visitDate}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/candidates/${encodeURIComponent(row.hn)}`}
                            className="rounded-full border border-[rgba(179,213,228,0.18)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-xs font-semibold text-[#eaf4fb] transition hover:-translate-y-0.5"
                          >
                            ดูรายละเอียด
                          </Link>
                          <button
                            type="button"
                            disabled={registering === row.hn}
                            onClick={() => void registerCandidate(row)}
                            className="rounded-full border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.12)] px-4 py-2 text-xs font-semibold text-[#dffcf8] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {registering === row.hn ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-sm text-[color:var(--muted)]">
                      ยังไม่มีรายชื่อ ให้ลองค้นหา HN หรือเลือก รพ.สต. แล้วดึงรายชื่อใหม่
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
