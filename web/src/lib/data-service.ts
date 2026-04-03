import {
  clinicRules,
  buildClinicWhereClause,
  buildCandidateByHnDxOnlySql,
  buildCandidateByHnSql,
  buildCandidateSql,
  buildImportSql,
} from "./clinic-rules";
import { getPool, isDbConfigured } from "./db";
import {
  addVisit,
  dischargePatient,
  getSnapshot,
  importDemoCandidates,
  upsertImportedPatients,
  updatePatient,
} from "./mock-store";
import { describeEligibility, isOpioidEligibleCode, isPalliativeEligibleCode } from "./rules";
import type {
  ActiveTreatmentReport,
  ActiveTreatmentRow,
  DashboardSnapshot,
  DischargeReason,
  HosCandidate,
  LegacyPalliativeReport,
  PalliativePatient,
  PalliativeVisit,
} from "./types";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sqlQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface HosCandidateRow {
  hn?: unknown;
  cid?: unknown;
  fullname?: unknown;
  age?: unknown;
  sex?: unknown;
  pdx?: unknown;
  TelNo?: unknown;
  full_address?: unknown;
}

interface HosSelectedCandidateRow extends HosCandidateRow {
  serviceCount?: unknown;
  lastServiceAt?: unknown;
  visitDate?: unknown;
  pttype?: unknown;
  pttype_name?: unknown;
  clinicName?: unknown;
  clinicShortName?: unknown;
}

async function loadFromPalliativeDb(): Promise<DashboardSnapshot> {
  const pool = getPool("palliative");
  const [patientRows] = await pool.query(
    `
SELECT id, hn, cid, full_name AS fullName, age, sex, clinic_name AS clinicName,
  clinic_short_name AS clinicShortName, unit_code AS unitCode, primary_dx_code AS primaryDxCode,
  primary_dx_name AS primaryDxName, care_status AS careStatus, eligible_reason AS eligibleReason,
  opioid_eligible AS opioidEligible, acp_required AS acpRequired, authen_code AS authenCode,
  phone, relative_phone AS relativePhone, line_id AS lineId, address, notes,
  service_month_count AS serviceMonthCount, last_visit_at AS lastVisitAt, next_visit_at AS nextVisitAt,
  registered_at AS registeredAt, discharged_at AS dischargedAt, discharge_reason AS dischargeReason
FROM paliative_registry
ORDER BY COALESCE(next_visit_at, registered_at) ASC, id DESC
    `,
  );

  const [visitRows] = await pool.query(
    `
SELECT id, patient_id AS patientId, visit_date AS visitDate, visitor, authen_code AS authenCode,
  service_fee AS serviceFee, home_visit_fee AS homeVisitFee, change_reason AS changeReason,
  status, note
FROM paliative_visits
ORDER BY visit_date DESC, id DESC
    `,
  );

  return {
    generatedAt: new Date().toISOString(),
    patients: patientRows as PalliativePatient[],
    visits: visitRows as PalliativeVisit[],
    clinicRules,
  };
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!isDbConfigured("palliative")) {
    return getSnapshot();
  }

  try {
    return await loadFromPalliativeDb();
  } catch {
    return getSnapshot();
  }
}

interface LegacyReportRow {
  lastVisitAt?: unknown;
  hn?: unknown;
  inscl?: unknown;
  pttypeName?: unknown;
  cid?: unknown;
  fullName?: unknown;
  birthday?: unknown;
  age?: unknown;
  address?: unknown;
  clinicName?: unknown;
  clinicId?: unknown;
  primaryDxCode?: unknown;
  dxFlag?: unknown;
  z515Flag?: unknown;
  z718Flag?: unknown;
  cancerFlag?: unknown;
  drugFlag?: unknown;
  z515Count?: unknown;
  z718Count?: unknown;
  homeVisitCount?: unknown;
  eclaimCount?: unknown;
  money?: unknown;
  death?: unknown;
  note?: unknown;
}

export async function getLegacyPalliativeReport(
  startDate = todayKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  endDate = todayKey(),
  clinic = "all",
  status = "99999",
  category = "all",
  ucOnly = false,
): Promise<LegacyPalliativeReport> {
  if (!isDbConfigured("hos")) {
    return {
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      clinic,
      status,
      rows: [],
    };
  }

  const hosPool = getPool("hos");
  const legacyStatusClause =
    status === "Y"
      ? "AND COALESCE(pt.death, 'N') = 'Y'"
      : status === "N"
        ? "AND COALESCE(pt.death, 'N') <> 'Y'"
        : "";
  const legacyClinicClause = clinic === "all" ? "" : `AND zn.rpst_id = ${sqlQuote(clinic)}`;
  const legacyCategoryClause =
    category === "Chronic"
      ? "z718Flag = 'Y' AND dxFlag = 'Y'"
      : category === "Opioid"
        ? "cancerFlag = 'Y' AND drugFlag = 'Y'"
        : "1=1";
  const legacyUcClause = ucOnly ? "inscl = 'UCS'" : "1=1";
  const [rows] = await hosPool.query(
    `
SELECT
  t.lastVisitAt,
  t.hn,
  t.pttypeName,
  t.cid,
  t.fullName,
  t.birthday,
  t.age,
  t.address,
  t.clinicName,
  t.clinicId,
  t.primaryDxCode,
  t.inscl,
  t.dxFlag,
  t.z515Flag,
  t.z718Flag,
  t.cancerFlag,
  t.drugFlag,
  t.z515Count,
  t.z718Count,
  t.homeVisitCount,
  t.eclaimCount,
  t.money,
  t.death,
  t.note
FROM (
  SELECT
    MAX(ov.vstdate) AS lastVisitAt,
    ov.hn,
    seekhipdata(ptt.hipdata_code, 1) AS inscl,
    seekname(ov.pttype, 'pttype') AS pttypeName,
    pt.cid,
    CONCAT(pt.pname, pt.fname, ' ', pt.lname) AS fullName,
    pt.birthday,
    TIMESTAMPDIFF(YEAR, pt.birthday, CURDATE()) AS age,
    CONCAT(pt.addrpart, ' หมู่ ', pt.moopart, ' ', th.full_name) AS address,
    zn.rpst_name AS clinicName,
    zn.rpst_id AS clinicId,
    SUBSTRING_INDEX(
      GROUP_CONCAT(DISTINCT COALESCE(vs.pdx, '') ORDER BY ov.vstdate DESC, ov.vn DESC),
      ',',
      1
    ) AS primaryDxCode,
    IF(
      SUM(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = ov.vn AND UPPER(REPLACE(di.icd10, '.', '')) = 'Z515') THEN 1 ELSE 0 END) > 0,
      'Y',
      NULL
    ) AS z515Flag,
    IF(
      SUM(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = ov.vn AND UPPER(REPLACE(di.icd10, '.', '')) = 'Z718') THEN 1 ELSE 0 END) > 0,
      'Y',
      NULL
    ) AS z718Flag,
    IF(
      SUM(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = ov.vn AND UPPER(REPLACE(di.icd10, '.', '')) REGEXP 'B2[0-4]|^C|D[0-4]|I5|I6|J44|K704|K717|K72|N185') THEN 1 ELSE 0 END) > 0,
      'Y',
      NULL
    ) AS dxFlag,
    IF(
      SUM(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = ov.vn AND UPPER(REPLACE(di.icd10, '.', '')) REGEXP '^C|D3[7-9]|D4') THEN 1 ELSE 0 END) > 0,
      'Y',
      NULL
    ) AS cancerFlag,
    IF(
      SUM(CASE WHEN EXISTS (
        SELECT 1
        FROM opitemrece oo
        INNER JOIN drugitems d ON d.icode = oo.icode
        WHERE oo.vn = ov.vn
          AND UPPER(COALESCE(d.nhso_adp_code, '')) REGEXP '^M'
      ) THEN 1 ELSE 0 END) > 0,
      'Y',
      NULL
    ) AS drugFlag,
    SUM(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = ov.vn AND UPPER(REPLACE(di.icd10, '.', '')) = 'Z515') THEN 1 ELSE 0 END) AS z515Count,
    SUM(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = ov.vn AND UPPER(REPLACE(di.icd10, '.', '')) = 'Z718') THEN 1 ELSE 0 END) AS z718Count,
    COUNT(DISTINCT oc.vn) AS homeVisitCount,
    COALESCE(MAX(ec.ecCount), 0) AS eclaimCount,
    COALESCE(MAX(rc.money), 0) AS money,
    IF(COALESCE(pt.death, 'N') = 'Y', 'Y', 'N') AS death,
    CASE
      WHEN COALESCE(pt.death, 'N') = 'Y' THEN 'เสียชีวิตแล้ว'
      WHEN DATEDIFF(NOW(), MAX(oc.entry_datetime)) < 30 THEN CONCAT('เยี่ยม ', DATEDIFF(NOW(), MAX(oc.entry_datetime)), ' วันที่แล้ว')
      WHEN DATEDIFF(NOW(), MAX(oc.entry_datetime)) < 60 THEN 'เยี่ยม 1 เดือนที่แล้ว'
      WHEN DATEDIFF(NOW(), MAX(oc.entry_datetime)) < 90 THEN 'เยี่ยม 2 เดือนที่แล้ว'
      WHEN DATEDIFF(NOW(), MAX(oc.entry_datetime)) < 120 THEN 'เยี่ยม 3 เดือนที่แล้ว'
      WHEN DATEDIFF(NOW(), MAX(oc.entry_datetime)) < 210 THEN 'เยี่ยม 6 เดือนที่แล้ว'
      WHEN DATEDIFF(NOW(), MAX(oc.entry_datetime)) < 420 THEN 'เยี่ยม 1 ปีที่แล้ว'
      ELSE 'เยี่ยมมากกว่า 1 ปี'
    END AS note
  FROM vn_stat ov
  LEFT JOIN patient pt ON pt.hn = ov.hn
  LEFT JOIN thaiaddress th ON th.addressid = CONCAT(pt.chwpart, pt.amppart, pt.tmbpart)
  LEFT JOIN zbm_rpst zr ON zr.chwpart = pt.chwpart AND zr.amppart = pt.amppart AND zr.tmbpart = pt.tmbpart AND zr.moopart = pt.moopart
  LEFT JOIN zbm_rpst_name zn ON zn.rpst_id = zr.rpst_id
  LEFT JOIN ovst_community_service oc ON oc.vn = ov.vn AND oc.ovst_community_service_type_id BETWEEN 1 AND 103
  LEFT JOIN pttype ptt ON ptt.pttype = ov.pttype
  LEFT JOIN vn_stat vs ON vs.vn = ov.vn
  LEFT JOIN (
    SELECT r.HN, COUNT(r.REP) AS ecCount
    FROM eclaimdb.m_registerdata r
    LEFT JOIN eclaimdb.m_ppcom p ON p.ECLAIM_NO = r.ECLAIM_NO
    WHERE NOT ISNULL(p.ECLAIM_NO)
      AND p.GR_ITEMNAME = '3 Palliative Care'
      AND NOT ISNULL(r.REP)
    GROUP BY r.HN
  ) ec ON ec.HN = ov.hn
  LEFT JOIN (
    SELECT s.HN, SUM(s.PallativeCare) AS money
    FROM rcmdb.repeclaim s
    WHERE s.PallativeCare > 0
    GROUP BY s.HN
  ) rc ON rc.HN = ov.hn
  WHERE ov.vstdate BETWEEN ? AND ?
    AND EXISTS (
      SELECT 1
      FROM ovstdiag di
      WHERE di.vn = ov.vn
        AND UPPER(REPLACE(di.icd10, '.', '')) REGEXP '^(B2[0-4]|C|D[0-4]|I5|I6|J44|K704|K717|K72|N185|Z515|Z718)'
    )
    ${legacyStatusClause}
    ${legacyClinicClause}
  GROUP BY ov.hn
  HAVING ${legacyCategoryClause}
    AND ${legacyUcClause}
) t
ORDER BY t.lastVisitAt DESC, t.hn DESC
    `,
    [startDate, endDate],
  );

  return {
    generatedAt: new Date().toISOString(),
    startDate,
    endDate,
    clinic,
    status,
    rows: (rows as LegacyReportRow[]).map((row, index) => ({
      rowNo: index + 1,
      lastVisitAt: asString(row.lastVisitAt) ?? "",
      hn: String(row.hn ?? ""),
      inscl: asString(row.inscl),
      pttypeName: asString(row.pttypeName),
      cid: String(row.cid ?? ""),
      fullName: String(row.fullName ?? ""),
      birthday: asString(row.birthday),
      age: Number.parseInt(String(row.age ?? "0"), 10) || 0,
      address: asString(row.address),
      clinicName: asString(row.clinicName),
      clinicId: asString(row.clinicId),
      primaryDxCode: asString(row.primaryDxCode),
      dxFlag: asString(row.dxFlag),
      z515Flag: asString(row.z515Flag),
      z718Flag: asString(row.z718Flag),
      cancerFlag: asString(row.cancerFlag),
      drugFlag: asString(row.drugFlag),
      z515Count: Number.parseInt(String(row.z515Count ?? "0"), 10) || 0,
      z718Count: Number.parseInt(String(row.z718Count ?? "0"), 10) || 0,
      homeVisitCount: Number.parseInt(String(row.homeVisitCount ?? "0"), 10) || 0,
      eclaimCount: Number.parseInt(String(row.eclaimCount ?? "0"), 10) || 0,
      money: Number.parseInt(String(row.money ?? "0"), 10) || 0,
      death: (String(row.death ?? "N") === "Y" ? "Y" : "N") as "Y" | "N",
      note: asString(row.note) ?? "",
    })),
  };
}

export async function getActiveTreatmentReport(
  startDate?: string,
  endDate?: string,
  clinic = "all",
  status = "99999",
  category = "all",
  ucOnly = false,
): Promise<ActiveTreatmentReport> {
  if (!isDbConfigured("hos")) {
    return {
      generatedAt: new Date().toISOString(),
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      clinic,
      status,
      rows: [],
    };
  }

  const pool = getPool("hos");
  const statusClause =
    status === "Y"
      ? "AND COALESCE(pt.death, 'N') = 'Y'"
      : status === "N"
        ? "AND COALESCE(pt.death, 'N') <> 'Y'"
        : "";
  const clinicClause = clinic === "all" ? "" : `AND h.clinicId = ${sqlQuote(clinic)}`;
  const categoryClause =
    category === "Chronic"
      ? "COALESCE(z718Flag, 'N') = 'Y' AND COALESCE(dxFlag, 'N') = 'Y'"
      : category === "Opioid"
        ? "COALESCE(cancerFlag, 'N') = 'Y' AND COALESCE(drugFlag, 'N') = 'Y'"
        : "1 = 1";
  const ucClause = ucOnly ? "COALESCE(inscl, '') = 'UCS'" : "1 = 1";
  const [rows] = await pool.query(
    `
SELECT
  h.lastVisitAt,
  h.hn,
  h.inscl,
  h.pttypeName,
  h.cid,
  h.fullName,
  h.birthday,
  h.age,
  h.address,
  h.clinicName,
  h.clinicId,
  h.primaryDxCode,
  h.diag,
  h.oper,
  h.listName,
  h.z515Flag,
  h.z718Flag,
  h.dxFlag,
  h.cancerFlag,
  h.drugFlag,
  h.homeVisitCount,
  COALESCE(h.eclaimCount, 0) AS eclaimCount,
  COALESCE(h.money, 0) AS money,
  h.death,
  CASE
    WHEN h.death = 'Y' THEN 'เสียชีวิตแล้ว'
    WHEN h.homeVisitCount > 0 THEN 'ยังมีชีวิตอยู่'
    ELSE 'ยังมีชีวิตอยู่'
  END AS note
FROM (
  SELECT
    DATE(MAX(COALESCE(oc.entry_datetime, o.vstdate))) AS lastVisitAt,
    o.hn,
    MAX(seekhipdata(ptt.hipdata_code, 1)) AS inscl,
    MAX(seekname(o.pttype, 'pttype')) AS pttypeName,
    pt.cid,
    MAX(CONCAT(pt.pname, pt.fname, ' ', pt.lname)) AS fullName,
    MAX(pt.birthday) AS birthday,
    MAX(TIMESTAMPDIFF(YEAR, pt.birthday, CURDATE())) AS age,
    MAX(CONCAT(pt.addrpart, ' หมู่ ', pt.moopart, ' ', COALESCE(zn.rpst_name, znv.rpst_name, ''))) AS address,
    SUBSTRING_INDEX(
      GROUP_CONCAT(DISTINCT NULLIF(COALESCE(zn.rpst_name, znv.rpst_name, ''), '') ORDER BY o.vstdate DESC, o.vn DESC),
      ',',
      1
    ) AS clinicName,
    SUBSTRING_INDEX(
      GROUP_CONCAT(DISTINCT NULLIF(COALESCE(zn.rpst_id, znv.rpst_id, ''), '') ORDER BY o.vstdate DESC, o.vn DESC),
      ',',
      1
    ) AS clinicId,
    SUBSTRING_INDEX(
      GROUP_CONCAT(DISTINCT COALESCE(vs.pdx, '') ORDER BY o.vstdate DESC, o.vn DESC),
      ',',
      1
    ) AS primaryDxCode,
    CONCAT_WS(',', MAX(vs.pdx), MAX(vs.dx0), MAX(vs.dx1), MAX(vs.dx2), MAX(vs.dx3), MAX(vs.dx4), MAX(vs.dx5)) AS diag,
    CONCAT_WS(',', MAX(vs.op0), MAX(vs.op1), MAX(vs.op2), MAX(vs.op3), MAX(vs.op4), MAX(vs.op5)) AS oper,
    GROUP_CONCAT(DISTINCT CONCAT_WS(' ', d.name, d.strength) ORDER BY d.name SEPARATOR ', ') AS listName,
    MAX(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = o.vn AND UPPER(REPLACE(di.icd10, '.', '')) = 'Z515') THEN 'Y' END) AS z515Flag,
    MAX(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = o.vn AND UPPER(REPLACE(di.icd10, '.', '')) = 'Z718') THEN 'Y' END) AS z718Flag,
    MAX(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = o.vn AND UPPER(REPLACE(di.icd10, '.', '')) REGEXP '^(B2[0-4]|C|D[0-4]|I5|I6|J44|K704|K717|K72|N185|Z515|Z718)') THEN 'Y' END) AS dxFlag,
    MAX(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = o.vn AND UPPER(REPLACE(di.icd10, '.', '')) REGEXP '^(C|D3[7-9]|D4)') THEN 'Y' END) AS cancerFlag,
    MAX(CASE WHEN EXISTS (
      SELECT 1
      FROM opitemrece oo2
      INNER JOIN drugitems d2 ON d2.icode = oo2.icode
      WHERE oo2.vn = o.vn
        AND UPPER(COALESCE(d2.nhso_adp_code, '')) REGEXP '^M'
    ) THEN 'Y' END) AS drugFlag,
    COUNT(DISTINCT oc.vn) AS homeVisitCount,
    COALESCE(MAX(ec.ecCount), 0) AS eclaimCount,
    COALESCE(MAX(rc.money), 0) AS money,
    IF(COALESCE(pt.death, 'N') = 'Y', 'Y', 'N') AS death
  FROM ovst o
  LEFT JOIN vn_stat vs ON vs.vn = o.vn
  LEFT JOIN patient pt ON pt.hn = o.hn
  LEFT JOIN pttype ptt ON ptt.pttype = o.pttype
  LEFT JOIN thaiaddress th ON th.addressid = CONCAT(pt.chwpart, pt.amppart, pt.tmbpart)
  LEFT JOIN zbm_rpst zr ON zr.chwpart = pt.chwpart AND zr.amppart = pt.amppart AND zr.tmbpart = pt.tmbpart AND zr.moopart = pt.moopart
  LEFT JOIN zbm_rpst_name zn ON zn.rpst_id = zr.rpst_id
  LEFT JOIN thaiaddress va ON va.addressid = vs.aid
  LEFT JOIN zbm_rpst zrv ON zrv.chwpart = COALESCE(va.chwpart, pt.chwpart) AND zrv.amppart = COALESCE(va.amppart, pt.amppart) AND zrv.tmbpart = COALESCE(va.tmbpart, pt.tmbpart) AND zrv.moopart = pt.moopart
  LEFT JOIN zbm_rpst_name znv ON znv.rpst_id = zrv.rpst_id
  LEFT JOIN ovst_community_service oc ON oc.vn = o.vn AND oc.ovst_community_service_type_id BETWEEN 1 AND 103
  LEFT JOIN opitemrece oo ON oo.vn = o.vn
  LEFT JOIN drugitems d ON d.icode = oo.icode
  LEFT JOIN (
    SELECT r.HN, COUNT(r.REP) AS ecCount
    FROM eclaimdb.m_registerdata r
    LEFT JOIN eclaimdb.m_ppcom p ON p.ECLAIM_NO = r.ECLAIM_NO
    WHERE NOT ISNULL(p.ECLAIM_NO)
      AND p.GR_ITEMNAME = '3 Palliative Care'
      AND NOT ISNULL(r.REP)
    GROUP BY r.HN
  ) ec ON ec.HN = o.hn
  LEFT JOIN (
    SELECT s.HN, SUM(s.PallativeCare) AS money
    FROM rcmdb.repeclaim s
    WHERE s.PallativeCare > 0
    GROUP BY s.HN
  ) rc ON rc.HN = o.hn
  WHERE o.ovstist = '17'
    ${statusClause}
  GROUP BY o.hn
) h
WHERE ${clinicClause ? clinicClause.replace(/^AND\s+/, "") : "1 = 1"}
  AND ${categoryClause}
  AND ${ucClause}
ORDER BY COALESCE(h.lastVisitAt, h.hn) DESC, h.hn DESC
    `,
    [],
  );

  return {
    generatedAt: new Date().toISOString(),
    startDate: startDate ?? "",
    endDate: endDate ?? "",
    clinic,
    status,
    rows: (rows as ActiveTreatmentRow[]).map((row, index) => ({
      rowNo: index + 1,
      lastVisitAt: asString(row.lastVisitAt) ?? "",
      hn: String(row.hn ?? ""),
      inscl: asString(row.inscl),
      pttypeName: asString(row.pttypeName),
      cid: String(row.cid ?? ""),
      fullName: String(row.fullName ?? ""),
      birthday: undefined,
      age: Number.parseInt(String(row.age ?? "0"), 10) || 0,
      address: asString(row.address),
      clinicName: asString(row.clinicName),
      clinicId: undefined,
      primaryDxCode: asString(row.primaryDxCode),
      diag: asString(row.diag),
      oper: asString(row.oper),
      listName: asString(row.listName),
      z515Flag: asString(row.z515Flag),
      z718Flag: asString(row.z718Flag),
      dxFlag: asString(row.dxFlag),
      cancerFlag: asString(row.cancerFlag),
      drugFlag: asString(row.drugFlag),
      homeVisitCount: Number.parseInt(String(row.homeVisitCount ?? "0"), 10) || 0,
      eclaimCount: Number.parseInt(String(row.eclaimCount ?? "0"), 10) || 0,
      money: Number.parseInt(String(row.money ?? "0"), 10) || 0,
      death: (String(row.death ?? "N") === "Y" ? "Y" : "N") as "Y" | "N",
      note: asString(row.note) ?? "",
    })),
  };
}

export async function getHospitalAreaReport(
  startDate?: string,
  endDate?: string,
  clinic = "all",
  status = "99999",
  category = "all",
  ucOnly = false,
): Promise<ActiveTreatmentReport> {
  if (!isDbConfigured("hos")) {
    return {
      generatedAt: new Date().toISOString(),
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      clinic,
      status,
      rows: [],
    };
  }

  const hosPool = getPool("hos");
  const visitDate = endDate ?? startDate ?? todayKey();
  const hasDateFilter = Boolean(startDate || endDate);
  const statusClause =
    status === "Y"
      ? "AND COALESCE(pt.death, 'N') = 'Y'"
      : status === "N"
        ? "AND COALESCE(pt.death, 'N') <> 'Y'"
        : "";
  const categoryClause =
    category === "Chronic"
      ? "COALESCE(z718Flag, 'N') = 'Y' AND COALESCE(dxFlag, 'N') = 'Y'"
      : category === "Opioid"
        ? "COALESCE(cancerFlag, 'N') = 'Y' AND COALESCE(drugFlag, 'N') = 'Y'"
        : "1 = 1";
  const ucClause = ucOnly ? "COALESCE(inscl, '') = 'UCS'" : "1 = 1";
  const rules = clinic === "all" ? clinicRules : clinicRules.filter((rule) => rule.shortName === clinic);
  const rows: ActiveTreatmentRow[] = [];

  if (rules.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      clinic,
      status,
      rows,
    };
  }

  const escapeSql = (value: string) => value.replaceAll("'", "''");
  const dateClause = hasDateFilter ? "AND o.vstdate = ?" : "";
  const queryParams = hasDateFilter ? [visitDate] : [];
  const clinicWhereClause = rules.map((rule) => `(${buildClinicWhereClause(rule, "pt", "td", "pt")})`).join(" OR ");
  const clinicNameCase = rules
    .map((rule) => `WHEN ${buildClinicWhereClause(rule, "pt", "td", "pt")} THEN '${escapeSql(rule.clinicName)}'`)
    .join(" ");
  const clinicIdCase = rules
    .map((rule) => `WHEN ${buildClinicWhereClause(rule, "pt", "td", "pt")} THEN '${escapeSql(rule.shortName)}'`)
    .join(" ");

  const [resultRows] = await hosPool.query(
    `
SELECT
  DATE(MAX(o.vstdate)) AS lastVisitAt,
  o.hn,
  MAX(seekhipdata(ptt.hipdata_code, 1)) AS inscl,
  MAX(seekname(o.pttype, 'pttype')) AS pttypeName,
  MAX(pt.cid) AS cid,
  MAX(CONCAT(pt.pname, pt.fname, ' ', pt.lname)) AS fullName,
  MAX(TIMESTAMPDIFF(YEAR, pt.birthday, o.vstdate)) AS age,
  MAX(CONCAT(pt.addrpart, ' หมู่ ', pt.moopart, ' ต. ', COALESCE(td.name, t3.name, ''))) AS address,
  CASE ${clinicNameCase} END AS clinicName,
  CASE ${clinicIdCase} END AS clinicId,
  SUBSTRING_INDEX(
    GROUP_CONCAT(DISTINCT COALESCE(vs.pdx, '') ORDER BY o.vstdate DESC, o.vn DESC),
    ',',
    1
  ) AS primaryDxCode,
  CONCAT_WS(',', MAX(vs.pdx), MAX(vs.dx0), MAX(vs.dx1), MAX(vs.dx2), MAX(vs.dx3), MAX(vs.dx4), MAX(vs.dx5)) AS diag,
  CONCAT_WS(',', MAX(vs.op0), MAX(vs.op1), MAX(vs.op2), MAX(vs.op3), MAX(vs.op4), MAX(vs.op5)) AS oper,
  GROUP_CONCAT(DISTINCT CONCAT_WS(' ', s.name, s.strength, s.units) ORDER BY s.name SEPARATOR ', ') AS listName,
  dxmatch.matchedDxCode AS matchedDxCode,
  dxmatch.matchedDxDate AS matchedDxDate,
  MAX(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = o.vn AND UPPER(REPLACE(di.icd10, '.', '')) = 'Z515') THEN 'Y' END) AS z515Flag,
  MAX(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = o.vn AND UPPER(REPLACE(di.icd10, '.', '')) = 'Z718') THEN 'Y' END) AS z718Flag,
  MAX(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = o.vn AND UPPER(REPLACE(di.icd10, '.', '')) REGEXP '^(B2[0-4]|C|D[0-4]|I5|I6|J44|K704|K717|K72|N185|Z515|Z718)') THEN 'Y' END) AS dxFlag,
  MAX(CASE WHEN EXISTS (SELECT 1 FROM ovstdiag di WHERE di.vn = o.vn AND UPPER(REPLACE(di.icd10, '.', '')) REGEXP '^(C|D3[7-9]|D4)') THEN 'Y' END) AS cancerFlag,
  MAX(CASE WHEN EXISTS (
    SELECT 1
    FROM opitemrece oo2
    INNER JOIN drugitems d2 ON d2.icode = oo2.icode
    WHERE oo2.vn = o.vn
      AND UPPER(COALESCE(d2.nhso_adp_code, '')) REGEXP '^M'
  ) THEN 'Y' END) AS drugFlag,
  COUNT(DISTINCT o.vn) AS homeVisitCount,
  0 AS eclaimCount,
  COALESCE(SUM(op.sum_price), 0) AS money,
  IF(COALESCE(pt.death, 'N') = 'Y', 'Y', 'N') AS death
FROM ovst o
LEFT JOIN vn_stat vs ON vs.vn = o.vn
LEFT JOIN patient pt ON pt.hn = o.hn
LEFT JOIN pttype ptt ON ptt.pttype = o.pttype
LEFT JOIN thaiaddress td ON td.addressid = vs.aid
LEFT JOIN thaiaddress t3 ON t3.chwpart = pt.chwpart AND t3.amppart = pt.amppart AND t3.tmbpart = pt.tmbpart
LEFT JOIN opitemrece op ON op.vn = o.vn
LEFT JOIN s_drugitems s ON s.icode = op.icode
LEFT JOIN (
  SELECT
    o2.hn,
    MIN(o2.vstdate) AS matchedDxDate,
    SUBSTRING_INDEX(
      GROUP_CONCAT(
        DISTINCT UPPER(REPLACE(di.icd10, '.', ''))
        ORDER BY o2.vstdate ASC, o2.vn ASC
        SEPARATOR ','
      ),
      ',',
      1
    ) AS matchedDxCode
  FROM ovst o2
  INNER JOIN ovstdiag di ON di.vn = o2.vn
  WHERE UPPER(REPLACE(di.icd10, '.', '')) REGEXP '^(B2[0-4]|C|D[0-4]|I5|I6|J44|K704|K717|K72|N185|Z515|Z718)'
  GROUP BY o2.hn
) dxmatch ON dxmatch.hn = o.hn
WHERE 1 = 1
  ${dateClause}
  AND o.ovstist = '17'
  AND op.icode LIKE '1%'
  ${statusClause}
  AND (${clinicWhereClause})
GROUP BY o.hn
HAVING ${categoryClause}
   AND ${ucClause}
ORDER BY o.vstdate DESC, o.vn DESC
    `,
    queryParams,
  );

  for (const row of resultRows as ActiveTreatmentRow[]) {
    rows.push({
      rowNo: rows.length + 1,
      lastVisitAt: asString(row.lastVisitAt) ?? visitDate,
      hn: String(row.hn ?? ""),
      inscl: asString(row.inscl),
      pttypeName: asString(row.pttypeName),
      cid: String(row.cid ?? ""),
      fullName: String(row.fullName ?? ""),
      birthday: undefined,
      age: Number.parseInt(String(row.age ?? "0"), 10) || 0,
      address: asString(row.address),
      clinicName: asString(row.clinicName),
      clinicId: asString(row.clinicId),
      primaryDxCode: asString(row.primaryDxCode),
      diag: asString(row.diag),
      oper: asString(row.oper),
      listName: asString(row.listName),
      eligibleReason: describeEligibility(asString(row.matchedDxCode) ?? asString(row.primaryDxCode)),
      matchedDxCode: asString(row.matchedDxCode),
      matchedDxDate: asString(row.matchedDxDate),
      z515Flag: asString(row.z515Flag),
      z718Flag: asString(row.z718Flag),
      dxFlag: asString(row.dxFlag),
      cancerFlag: asString(row.cancerFlag),
      drugFlag: asString(row.drugFlag),
      homeVisitCount: Number.parseInt(String(row.homeVisitCount ?? "0"), 10) || 0,
      eclaimCount: Number.parseInt(String(row.eclaimCount ?? "0"), 10) || 0,
      money: Number.parseInt(String(row.money ?? "0"), 10) || 0,
      death: (String(row.death ?? "N") === "Y" ? "Y" : "N") as "Y" | "N",
      note: "คนไข้ในเขตรับผิดชอบ",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    startDate: startDate ?? "",
    endDate: endDate ?? "",
    clinic,
    status,
    rows,
  };
}

export async function syncHosCandidates(visitDate = todayKey()) {
  const key = visitDate ?? todayKey();
  if (!isDbConfigured("hos") || !isDbConfigured("palliative")) {
    return {
      imported: importDemoCandidates(key).length,
      source: "demo",
    };
  }

  const hosPool = getPool("hos");
  const palliativePool = getPool("palliative");
  const importedCandidates: Partial<PalliativePatient>[] = [];

  for (const rule of clinicRules) {
    const [rows] = await hosPool.query(
      buildImportSql(rule, ":visitDate").replaceAll(":visitDate", "?"),
      [key],
    );

    for (const row of rows as HosCandidateRow[]) {
      importedCandidates.push({
        hn: String(row.hn ?? ""),
        cid: String(row.cid ?? ""),
        fullName: String(row.fullname ?? ""),
        age: Number.parseInt(String(row.age ?? "0"), 10) || 0,
        sex: row.sex === "M" ? "M" : "F",
        clinicName: rule.clinicName,
        clinicShortName: rule.shortName,
        unitCode: `${rule.shortName}-${String(row.hn ?? "").slice(-2)}`,
        primaryDxCode: String(row.pdx ?? ""),
        primaryDxName: String(row.pdx ?? ""),
        careStatus: "active",
        eligibleReason: describeEligibility(String(row.pdx ?? "")),
        opioidEligible: isOpioidEligibleCode(String(row.pdx ?? "")),
        acpRequired: isPalliativeEligibleCode(String(row.pdx ?? "")),
        phone: asString(row.TelNo),
        address: asString(row.full_address),
        notes: "ซิงก์จาก HOSXP อัตโนมัติ",
        serviceMonthCount: 0,
        registeredAt: key,
        nextVisitAt: key,
      });
    }
  }

  if (importedCandidates.length === 0) {
    return {
      imported: 0,
      source: "hos",
    };
  }

  const importedIds = upsertImportedPatients(
    importedCandidates.map((item) => ({
      hn: item.hn ?? "",
      cid: item.cid ?? "",
      fullName: item.fullName ?? "",
      age: item.age,
      sex: item.sex as "M" | "F",
      clinicName: item.clinicName,
      clinicShortName: item.clinicShortName,
      unitCode: item.unitCode,
      primaryDxCode: item.primaryDxCode,
      primaryDxName: item.primaryDxName,
      careStatus: item.careStatus as PalliativePatient["careStatus"],
      eligibleReason: item.eligibleReason,
      opioidEligible: item.opioidEligible,
      acpRequired: item.acpRequired,
      phone: item.phone,
      address: item.address,
      notes: item.notes,
      serviceMonthCount: item.serviceMonthCount,
      registeredAt: item.registeredAt,
      nextVisitAt: item.nextVisitAt,
    })),
  );

  if (importedIds.length) {
    await palliativePool.query(
      `
INSERT INTO paliative_sync_log (synced_at, visit_date, imported_count, source)
VALUES (NOW(), ?, ?, 'hos')
      `,
      [key, importedIds.length],
    );
  }

  return {
    imported: importedIds.length,
    source: "hos",
  };
}

export async function getHosCandidates(
  visitDate = todayKey(),
  clinicShortName = "all",
  searchTerm = "",
): Promise<HosCandidate[]> {
  if (!isDbConfigured("hos")) {
    return [];
  }

  const hosPool = getPool("hos");
  const rules = clinicShortName === "all" ? clinicRules : clinicRules.filter((rule) => rule.shortName === clinicShortName);
  const candidates: HosCandidate[] = [];
  const keyword = searchTerm.trim().toLowerCase();

  for (const rule of rules) {
    const [rows] = await hosPool.query(buildCandidateSql(rule, "?"), [visitDate, visitDate]);

    for (const row of rows as HosSelectedCandidateRow[]) {
      const primaryDxCode = String(row.pdx ?? "");
      const candidate: HosCandidate = {
        hn: String(row.hn ?? ""),
        cid: String(row.cid ?? ""),
        fullName: String(row.fullname ?? ""),
        age: Number.parseInt(String(row.age ?? "0"), 10) || 0,
        sex: row.sex === "M" ? "M" : "F",
        clinicName: String(row.clinicName ?? rule.clinicName),
        clinicShortName: String(row.clinicShortName ?? rule.shortName),
        primaryDxCode,
        primaryDxName: String(row.pdx ?? ""),
        phone: asString(row.TelNo),
        address: asString(row.full_address),
        visitDate,
        lastServiceAt: asString(row.lastServiceAt),
        serviceCount: Number.parseInt(String(row.serviceCount ?? "0"), 10) || 0,
        eligibleReason: describeEligibility(primaryDxCode),
        opioidEligible: isOpioidEligibleCode(primaryDxCode),
        acpRequired: isPalliativeEligibleCode(primaryDxCode),
      };

      if (keyword) {
        const haystack = [
          candidate.hn,
          candidate.cid,
          candidate.fullName,
          candidate.primaryDxCode,
          candidate.clinicShortName,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(keyword)) {
          continue;
        }
      }

      candidates.push(candidate);
    }
  }

  return candidates;
}

export async function findHosCandidateByHn(
  hn: string,
  clinicShortName = "all",
): Promise<HosCandidate | null> {
  if (!isDbConfigured("hos")) {
    return null;
  }

  const hosPool = getPool("hos");
  const rules = clinicShortName === "all" ? clinicRules : clinicRules.filter((rule) => rule.shortName === clinicShortName);
  const hnKey = hn.trim();

  for (const rule of rules) {
    const [rows] = await hosPool.query(buildCandidateByHnSql(rule, "?"), [hnKey]);
    const first = (rows as HosSelectedCandidateRow[])[0];

    if (!first) {
      continue;
    }

    const primaryDxCode = String(first.pdx ?? "");
    return {
      hn: String(first.hn ?? ""),
      cid: String(first.cid ?? ""),
      fullName: String(first.fullname ?? ""),
      age: Number.parseInt(String(first.age ?? "0"), 10) || 0,
      sex: first.sex === "M" ? "M" : "F",
      clinicName: String(first.clinicName ?? rule.clinicName),
      clinicShortName: String(first.clinicShortName ?? rule.shortName),
      primaryDxCode,
      primaryDxName: String(first.pdx ?? ""),
      phone: asString(first.TelNo),
      address: asString(first.full_address),
      visitDate: asString(first.visitDate) ?? todayKey(),
      lastServiceAt: asString(first.lastServiceAt),
      serviceCount: Number.parseInt(String(first.serviceCount ?? "0"), 10) || 0,
      eligibleReason: describeEligibility(primaryDxCode),
      opioidEligible: isOpioidEligibleCode(primaryDxCode),
      acpRequired: isPalliativeEligibleCode(primaryDxCode),
    };
  }

  return null;
}

export async function findHosCandidateByHnAnyArea(hn: string): Promise<HosCandidate | null> {
  if (!isDbConfigured("hos")) {
    return null;
  }

  const hosPool = getPool("hos");
  const hnKey = hn.trim();
  const [rows] = await hosPool.query(buildCandidateByHnDxOnlySql("?"), [hnKey, hnKey, hnKey]);
  const first = (rows as HosSelectedCandidateRow[])[0];

  if (!first) {
    return null;
  }

  const primaryDxCode = String(first.pdx ?? "");
  return {
    hn: String(first.hn ?? ""),
    cid: String(first.cid ?? ""),
    fullName: String(first.fullname ?? ""),
    age: Number.parseInt(String(first.age ?? "0"), 10) || 0,
    sex: first.sex === "M" ? "M" : "F",
    clinicName: String(first.clinicName ?? "ไม่ระบุ"),
    clinicShortName: String(first.clinicShortName ?? "ไม่ระบุ"),
    primaryDxCode,
    primaryDxName: String(first.pdx ?? ""),
    pttype: asString(first.pttype),
    pttypeName: asString(first.pttype_name),
    phone: asString(first.TelNo),
    address: asString(first.full_address),
    visitDate: asString(first.visitDate) ?? todayKey(),
    lastServiceAt: asString(first.lastServiceAt),
    serviceCount: Number.parseInt(String(first.serviceCount ?? "0"), 10) || 0,
    eligibleReason: describeEligibility(primaryDxCode),
    opioidEligible: isOpioidEligibleCode(primaryDxCode),
    acpRequired: isPalliativeEligibleCode(primaryDxCode),
  };
}

export async function registerHosCandidate(candidate: HosCandidate) {
  const payload = {
    hn: candidate.hn,
    cid: candidate.cid,
    fullName: candidate.fullName,
    age: candidate.age,
    sex: candidate.sex,
    clinicName: candidate.clinicName,
    clinicShortName: candidate.clinicShortName,
    unitCode: `${candidate.clinicShortName}-${candidate.hn.slice(-2)}`,
    primaryDxCode: candidate.primaryDxCode,
    primaryDxName: candidate.primaryDxName,
    careStatus: "active" as PalliativePatient["careStatus"],
    eligibleReason: candidate.eligibleReason,
    opioidEligible: candidate.opioidEligible,
    acpRequired: candidate.acpRequired,
    authenCode: undefined as string | undefined,
    phone: candidate.phone,
    relativePhone: undefined as string | undefined,
    lineId: candidate.lineId,
    address: candidate.address,
    notes: `ลงทะเบียนจาก HOSXP; count=${candidate.serviceCount}`,
    serviceMonthCount: candidate.serviceCount,
    lastVisitAt: candidate.lastServiceAt ?? candidate.visitDate,
    nextVisitAt: candidate.visitDate,
    registeredAt: todayKey(),
  };

  if (!isDbConfigured("palliative")) {
    return upsertImportedPatients([payload])[0] ?? null;
  }

  const pool = getPool("palliative");
  await pool.query(
    `
INSERT INTO paliative_registry
  (hn, cid, full_name, age, sex, clinic_name, clinic_short_name, unit_code, primary_dx_code, primary_dx_name,
   care_status, eligible_reason, opioid_eligible, acp_required, authen_code, phone, relative_phone, line_id,
   address, notes, service_month_count, last_visit_at, next_visit_at, registered_at)
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  age = VALUES(age),
  sex = VALUES(sex),
  clinic_name = VALUES(clinic_name),
  clinic_short_name = VALUES(clinic_short_name),
  unit_code = VALUES(unit_code),
  primary_dx_code = VALUES(primary_dx_code),
  primary_dx_name = VALUES(primary_dx_name),
  care_status = VALUES(care_status),
  eligible_reason = VALUES(eligible_reason),
  opioid_eligible = VALUES(opioid_eligible),
  acp_required = VALUES(acp_required),
  authen_code = VALUES(authen_code),
  phone = VALUES(phone),
  relative_phone = VALUES(relative_phone),
  line_id = VALUES(line_id),
  address = VALUES(address),
  notes = VALUES(notes),
  service_month_count = VALUES(service_month_count),
  last_visit_at = VALUES(last_visit_at),
  next_visit_at = VALUES(next_visit_at),
  registered_at = VALUES(registered_at)
    `,
    [
      payload.hn,
      payload.cid,
      payload.fullName,
      payload.age,
      payload.sex,
      payload.clinicName,
      payload.clinicShortName,
      payload.unitCode,
      payload.primaryDxCode,
      payload.primaryDxName,
      payload.careStatus,
      payload.eligibleReason,
      Number(payload.opioidEligible),
      Number(payload.acpRequired),
      payload.authenCode ?? null,
      payload.phone ?? null,
      payload.relativePhone ?? null,
      payload.lineId ?? null,
      payload.address ?? null,
      payload.notes,
      payload.serviceMonthCount,
      payload.lastVisitAt ?? null,
      payload.nextVisitAt ?? null,
      payload.registeredAt,
    ],
  );

  return { ok: true };
}

export async function savePatientPatch(
  id: number,
  patch: {
    phone?: string;
    relativePhone?: string;
    lineId?: string;
    notes?: string;
    nextVisitAt?: string;
    authenCode?: string;
    careStatus?: PalliativePatient["careStatus"];
    serviceMonthCount?: number;
  },
) {
  if (!isDbConfigured("palliative")) {
    return updatePatient(id, patch);
  }

  const pool = getPool("palliative");
  await pool.query(
    `
UPDATE paliative_registry
SET phone = COALESCE(?, phone),
    relative_phone = COALESCE(?, relative_phone),
    line_id = COALESCE(?, line_id),
    notes = COALESCE(?, notes),
    next_visit_at = COALESCE(?, next_visit_at),
    authen_code = COALESCE(?, authen_code),
    care_status = COALESCE(?, care_status),
    service_month_count = COALESCE(?, service_month_count)
WHERE id = ?
    `,
    [
      patch.phone ?? null,
      patch.relativePhone ?? null,
      patch.lineId ?? null,
      patch.notes ?? null,
      patch.nextVisitAt ?? null,
      patch.authenCode ?? null,
      patch.careStatus ?? null,
      patch.serviceMonthCount ?? null,
      id,
    ],
  );

  return { ok: true };
}

export async function saveVisit(
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
  if (!isDbConfigured("palliative")) {
    return addVisit(patientId, input);
  }

  const pool = getPool("palliative");
  await pool.query(
    `
INSERT INTO paliative_visits
  (patient_id, visit_date, visitor, authen_code, service_fee, home_visit_fee, change_reason, status, note)
VALUES
  (?, ?, ?, ?, ?, ?, ?, 'done', ?)
    `,
    [
      patientId,
      input.visitDate,
      input.visitor,
      input.authenCode ?? null,
      input.serviceFee ?? 1000,
      input.homeVisitFee ?? 300,
      input.changeReason ?? null,
      input.note ?? "",
    ],
  );

  return { ok: true };
}

export async function saveDischarge(id: number, reason: DischargeReason) {
  if (!isDbConfigured("palliative")) {
    return dischargePatient(id, reason);
  }

  const pool = getPool("palliative");
  await pool.query(
    `
UPDATE paliative_registry
SET care_status = ?, discharge_reason = ?, discharged_at = NOW(), next_visit_at = NULL
WHERE id = ?
    `,
    [reason === "เสียชีวิต" ? "deceased" : "completed", reason, id],
  );

  return { ok: true };
}
