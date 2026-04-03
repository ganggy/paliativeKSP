export type CareStatus = "active" | "due" | "paused" | "completed" | "deceased";

export type DischargeReason = "ครบช่วงการให้บริการ" | "เสียชีวิต";

export interface ClinicRule {
  clinicName: string;
  shortName: string;
  chwpart: string;
  amppart: string;
  tmbpartInclude: string[];
  moopartInclude?: string[];
  moopartExclude?: string[];
  excludeDeath?: boolean;
}

export interface PalliativePatient {
  id: number;
  hn: string;
  cid: string;
  fullName: string;
  age: number;
  sex: "M" | "F";
  clinicName: string;
  clinicShortName: string;
  unitCode: string;
  primaryDxCode: string;
  primaryDxName: string;
  careStatus: CareStatus;
  eligibleReason: string;
  opioidEligible: boolean;
  acpRequired: boolean;
  authenCode?: string;
  phone?: string;
  relativePhone?: string;
  lineId?: string;
  address?: string;
  notes: string;
  serviceMonthCount: number;
  lastVisitAt?: string;
  nextVisitAt?: string;
  registeredAt: string;
  dischargedAt?: string;
  dischargeReason?: DischargeReason;
}

export interface PalliativeVisit {
  id: number;
  patientId: number;
  visitDate: string;
  visitor: string;
  authenCode?: string;
  serviceFee: number;
  homeVisitFee: number;
  changeReason?: string;
  status: "done" | "planned" | "missed";
  note: string;
}

export interface DashboardSnapshot {
  generatedAt: string;
  patients: PalliativePatient[];
  visits: PalliativeVisit[];
  clinicRules: ClinicRule[];
}

export interface LegacyPalliativeRow {
  rowNo: number;
  lastVisitAt: string;
  hn: string;
  inscl?: string;
  pttypeName?: string;
  cid: string;
  fullName: string;
  birthday?: string;
  age?: number;
  address?: string;
  clinicName?: string;
  clinicId?: string;
  primaryDxCode?: string;
  dxFlag?: string;
  z515Flag?: string;
  z718Flag?: string;
  cancerFlag?: string;
  drugFlag?: string;
  z515Count: number;
  z718Count: number;
  homeVisitCount: number;
  eclaimCount: number;
  money: number;
  death: "Y" | "N";
  note: string;
}

export interface LegacyPalliativeReport {
  generatedAt: string;
  startDate: string;
  endDate: string;
  clinic: string;
  status: string;
  rows: LegacyPalliativeRow[];
}

export interface ActiveTreatmentRow {
  rowNo: number;
  lastVisitAt: string;
  hn: string;
  inscl?: string;
  pttypeName?: string;
  cid: string;
  fullName: string;
  birthday?: string;
  age?: number;
  address?: string;
  clinicName?: string;
  clinicId?: string;
  primaryDxCode?: string;
  diag?: string;
  oper?: string;
  listName?: string;
  z515Flag?: string;
  z718Flag?: string;
  dxFlag?: string;
  cancerFlag?: string;
  drugFlag?: string;
  eligibleReason?: string;
  matchedDxCode?: string;
  matchedDxDate?: string;
  homeVisitCount: number;
  eclaimCount: number;
  money: number;
  death: "Y" | "N";
  note: string;
}

export interface ActiveTreatmentReport {
  generatedAt: string;
  startDate: string;
  endDate: string;
  clinic: string;
  status: string;
  rows: ActiveTreatmentRow[];
}

export interface DashboardSummary {
  activeCount: number;
  dueToday: number;
  thisMonthVisits: number;
  completedCount: number;
  deceasedCount: number;
  opioidProgramCount: number;
  acpCount: number;
}

export interface HosCandidate {
  hn: string;
  cid: string;
  fullName: string;
  age: number;
  sex: "M" | "F";
  clinicName: string;
  clinicShortName: string;
  primaryDxCode: string;
  primaryDxName: string;
  pttype?: string;
  pttypeName?: string;
  phone?: string;
  relativePhone?: string;
  lineId?: string;
  address?: string;
  visitDate: string;
  lastServiceAt?: string;
  serviceCount: number;
  eligibleReason: string;
  opioidEligible: boolean;
  acpRequired: boolean;
}
