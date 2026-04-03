"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { HosCandidate } from "@/lib/types";

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

export function CandidateDetail({ candidate }: { candidate: HosCandidate }) {
  const [registering, setRegistering] = useState(false);
  const [done, setDone] = useState(false);

  const registerCandidate = async () => {
    setRegistering(true);
    try {
      await requestJson("/api/candidates/register", {
        method: "POST",
        body: JSON.stringify(candidate),
      });
      setDone(true);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="glass-panel-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(243,189,106,0.24)] bg-[rgba(243,189,106,0.1)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#f8dcae]">
              HN detail
            </div>
            <h1 className="section-title mt-3 text-3xl font-semibold text-[#f5fbff] sm:text-4xl">{candidate.fullName}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              หน้ารายละเอียดก่อนลงทะเบียน ใช้ตรวจสอบข้อมูลจาก HOSXP แบบ fallback ได้ทันที
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
              onClick={registerCandidate}
              disabled={registering || done}
              className="rounded-full border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.16)] px-5 py-3 text-sm font-semibold text-[#dffcf8] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {done ? "ลงทะเบียนแล้ว" : registering ? "กำลังลงทะเบียน..." : "เอาเข้าระบบ"}
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{candidate.clinicShortName}</Badge>
            <Badge tone="warn">{candidate.serviceCount} ครั้งบริการ</Badge>
            <Badge>{candidate.visitDate}</Badge>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-[rgba(179,213,228,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">HN / CID</div>
              <div className="mt-2 text-lg font-semibold text-[#f5fbff]">{candidate.hn}</div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">{candidate.cid}</div>
            </div>
            <div className="rounded-[1.25rem] border border-[rgba(179,213,228,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">โรคหลัก</div>
              <div className="mt-2 text-lg font-semibold text-[#f5fbff]">{candidate.primaryDxCode}</div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">{candidate.eligibleReason}</div>
            </div>
            <div className="rounded-[1.25rem] border border-[rgba(179,213,228,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">บริการล่าสุด</div>
              <div className="mt-2 text-lg font-semibold text-[#f5fbff]">{candidate.lastServiceAt ?? candidate.visitDate}</div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">ประวัติที่ดึงจาก HOSXP</div>
            </div>
            <div className="rounded-[1.25rem] border border-[rgba(179,213,228,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">สิทธิ</div>
              <div className="mt-2 text-lg font-semibold text-[#f5fbff]">{candidate.pttype ?? "—"}</div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">{candidate.pttypeName ?? "—"}</div>
            </div>
          </div>
        </div>

        <aside className="glass-panel rounded-[2rem] p-5 sm:p-6">
          <h2 className="section-title text-2xl font-semibold">ข้อมูลประกอบ</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-[1.25rem] border border-[rgba(179,213,228,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-[color:var(--muted)]">เบอร์โทร</div>
              <div className="mt-1 font-medium text-[#f5fbff]">{candidate.phone ?? "—"}</div>
            </div>
            <div className="rounded-[1.25rem] border border-[rgba(179,213,228,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-[color:var(--muted)]">ที่อยู่</div>
              <div className="mt-1 font-medium text-[#f5fbff]">{candidate.address ?? "—"}</div>
            </div>
            <div className="rounded-[1.25rem] border border-[rgba(179,213,228,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-[color:var(--muted)]">ACP / Opioid</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {candidate.acpRequired ? <Badge tone="accent">ACP</Badge> : <Badge>no ACP</Badge>}
                {candidate.opioidEligible ? <Badge tone="warn">opioid</Badge> : <Badge>standard</Badge>}
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
