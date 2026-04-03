"use client";

import Link from "next/link";
import { startTransition, useMemo, useState, type ReactNode } from "react";
import type { DashboardSnapshot, DashboardSummary, HosCandidate, PalliativePatient } from "@/lib/types";

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatShortDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function monthKey(value: string) {
  return value.slice(0, 7);
}

function buildSummary(snapshot: DashboardSnapshot): DashboardSummary {
  const currentMonth = monthKey(dateKey());
  return {
    activeCount: snapshot.patients.filter((patient) => patient.careStatus === "active" || patient.careStatus === "due").length,
    dueToday: snapshot.patients.filter((patient) => patient.nextVisitAt === dateKey()).length,
    thisMonthVisits: snapshot.visits.filter((visit) => monthKey(visit.visitDate) === currentMonth).length,
    completedCount: snapshot.patients.filter((patient) => patient.careStatus === "completed").length,
    deceasedCount: snapshot.patients.filter((patient) => patient.careStatus === "deceased").length,
    opioidProgramCount: snapshot.patients.filter((patient) => patient.opioidEligible).length,
    acpCount: snapshot.patients.filter((patient) => patient.acpRequired).length,
  };
}

function statusTone(status: PalliativePatient["careStatus"]) {
  if (status === "due") return "border-[rgba(243,189,106,0.35)] bg-[rgba(243,189,106,0.12)] text-[#f7d58f]";
  if (status === "completed") return "border-[rgba(134,230,164,0.35)] bg-[rgba(134,230,164,0.12)] text-[#aff0bf]";
  if (status === "deceased") return "border-[rgba(241,142,151,0.35)] bg-[rgba(241,142,151,0.12)] text-[#f8b0b7]";
  if (status === "paused") return "border-[rgba(155,176,198,0.35)] bg-[rgba(155,176,198,0.12)] text-[#d6e3ef]";
  return "border-[rgba(107,226,211,0.35)] bg-[rgba(107,226,211,0.12)] text-[#bdf6ee]";
}

function statusLabel(status: PalliativePatient["careStatus"]) {
  if (status === "due") return "ถึงกำหนด";
  if (status === "completed") return "จำหน่ายครบช่วง";
  if (status === "deceased") return "เสียชีวิต";
  if (status === "paused") return "พักงาน";
  return "ติดตามต่อเนื่อง";
}

function monthCalendar(now: Date, visits: Array<{ visitDate: string }>, nextVisits: Array<{ nextVisitAt?: string }>) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  const startIndex = (firstDay.getDay() + 6) % 7;
  const counters = new Map<string, number>();

  for (const item of visits) {
    const key = item.visitDate.slice(0, 10);
    counters.set(key, (counters.get(key) ?? 0) + 1);
  }
  for (const item of nextVisits) {
    if (!item.nextVisitAt) continue;
    const key = item.nextVisitAt.slice(0, 10);
    counters.set(key, (counters.get(key) ?? 0) + 1);
  }

  const cells: Array<{ day: number | null; key?: string; count?: number }> = [];
  for (let i = 0; i < startIndex; i += 1) cells.push({ day: null });
  for (let day = 1; day <= totalDays; day += 1) {
    const key = `${year}-${`${month + 1}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
    cells.push({ day, key, count: counters.get(key) ?? 0 });
  }

  return cells;
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { headers: { "content-type": "application/json" }, ...init });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function MiniStat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="glass-panel-strong rounded-3xl p-4 sm:p-5">
      <div className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--muted)]">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-[#f5fbff]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{note}</div>
    </div>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "warn" | "danger";
}) {
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

export function PalliativeDashboard({ initialSnapshot }: { initialSnapshot: DashboardSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeClinic, setActiveClinic] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(initialSnapshot.patients[0]?.id ?? 0);
  const [selectedDay, setSelectedDay] = useState(dateKey());
  const [candidateDate, setCandidateDate] = useState(dateKey());
  const [candidateClinic, setCandidateClinic] = useState("all");
  const [candidateRows, setCandidateRows] = useState<HosCandidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [detailDraft, setDetailDraft] = useState({
    phone: initialSnapshot.patients[0]?.phone ?? "",
    relativePhone: initialSnapshot.patients[0]?.relativePhone ?? "",
    lineId: initialSnapshot.patients[0]?.lineId ?? "",
    notes: initialSnapshot.patients[0]?.notes ?? "",
    nextVisitAt: initialSnapshot.patients[0]?.nextVisitAt ?? dateKey(),
    authenCode: initialSnapshot.patients[0]?.authenCode ?? "",
  });

  const summary = useMemo(() => buildSummary(snapshot), [snapshot]);
  const selectedPatient = snapshot.patients.find((patient) => patient.id === selectedId) ?? snapshot.patients[0];
  const filteredPatients = useMemo(
    () =>
      snapshot.patients
        .filter((patient) => (activeClinic === "all" ? true : patient.clinicShortName === activeClinic))
        .filter((patient) => {
          if (!search.trim()) return true;
          const keyword = search.trim().toLowerCase();
          return [patient.fullName, patient.hn, patient.cid, patient.primaryDxCode, patient.primaryDxName, patient.phone, patient.relativePhone, patient.lineId, patient.clinicShortName]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword));
        })
        .sort((a, b) => {
          const aRank = a.nextVisitAt === dateKey() ? 0 : a.careStatus === "due" ? 1 : 2;
          const bRank = b.nextVisitAt === dateKey() ? 0 : b.careStatus === "due" ? 1 : 2;
          return aRank - bRank || a.clinicShortName.localeCompare(b.clinicShortName);
        }),
    [activeClinic, search, snapshot.patients],
  );
  const todayVisits = useMemo(() => snapshot.visits.filter((visit) => visit.visitDate === selectedDay), [selectedDay, snapshot.visits]);
  const calendarCells = useMemo(() => monthCalendar(new Date(), snapshot.visits, snapshot.patients), [snapshot.patients, snapshot.visits]);
  const selectedDetail = selectedPatient ?? snapshot.patients[0];
  const dayEvents = useMemo(() => {
    const next = snapshot.patients.filter((patient) => patient.nextVisitAt === selectedDay);
    const done = snapshot.visits.filter((visit) => visit.visitDate === selectedDay);
    return { next, done };
  }, [selectedDay, snapshot.patients, snapshot.visits]);

  const refresh = async () => setSnapshot((await requestJson("/api/dashboard")) as DashboardSnapshot);
  const run = (fn: () => Promise<unknown>) => startTransition(() => void fn().then(refresh));
  const handleSelectPatient = (patient: PalliativePatient) => {
    setSelectedId(patient.id);
    setDetailDraft({
      phone: patient.phone ?? "",
      relativePhone: patient.relativePhone ?? "",
      lineId: patient.lineId ?? "",
      notes: patient.notes ?? "",
      nextVisitAt: patient.nextVisitAt ?? dateKey(),
      authenCode: patient.authenCode ?? "",
    });
  };

  const handleSaveDetail = () => {
    if (!selectedDetail) return;
    run(() =>
      requestJson(`/api/registry/${selectedDetail.id}`, {
        method: "PATCH",
        body: JSON.stringify(detailDraft),
      }),
    );
  };

  const handleAddVisit = () => {
    if (!selectedDetail) return;
    run(() =>
      requestJson(`/api/registry/${selectedDetail.id}/visits`, {
        method: "POST",
        body: JSON.stringify({
          visitDate: dateKey(),
          visitor: "ทีมเยี่ยมบ้าน",
          authenCode: detailDraft.authenCode || selectedDetail.authenCode || "",
          note: "บันทึกเยี่ยมผ่าน dashboard",
        }),
      }),
    );
  };

  const handleDischarge = (reason: "ครบช่วงการให้บริการ" | "เสียชีวิต") => {
    if (!selectedDetail) return;
    run(() =>
      requestJson(`/api/registry/${selectedDetail.id}/discharge`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    );
  };

  const handleLoadCandidates = () => {
    setCandidateLoading(true);
    void requestJson(`/api/candidates?visitDate=${candidateDate}&clinic=${candidateClinic}`).then(
      (rows) => {
        setCandidateRows(rows as HosCandidate[]);
        setCandidateLoading(false);
      },
    ).catch(() => setCandidateLoading(false));
  };

  const handleRegisterCandidate = (candidate: HosCandidate) => {
    run(() =>
      requestJson("/api/candidates/register", {
        method: "POST",
        body: JSON.stringify(candidate),
      }),
    );
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="grid-fade-in glass-panel-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.12)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#bff8ef]">
              Palliative Care Hub 2569
            </div>
            <h1 className="section-title mt-4 text-4xl font-semibold text-[#f5fbff] sm:text-5xl">ระบบบริหารจัดการผู้ป่วยประคับประคอง</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[color:var(--muted)] sm:text-lg">
              ดึงผู้ป่วยเข้าทะเบียนจาก HOSXP, ติดตามการเยี่ยมบ้าน, จดบันทึก Authen code, จบสิทธิครบ 6 เดือนหรือกรณีเสียชีวิต
              และสรุปภาพรวมให้ทีมบริหารในหน้าจอเดียว
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/legacy"
              className="rounded-full border border-[rgba(243,189,106,0.3)] bg-[rgba(243,189,106,0.12)] px-5 py-3 text-sm font-medium text-[#f8dcae] transition hover:-translate-y-0.5 hover:bg-[rgba(243,189,106,0.18)]"
            >
              รายงานแบบเดิม
            </Link>
            <Link
              href="/candidates/auto"
              className="rounded-full border border-[rgba(107,226,211,0.3)] bg-[rgba(107,226,211,0.12)] px-5 py-3 text-sm font-medium text-[#dffcf8] transition hover:-translate-y-0.5 hover:bg-[rgba(107,226,211,0.18)]"
            >
              รายชื่อเข้าเกณฑ์อัตโนมัติ
            </Link>
            <Link
              href="/candidates"
              className="rounded-full border border-[rgba(243,189,106,0.3)] bg-[rgba(243,189,106,0.12)] px-5 py-3 text-sm font-medium text-[#f8dcae] transition hover:-translate-y-0.5 hover:bg-[rgba(243,189,106,0.18)]"
            >
              เปิดหน้าคัดเลือกคนไข้
            </Link>
            <button
              type="button"
              onClick={handleLoadCandidates}
              className="rounded-full border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.16)] px-5 py-3 text-sm font-medium text-[#dffcf8] transition hover:-translate-y-0.5 hover:bg-[rgba(107,226,211,0.22)]"
            >
              ดึงรายชื่อเข้าเกณฑ์
            </button>
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-[rgba(179,213,228,0.2)] bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-medium text-[#eaf4fb] transition hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.08)]"
            >
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Active case" value={summary.activeCount} note="ผู้ป่วยที่ยังติดตามต่อเนื่องหรือถึงกำหนดเยี่ยม" />
          <MiniStat label="วันนี้ต้องเยี่ยม" value={summary.dueToday} note="รายการที่มีนัดในวันนี้ตามปฏิทิน" />
          <MiniStat label="เยี่ยมในเดือนนี้" value={summary.thisMonthVisits} note="จำนวน visit ที่บันทึกแล้วในเดือนปัจจุบัน" />
          <MiniStat label="ACP / Opioid" value={`${summary.acpCount} / ${summary.opioidProgramCount}`} note="ผู้ที่ต้องมี Advance Care Plan และกลุ่มที่เข้าเงื่อนไขยาฝิ่น" />
        </div>
      </header>

      <section className="glass-panel rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(243,189,106,0.24)] bg-[rgba(243,189,106,0.1)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#f8dcae]">
              Candidate inbox
            </div>
            <h2 className="section-title mt-3 text-2xl font-semibold">ดึงรายชื่อคนไข้ที่เข้าเกณฑ์จาก HOSXP</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              เลือก รพ.สต. และวันที่ต้องการดูรายชื่อ แล้วกดดึงเข้าระบบ จากนั้นค่อยกด “ลงทะเบียน” ทีละคน
              ตัวเลข “ให้บริการแล้ว” มาจาก `opitemrece` ที่มี `eva001`, `cons01`, `30001`
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={candidateClinic}
                  onChange={(event) => setCandidateClinic(event.target.value)}
                  className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none focus:border-[rgba(107,226,211,0.42)]"
                >
                  <option value="all">ทุก รพ.สต.</option>
                  {snapshot.clinicRules.map((rule) => (
                    <option key={rule.shortName} value={rule.shortName}>
                      {rule.clinicName}
                    </option>
                  ))}
                </select>
            <input
              type="date"
              value={candidateDate}
              onChange={(event) => setCandidateDate(event.target.value)}
              className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none focus:border-[rgba(107,226,211,0.42)]"
            />
            <button
              type="button"
              onClick={handleLoadCandidates}
              className="rounded-full border border-[rgba(243,189,106,0.3)] bg-[rgba(243,189,106,0.12)] px-5 py-3 text-sm font-semibold text-[#f8dcae] transition hover:-translate-y-0.5"
            >
              {candidateLoading ? "กำลังดึง..." : "ดึงรายชื่อเข้าเกณฑ์"}
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[rgba(179,213,228,0.12)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-[rgba(255,255,255,0.03)] text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-4">ผู้ป่วย</th>
                  <th className="px-4 py-4">รพ.สต.</th>
                  <th className="px-4 py-4">โรคหลัก</th>
                  <th className="px-4 py-4">ให้บริการแล้ว</th>
                  <th className="px-4 py-4">เยี่ยมล่าสุด</th>
                  <th className="px-4 py-4">การตัดสินใจ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(179,213,228,0.08)]">
                {candidateRows.length ? (
                  candidateRows.map((candidate) => {
                    const alreadyRegistered = snapshot.patients.some((patient) => patient.hn === candidate.hn || patient.cid === candidate.cid);
                    return (
                      <tr key={`${candidate.hn}-${candidate.visitDate}`} className="transition hover:bg-[rgba(255,255,255,0.04)]">
                        <td className="px-4 py-4">
                          <div className="font-medium text-[#f5fbff]">{candidate.fullName}</div>
                          <div className="mt-1 text-xs text-[color:var(--muted)]">
                            HN {candidate.hn} · CID {candidate.cid}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#d6e5f1]">{candidate.clinicShortName}</td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-[#dfeaf3]">{candidate.primaryDxCode}</div>
                          <div className="mt-1 text-xs text-[color:var(--muted)]">{candidate.eligibleReason}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#d6e5f1]">{candidate.serviceCount} ครั้ง</td>
                        <td className="px-4 py-4 text-sm text-[#d6e5f1]">{formatShortDate(candidate.lastServiceAt ?? candidate.visitDate)}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            disabled={alreadyRegistered}
                            onClick={() => handleRegisterCandidate(candidate)}
                            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                              alreadyRegistered
                                ? "cursor-not-allowed border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.03)] text-[color:var(--muted)]"
                                : "border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.12)] text-[#dffcf8] hover:-translate-y-0.5"
                            }`}
                          >
                            {alreadyRegistered ? "อยู่ในทะเบียนแล้ว" : "ลงทะเบียน"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-sm text-[color:var(--muted)]">
                      ยังไม่มีรายชื่อที่ดึงมา แนะนำให้เลือก รพ.สต. และกดดึงรายชื่อเข้าเกณฑ์ก่อน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="grid gap-6">
          <section className="glass-panel rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="section-title text-2xl font-semibold">ทะเบียนผู้ป่วยที่กำลังดูแล</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  ค้นหาได้จาก HN, CID, ชื่อ, รหัสโรค, เบอร์โทร หรือชื่อ รพ.สต. และเลือกผู้ป่วยเพื่อแก้ไขรายละเอียดด้านข้าง
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหาคนไข้หรือรหัสโรค"
                  className="min-w-[240px] rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none placeholder:text-[#7f96ac] focus:border-[rgba(107,226,211,0.42)]"
                />
                <select
                  value={activeClinic}
                  onChange={(event) => setActiveClinic(event.target.value)}
                  className="rounded-full border border-[rgba(179,213,228,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm outline-none focus:border-[rgba(107,226,211,0.42)]"
                >
                  <option value="all">ทุก รพ.สต.</option>
                  {snapshot.clinicRules.map((rule) => (
                    <option key={rule.shortName} value={rule.shortName}>
                      {rule.clinicName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[rgba(179,213,228,0.12)]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead className="bg-[rgba(255,255,255,0.03)] text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">
                    <tr>
                      <th className="px-4 py-4">ผู้ป่วย</th>
                      <th className="px-4 py-4">รพ.สต.</th>
                      <th className="px-4 py-4">โรคหลัก</th>
                      <th className="px-4 py-4">นัดถัดไป</th>
                      <th className="px-4 py-4">ครั้ง</th>
                      <th className="px-4 py-4">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="stagger divide-y divide-[rgba(179,213,228,0.08)]">
                    {filteredPatients.map((patient) => (
                      <tr
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient)}
                        className={`cursor-pointer transition hover:bg-[rgba(255,255,255,0.04)] ${patient.id === selectedDetail?.id ? "bg-[rgba(107,226,211,0.08)]" : ""}`}
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium text-[#f5fbff]">{patient.fullName}</div>
                          <div className="mt-1 text-xs text-[color:var(--muted)]">
                            HN {patient.hn} · CID {patient.cid}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#d6e5f1]">{patient.clinicShortName}</td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-[#dfeaf3]">{patient.primaryDxCode}</div>
                          <div className="mt-1 text-xs text-[color:var(--muted)]">{patient.eligibleReason}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#d6e5f1]">{formatShortDate(patient.nextVisitAt)}</td>
                        <td className="px-4 py-4 text-sm text-[#d6e5f1]">{patient.serviceMonthCount} เดือน</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusTone(patient.careStatus)}`}>{statusLabel(patient.careStatus)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="section-title text-2xl font-semibold">ปฏิทินเยี่ยมบ้าน</h2>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">ดูว่ามีเยี่ยมกี่คนในแต่ละวัน และเลือกวันเพื่อดูรายละเอียด</p>
                </div>
                <Badge tone="accent">{new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date())}</Badge>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
                {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {calendarCells.map((cell, index) => {
                  if (!cell.day || !cell.key) {
                    return <div key={`empty-${index}`} className="aspect-square rounded-2xl border border-dashed border-[rgba(179,213,228,0.08)]" />;
                  }

                  const isActive = cell.key === selectedDay;
                  const isToday = cell.key === dateKey();
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setSelectedDay(cell.key!)}
                      className={`aspect-square rounded-2xl border px-2 py-2 text-left transition hover:-translate-y-0.5 hover:border-[rgba(107,226,211,0.34)] ${
                        isActive
                          ? "border-[rgba(107,226,211,0.5)] bg-[rgba(107,226,211,0.16)]"
                          : "border-[rgba(179,213,228,0.08)] bg-[rgba(255,255,255,0.03)]"
                      }`}
                    >
                      <div className={`text-base font-semibold ${isToday ? "text-[#6be2d3]" : "text-[#f5fbff]"}`}>{cell.day}</div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[color:var(--muted)]">
                        <span>{cell.count ? `${cell.count} นัด` : "ว่าง"}</span>
                        {cell.count ? <span className="h-2 w-2 rounded-full bg-[#6be2d3]" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
              <h2 className="section-title text-2xl font-semibold">งานของวัน</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {formatDate(selectedDay)} · ผู้ป่วยนัดวันนี้และการเยี่ยมที่บันทึกไว้
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-[1.25rem] border border-[rgba(179,213,228,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">ต้องเยี่ยม</div>
                  <div className="mt-3 text-3xl font-semibold">{dayEvents.next.length}</div>
                  <div className="mt-2 text-sm text-[color:var(--muted)]">รายการที่ตรงกับวันนัดในระบบ</div>
                </div>
                <div className="rounded-[1.25rem] border border-[rgba(179,213,228,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">บันทึก visit แล้ว</div>
                  <div className="mt-3 text-3xl font-semibold">{dayEvents.done.length}</div>
                  <div className="mt-2 text-sm text-[color:var(--muted)]">รายการที่ถูกยืนยันและออกค่าใช้จ่ายแล้ว</div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {todayVisits.length ? (
                  todayVisits.map((visit) => (
                    <div key={visit.id} className="rounded-[1.25rem] border border-[rgba(179,213,228,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium text-[#f5fbff]">
                            {snapshot.patients.find((patient) => patient.id === visit.patientId)?.fullName ?? `Patient ${visit.patientId}`}
                          </div>
                          <div className="mt-1 text-xs text-[color:var(--muted)]">{visit.visitor}</div>
                        </div>
                        <Badge tone={visit.status === "done" ? "accent" : "warn"}>{visit.status}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--muted)]">
                        <span>Authen: {visit.authenCode ?? "—"}</span>
                        <span>·</span>
                        <span>ค่าบริการ {visit.serviceFee.toLocaleString()} บาท</span>
                        <span>·</span>
                        <span>เยี่ยมบ้าน {visit.homeVisitFee.toLocaleString()} บาท</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-[rgba(179,213,228,0.12)] p-5 text-sm text-[color:var(--muted)]">
                    ยังไม่มีรายการเยี่ยมในวันที่เลือก
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="grid gap-6">
          <section className="glass-panel rounded-[2rem] p-5 sm:p-6 xl:sticky xl:top-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="section-title text-2xl font-semibold">รายละเอียดผู้ป่วย</h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">แก้ข้อมูลติดต่อ, note และวันนัดได้จากแผงนี้</p>
              </div>
              <Badge tone={selectedDetail?.opioidEligible ? "warn" : "default"}>{selectedDetail?.opioidEligible ? "Opioid" : "Standard"}</Badge>
            </div>

            {selectedDetail ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-[1.5rem] border border-[rgba(179,213,228,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">{selectedDetail.clinicShortName}</div>
                  <div className="mt-2 text-2xl font-semibold text-[#f5fbff]">{selectedDetail.fullName}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[color:var(--muted)]">
                    <span>HN {selectedDetail.hn}</span>
                    <span>·</span>
                    <span>{selectedDetail.age} ปี</span>
                    <span>·</span>
                    <span>{selectedDetail.primaryDxCode}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone={selectedDetail.careStatus === "due" ? "warn" : selectedDetail.careStatus === "deceased" ? "danger" : "accent"}>
                      {statusLabel(selectedDetail.careStatus)}
                    </Badge>
                    <Badge>{selectedDetail.eligibleReason}</Badge>
                    {selectedDetail.acpRequired ? <Badge tone="accent">ต้องมี ACP</Badge> : null}
                  </div>
                </div>

                <div className="grid gap-3">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">เบอร์โทรเจ้าตัว</span>
                    <input
                      value={detailDraft.phone}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, phone: event.target.value }))}
                      className="w-full rounded-2xl border border-[rgba(179,213,228,0.14)] bg-[rgba(255,255,255,0.04)] px-4 py-3 outline-none focus:border-[rgba(107,226,211,0.42)]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">เบอร์ญาติ</span>
                    <input
                      value={detailDraft.relativePhone}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, relativePhone: event.target.value }))}
                      className="w-full rounded-2xl border border-[rgba(179,213,228,0.14)] bg-[rgba(255,255,255,0.04)] px-4 py-3 outline-none focus:border-[rgba(107,226,211,0.42)]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">LINE ID</span>
                    <input
                      value={detailDraft.lineId}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, lineId: event.target.value }))}
                      className="w-full rounded-2xl border border-[rgba(179,213,228,0.14)] bg-[rgba(255,255,255,0.04)] px-4 py-3 outline-none focus:border-[rgba(107,226,211,0.42)]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">Authen code</span>
                    <input
                      value={detailDraft.authenCode}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, authenCode: event.target.value }))}
                      className="w-full rounded-2xl border border-[rgba(179,213,228,0.14)] bg-[rgba(255,255,255,0.04)] px-4 py-3 outline-none focus:border-[rgba(107,226,211,0.42)]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">วันนัดถัดไป</span>
                    <input
                      type="date"
                      value={detailDraft.nextVisitAt}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, nextVisitAt: event.target.value }))}
                      className="w-full rounded-2xl border border-[rgba(179,213,228,0.14)] bg-[rgba(255,255,255,0.04)] px-4 py-3 outline-none focus:border-[rgba(107,226,211,0.42)]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">บันทึกเพิ่มเติม</span>
                    <textarea
                      value={detailDraft.notes}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, notes: event.target.value }))}
                      rows={5}
                      className="w-full rounded-2xl border border-[rgba(179,213,228,0.14)] bg-[rgba(255,255,255,0.04)] px-4 py-3 outline-none focus:border-[rgba(107,226,211,0.42)]"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDetail}
                    className="rounded-full bg-[#6be2d3] px-5 py-3 text-sm font-semibold text-[#052027] transition hover:-translate-y-0.5"
                  >
                    บันทึกข้อมูล
                  </button>
                  <button
                    type="button"
                    onClick={handleAddVisit}
                    className="rounded-full border border-[rgba(107,226,211,0.28)] bg-[rgba(107,226,211,0.12)] px-5 py-3 text-sm font-semibold text-[#dffcf8] transition hover:-translate-y-0.5"
                  >
                    เช็คว่าเยี่ยมแล้ว
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleDischarge("ครบช่วงการให้บริการ")}
                    className="rounded-2xl border border-[rgba(134,230,164,0.3)] bg-[rgba(134,230,164,0.1)] px-4 py-3 text-sm font-medium text-[#c4f6d1] transition hover:-translate-y-0.5"
                  >
                    จำหน่ายครบช่วง
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDischarge("เสียชีวิต")}
                    className="rounded-2xl border border-[rgba(241,142,151,0.3)] bg-[rgba(241,142,151,0.1)] px-4 py-3 text-sm font-medium text-[#f8c0c7] transition hover:-translate-y-0.5"
                  >
                    จำหน่ายกรณีเสียชีวิต
                  </button>
                </div>

                <div className="grid gap-3 border-t border-[rgba(179,213,228,0.08)] pt-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[color:var(--muted)]">ครั้งที่เยี่ยมแล้ว</span>
                    <span className="font-medium text-[#f5fbff]">{selectedDetail.serviceMonthCount} เดือน</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[color:var(--muted)]">เยี่ยมล่าสุด</span>
                    <span className="font-medium text-[#f5fbff]">{formatDate(selectedDetail.lastVisitAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[color:var(--muted)]">นัดถัดไป</span>
                    <span className="font-medium text-[#f5fbff]">{formatDate(selectedDetail.nextVisitAt)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-[rgba(179,213,228,0.12)] p-5 text-sm text-[color:var(--muted)]">
                ยังไม่มีผู้ป่วยในระบบ
              </div>
            )}
          </section>

          <section className="glass-panel rounded-[2rem] p-5 sm:p-6">
            <h2 className="section-title text-xl font-semibold">สรุปงานบริหาร</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: "จำหน่ายครบช่วง", value: summary.completedCount, tone: "accent" as const },
                { label: "เสียชีวิต", value: summary.deceasedCount, tone: "danger" as const },
                { label: "กลุ่ม opioid", value: summary.opioidProgramCount, tone: "warn" as const },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[1.25rem] border border-[rgba(179,213,228,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3"
                >
                  <span className="text-sm text-[#dbe7f1]">{item.label}</span>
                  <Badge tone={item.tone}>{item.value}</Badge>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
