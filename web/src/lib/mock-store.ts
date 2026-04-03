import { clinicRules } from "./clinic-rules";
import { describeEligibility, isOpioidEligibleCode, isPalliativeEligibleCode } from "./rules";
import type { DashboardSnapshot, DischargeReason, PalliativePatient, PalliativeVisit } from "./types";

const seedPatients: PalliativePatient[] = [
  {
    id: 1,
    hn: "0045123",
    cid: "1470100000001",
    fullName: "นางสาวศิริพร แสนดี",
    age: 67,
    sex: "F",
    clinicName: "รพ.สต. ห้วยหีบ",
    clinicShortName: "ห้วยหีบ",
    unitCode: "HUEY-01",
    primaryDxCode: "C349",
    primaryDxName: "Malignant neoplasm of bronchus or lung",
    careStatus: "due",
    eligibleReason: describeEligibility("C349"),
    opioidEligible: true,
    acpRequired: true,
    authenCode: "AUTH-260403-01",
    phone: "089-123-4567",
    relativePhone: "081-200-1100",
    lineId: "@siri.home",
    address: "12 ม. 3 ต. หนองแสง อ.เมือง",
    notes: "ต้องดูเรื่องอาการปวดและอุปกรณ์ oxygen ที่บ้าน",
    serviceMonthCount: 4,
    lastVisitAt: "2026-03-28",
    nextVisitAt: "2026-04-03",
    registeredAt: "2025-12-02",
  },
  {
    id: 2,
    hn: "0098302",
    cid: "1470100000002",
    fullName: "นายบุญมา ใจดี",
    age: 74,
    sex: "M",
    clinicName: "รพ.สต.ม่วงไข",
    clinicShortName: "ม่วงไข",
    unitCode: "MUANG-03",
    primaryDxCode: "I639",
    primaryDxName: "Stroke, not specified as haemorrhage or infarction",
    careStatus: "active",
    eligibleReason: describeEligibility("I639"),
    opioidEligible: false,
    acpRequired: true,
    phone: "098-333-2211",
    relativePhone: "080-777-2222",
    lineId: "@boonma_care",
    address: "44 ม. 1 ต. ม่วงไข",
    notes: "พบทานอาหารได้น้อย ต้องนัดประเมินซ้ำใน 7 วัน",
    serviceMonthCount: 2,
    lastVisitAt: "2026-04-01",
    nextVisitAt: "2026-04-07",
    registeredAt: "2026-01-11",
  },
  {
    id: 3,
    hn: "0071133",
    cid: "1470100000003",
    fullName: "นายคำปัน วงศ์คำ",
    age: 58,
    sex: "M",
    clinicName: "รพ.สต.โพนทองวัฒนา",
    clinicShortName: "โพนทองวัฒนา",
    unitCode: "PON-02",
    primaryDxCode: "N185",
    primaryDxName: "Chronic kidney disease, stage 5",
    careStatus: "active",
    eligibleReason: describeEligibility("N185"),
    opioidEligible: false,
    acpRequired: true,
    phone: "086-442-1155",
    relativePhone: "092-444-7000",
    lineId: "@kidney55",
    address: "8 ม. 10 ต. โพนทอง",
    notes: "รอติดตามเรื่องสูตรยากับญาติ",
    serviceMonthCount: 5,
    lastVisitAt: "2026-03-24",
    nextVisitAt: "2026-04-10",
    registeredAt: "2025-11-09",
  },
  {
    id: 4,
    hn: "0067721",
    cid: "1470100000004",
    fullName: "นางทองดี ศรีสุข",
    age: 81,
    sex: "F",
    clinicName: "รพ.สต.บ้านเหล่าโพนค้อ",
    clinicShortName: "บ้านเหล่าโพนค้อ",
    unitCode: "BPK-04",
    primaryDxCode: "J449",
    primaryDxName: "Chronic obstructive pulmonary disease, unspecified",
    careStatus: "completed",
    eligibleReason: describeEligibility("J449"),
    opioidEligible: false,
    acpRequired: false,
    phone: "087-333-3456",
    relativePhone: "089-900-9911",
    lineId: "@tongdee",
    address: "21 ม. 2 ต. เหล่าโพนค้อ",
    notes: "จำหน่ายครบช่วงบริการแล้ว",
    serviceMonthCount: 6,
    lastVisitAt: "2026-03-20",
    registeredAt: "2025-09-18",
    dischargedAt: "2026-03-22",
    dischargeReason: "ครบช่วงการให้บริการ",
  },
  {
    id: 5,
    hn: "0012409",
    cid: "1470100000005",
    fullName: "นายประสิทธิ์ รอดชีพ",
    age: 63,
    sex: "M",
    clinicName: "รพ.สต.โคกนาดี",
    clinicShortName: "โคกนาดี",
    unitCode: "KDN-04",
    primaryDxCode: "K729",
    primaryDxName: "Hepatic failure, unspecified",
    careStatus: "deceased",
    eligibleReason: describeEligibility("K729"),
    opioidEligible: true,
    acpRequired: true,
    phone: "096-611-8899",
    relativePhone: "091-900-4455",
    lineId: "@prasith-home",
    address: "15 ม. 4 ต. โคกนาดี",
    notes: "เสียชีวิตและรอเคลียร์เอกสารค่าบริการย้อนหลัง",
    serviceMonthCount: 3,
    lastVisitAt: "2026-03-31",
    registeredAt: "2025-12-28",
    dischargedAt: "2026-04-02",
    dischargeReason: "เสียชีวิต",
  },
  {
    id: 6,
    hn: "0018991",
    cid: "1470100000006",
    fullName: "เด็กหญิงปลายฟ้า เกื้อกูล",
    age: 9,
    sex: "F",
    clinicName: "รพ.สต. ห้วยหีบ",
    clinicShortName: "ห้วยหีบ",
    unitCode: "HUEY-02",
    primaryDxCode: "Q249",
    primaryDxName: "Congenital malformation of heart, unspecified",
    careStatus: "due",
    eligibleReason: "เด็กที่ต้องติดตาม palliative + ACP",
    opioidEligible: false,
    acpRequired: true,
    phone: "091-333-8890",
    relativePhone: "081-555-1212",
    lineId: "@plai_fah",
    address: "77 ม. 17 ต. หนองแสง",
    notes: "เตรียมเอกสารผู้ปกครองและทบทวน ACP",
    serviceMonthCount: 1,
    lastVisitAt: "2026-03-30",
    nextVisitAt: "2026-04-03",
    registeredAt: "2026-02-12",
  },
  {
    id: 7,
    hn: "0055310",
    cid: "1470100000007",
    fullName: "นางขนิษฐา ใจเพชร",
    age: 72,
    sex: "F",
    clinicName: "รพ.สต.โคกนาดี",
    clinicShortName: "โคกนาดี",
    unitCode: "KDN-05",
    primaryDxCode: "C509",
    primaryDxName: "Malignant neoplasm of breast, unspecified",
    careStatus: "active",
    eligibleReason: describeEligibility("C509"),
    opioidEligible: true,
    acpRequired: true,
    phone: "084-889-2211",
    relativePhone: "089-111-9000",
    lineId: "@khanittha",
    address: "13 ม. 9 ต. โคกนาดี",
    notes: "มีคำสั่งเบิกยากลุ่มอนุพันธ์ฝิ่นอยู่",
    serviceMonthCount: 5,
    lastVisitAt: "2026-03-26",
    nextVisitAt: "2026-04-05",
    registeredAt: "2025-10-05",
  },
];

const seedVisits: PalliativeVisit[] = [
  {
    id: 1,
    patientId: 1,
    visitDate: "2026-03-05",
    visitor: "ทีมเยี่ยมบ้าน รพ.สต. ห้วยหีบ",
    authenCode: "AUTH-260305-01",
    serviceFee: 1000,
    homeVisitFee: 300,
    status: "done",
    note: "อาการปวดดีขึ้นหลังปรับยา",
  },
  {
    id: 2,
    patientId: 1,
    visitDate: "2026-03-28",
    visitor: "ทีมเยี่ยมบ้าน รพ.สต. ห้วยหีบ",
    authenCode: "AUTH-260328-01",
    serviceFee: 1000,
    homeVisitFee: 300,
    status: "done",
    note: "แนะนำญาติเรื่องสัญญาณอันตราย",
  },
  {
    id: 3,
    patientId: 3,
    visitDate: "2026-03-24",
    visitor: "ทีมเยี่ยมบ้าน รพ.สต.โพนทองวัฒนา",
    authenCode: "AUTH-260324-02",
    serviceFee: 1000,
    homeVisitFee: 300,
    status: "done",
    note: "เตรียมแผนติดตามไตวายระยะสุดท้าย",
  },
  {
    id: 4,
    patientId: 5,
    visitDate: "2026-03-31",
    visitor: "ทีมเยี่ยมบ้าน รพ.สต.โคกนาดี",
    authenCode: "AUTH-260331-04",
    serviceFee: 1000,
    homeVisitFee: 300,
    status: "done",
    note: "เยี่ยมครั้งสุดท้ายก่อนเสียชีวิต",
  },
];

let nextPatientId = seedPatients.length + 1;
let nextVisitId = seedVisits.length + 1;

let patients: PalliativePatient[] = structuredClone(seedPatients);
let visits: PalliativeVisit[] = structuredClone(seedVisits);

function clone<T>(value: T): T {
  return structuredClone(value);
}

function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(value: string): string {
  return value.slice(0, 7);
}

function syncPatientStatus(patient: PalliativePatient): PalliativePatient {
  if (patient.careStatus === "completed" || patient.careStatus === "deceased") {
    return patient;
  }

  if (!patient.nextVisitAt) {
    return {
      ...patient,
      careStatus: "active",
    };
  }

  const key = todayKey();
  return {
    ...patient,
    careStatus: patient.nextVisitAt <= key ? "due" : "active",
  };
}

function buildSummary() {
  const currentMonth = monthKey(todayKey());
  const activePatients = patients.filter(
    (patient) => patient.careStatus === "active" || patient.careStatus === "due",
  );

  return {
    activeCount: activePatients.length,
    dueToday: patients.filter((patient) => patient.nextVisitAt === todayKey()).length,
    thisMonthVisits: visits.filter((visit) => monthKey(visit.visitDate) === currentMonth).length,
    completedCount: patients.filter((patient) => patient.careStatus === "completed").length,
    deceasedCount: patients.filter((patient) => patient.careStatus === "deceased").length,
    opioidProgramCount: patients.filter((patient) => patient.opioidEligible).length,
    acpCount: patients.filter((patient) => patient.acpRequired).length,
  };
}

export function getSnapshot(): DashboardSnapshot {
  patients = patients.map(syncPatientStatus);

  return {
    generatedAt: new Date().toISOString(),
    patients: clone(patients),
    visits: clone(visits),
    clinicRules: clone(clinicRules),
  };
}

export function getSummary() {
  return buildSummary();
}

export function upsertImportedPatients(
  importedPatients: Array<Partial<PalliativePatient> & { cid: string; hn: string; fullName: string }>,
) {
  const importedIds: number[] = [];

  for (const row of importedPatients) {
    const existing = patients.find((patient) => patient.hn === row.hn || patient.cid === row.cid);

    if (existing) {
      Object.assign(existing, {
        ...row,
        id: existing.id,
        notes: row.notes ?? existing.notes,
        lineId: row.lineId ?? existing.lineId,
        phone: row.phone ?? existing.phone,
        relativePhone: row.relativePhone ?? existing.relativePhone,
        careStatus:
          existing.careStatus === "completed" || existing.careStatus === "deceased"
            ? existing.careStatus
            : "active",
        primaryDxCode: row.primaryDxCode ?? existing.primaryDxCode,
        primaryDxName: row.primaryDxName ?? existing.primaryDxName,
        registeredAt: existing.registeredAt ?? todayKey(),
      });
      importedIds.push(existing.id);
      continue;
    }

    const nextPatient: PalliativePatient = {
      id: nextPatientId++,
      hn: row.hn,
      cid: row.cid,
      fullName: row.fullName,
      age: row.age ?? 0,
      sex: row.sex ?? "F",
      clinicName: row.clinicName ?? "ไม่ระบุ",
      clinicShortName: row.clinicShortName ?? "ไม่ระบุ",
      unitCode: row.unitCode ?? "HOS",
      primaryDxCode: row.primaryDxCode ?? "",
      primaryDxName: row.primaryDxName ?? "",
      careStatus: row.careStatus ?? "active",
      eligibleReason: row.eligibleReason ?? describeEligibility(row.primaryDxCode),
      opioidEligible: row.opioidEligible ?? isOpioidEligibleCode(row.primaryDxCode),
      acpRequired: row.acpRequired ?? isPalliativeEligibleCode(row.primaryDxCode),
      authenCode: row.authenCode,
      phone: row.phone,
      relativePhone: row.relativePhone,
      lineId: row.lineId,
      address: row.address,
      notes: row.notes ?? "",
      serviceMonthCount: row.serviceMonthCount ?? 0,
      lastVisitAt: row.lastVisitAt,
      nextVisitAt: row.nextVisitAt,
      registeredAt: row.registeredAt ?? todayKey(),
      dischargedAt: row.dischargedAt,
      dischargeReason: row.dischargeReason,
    };

    patients.push(nextPatient);
    importedIds.push(nextPatient.id);
  }

  return importedIds;
}

export function updatePatient(
  id: number,
  patch: Partial<
    Pick<
      PalliativePatient,
      | "phone"
      | "relativePhone"
      | "lineId"
      | "notes"
      | "nextVisitAt"
      | "authenCode"
      | "careStatus"
      | "serviceMonthCount"
    >
  >,
) {
  const patient = patients.find((item) => item.id === id);

  if (!patient) {
    throw new Error("Patient not found");
  }

  Object.assign(patient, patch);

  if (patch.nextVisitAt && patient.careStatus !== "completed" && patient.careStatus !== "deceased") {
    patient.careStatus = patch.nextVisitAt <= todayKey() ? "due" : "active";
  }

  return clone(patient);
}

export function addVisit(
  patientId: number,
  input: {
    visitDate: string;
    visitor: string;
    authenCode?: string;
    serviceFee?: number;
    homeVisitFee?: number;
    changeReason?: string;
    note?: string;
  },
) {
  const patient = patients.find((item) => item.id === patientId);

  if (!patient) {
    throw new Error("Patient not found");
  }

  const visit: PalliativeVisit = {
    id: nextVisitId++,
    patientId,
    visitDate: input.visitDate,
    visitor: input.visitor,
    authenCode: input.authenCode,
    serviceFee: input.serviceFee ?? 1000,
    homeVisitFee: input.homeVisitFee ?? 300,
    changeReason: input.changeReason,
    status: "done",
    note: input.note ?? "",
  };

  visits = [visit, ...visits];
  patient.lastVisitAt = input.visitDate;
  patient.serviceMonthCount += 1;
  patient.careStatus =
    patient.careStatus === "completed" || patient.careStatus === "deceased"
      ? patient.careStatus
      : "active";

  if (patient.serviceMonthCount >= 6 && patient.careStatus !== "deceased") {
    patient.careStatus = "completed";
  }

  return clone({ patient, visit });
}

export function dischargePatient(id: number, reason: DischargeReason) {
  const patient = patients.find((item) => item.id === id);

  if (!patient) {
    throw new Error("Patient not found");
  }

  patient.careStatus = reason === "เสียชีวิต" ? "deceased" : "completed";
  patient.dischargeReason = reason;
  patient.dischargedAt = todayKey();
  patient.nextVisitAt = undefined;

  return clone(patient);
}

export function importDemoCandidates(visitDate = todayKey()) {
  const candidates = seedPatients.filter(
    (patient) => patient.careStatus === "due" || patient.careStatus === "active",
  );

  return upsertImportedPatients(
    candidates.map((patient) => ({
      ...patient,
      nextVisitAt: patient.nextVisitAt ?? visitDate,
      careStatus: patient.nextVisitAt && patient.nextVisitAt <= visitDate ? "due" : "active",
    })),
  );
}
