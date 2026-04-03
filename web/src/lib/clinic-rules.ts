import type { ClinicRule } from "./types";
import { buildPalliativeDiagnosisExistsSql, buildPalliativeDiagnosisWhereSql } from "./rules";

export const clinicRules: ClinicRule[] = [
  {
    clinicName: "รพ.สต. ห้วยหีบ",
    shortName: "ห้วยหีบ",
    chwpart: "47",
    amppart: "15",
    tmbpartInclude: ["01", "1"],
    moopartInclude: ["3", "03", "6", "06", "11", "12", "17", "18"],
    excludeDeath: true,
  },
  {
    clinicName: "รพ.สต.ม่วงไข",
    shortName: "ม่วงไข",
    chwpart: "47",
    amppart: "15",
    tmbpartInclude: ["03", "3"],
  },
  {
    clinicName: "รพ.สต.โพนทองวัฒนา",
    shortName: "โพนทองวัฒนา",
    chwpart: "47",
    amppart: "15",
    tmbpartInclude: ["01", "1"],
    moopartInclude: ["1", "01", "4", "04", "5", "05", "9", "09", "10", "11", "12"],
    excludeDeath: true,
  },
  {
    clinicName: "รพ.สต.บ้านเหล่าโพนค้อ",
    shortName: "บ้านเหล่าโพนค้อ",
    chwpart: "47",
    amppart: "15",
    tmbpartInclude: ["02", "2"],
  },
  {
    clinicName: "รพ.สต.โคกนาดี",
    shortName: "โคกนาดี",
    chwpart: "47",
    amppart: "15",
    tmbpartInclude: ["04", "4"],
    moopartExclude: ["1", "01", "4", "04", "5", "05", "9", "09", "10", "11", "12"],
    excludeDeath: true,
  },
  {
    clinicName: "PCU โรงพยาบาล",
    shortName: "pcu",
    chwpart: "47",
    amppart: "15",
    tmbpartInclude: ["01", "1"],
    moopartInclude: ["01", "1", "02", "2", "04", "4", "5", "05", "7", "07", "8", "08", "9", "09", "10", "13", "14", "15", "16"],
    excludeDeath: true,
  },
];

function quoteList(values: string[]): string {
  return values.map((value) => `"${value}"`).join(", ");
}

export function buildClinicWhereClause(
  rule: ClinicRule,
  areaAlias = "p",
  visitAreaAlias = "va",
  deathAlias = "p",
): string {
  const fragments = [
    `COALESCE(${visitAreaAlias}.chwpart, ${areaAlias}.chwpart) = "${rule.chwpart}"`,
    `COALESCE(${visitAreaAlias}.amppart, ${areaAlias}.amppart) = "${rule.amppart}"`,
    `COALESCE(${visitAreaAlias}.tmbpart, ${areaAlias}.tmbpart) IN (${quoteList(rule.tmbpartInclude)})`,
  ];

  if (rule.moopartInclude?.length) {
    fragments.push(`COALESCE(${areaAlias}.moopart, '') IN (${quoteList(rule.moopartInclude)})`);
  }

  if (rule.moopartExclude?.length) {
    fragments.push(`COALESCE(${areaAlias}.moopart, '') NOT IN (${quoteList(rule.moopartExclude)})`);
  }

  if (rule.excludeDeath) {
    fragments.push(`COALESCE(${deathAlias}.death, "N") <> "Y"`);
  }

  return fragments.join(" AND ");
}

export function buildImportSql(rule: ClinicRule, visitDate = "?"): string {
  return `
SELECT o.hn,
  p.cid,
  CONCAT(p.pname, p.fname, '  ', p.lname) AS fullname,
  o.vstdate,
  o.vn,
  o.vsttime,
  pt.pttype,
  pt.name AS pttype_name,
  vs.pdx,
  IF(
    p.mobile_phone_number IS NOT NULL,
    p.mobile_phone_number,
    IF(p.hometel IS NOT NULL, p.hometel, p.informtel)
  ) AS TelNo,
  CONCAT(p.addrpart, ' ม. ', p.moopart, ' ต. ', t3.name) AS full_address,
  s.name AS drug_name
FROM ovst o
  LEFT OUTER JOIN vn_stat vs ON vs.vn = o.vn
  LEFT OUTER JOIN patient p ON p.hn = o.hn
  LEFT OUTER JOIN thaiaddress va ON va.addressid = vs.aid
  LEFT OUTER JOIN opitemrece op ON op.vn = o.vn
  LEFT OUTER JOIN s_DRUGITEMS s ON s.ICODE = op.icode
  LEFT OUTER JOIN pttype pt ON pt.pttype = o.pttype
  LEFT OUTER JOIN thaiaddress t3
    ON t3.chwpart = p.chwpart
   AND t3.amppart = p.amppart
   AND t3.tmbpart = p.tmbpart
WHERE o.vstdate = ${visitDate}
  AND o.ovstist = "17"
  AND ${buildClinicWhereClause(rule)}
  AND ${buildPalliativeDiagnosisExistsSql("o.vn")}
GROUP BY op.hn
ORDER BY o.hn, o.vn`;
}

export function buildCandidateSql(rule: ClinicRule, visitDate = "?"): string {
  return `
SELECT
  o.hn,
  p.cid,
  CONCAT(p.pname, p.fname, '  ', p.lname) AS fullname,
  TIMESTAMPDIFF(YEAR, p.birthday, ${visitDate}) AS age,
  p.sex,
  '${rule.clinicName}' AS clinicName,
  '${rule.shortName}' AS clinicShortName,
  COALESCE(vs.pdx, '') AS pdx,
  COALESCE(vs.pdx, '') AS primaryDxName,
  IF(
    p.mobile_phone_number IS NOT NULL,
    p.mobile_phone_number,
    IF(p.hometel IS NOT NULL, p.hometel, p.informtel)
  ) AS TelNo,
  CONCAT(p.addrpart, ' ม. ', p.moopart, ' ต. ', t3.name) AS full_address,
  svc.serviceCount,
  svc.lastServiceAt
FROM ovst o
  INNER JOIN vn_stat vs ON vs.vn = o.vn
  LEFT OUTER JOIN patient p ON p.hn = o.hn
  LEFT OUTER JOIN thaiaddress va ON va.addressid = vs.aid
  LEFT OUTER JOIN thaiaddress t3
    ON t3.chwpart = p.chwpart
   AND t3.amppart = p.amppart
   AND t3.tmbpart = p.tmbpart
  LEFT OUTER JOIN (
    SELECT
      o2.hn,
      COUNT(DISTINCT o2.vn) AS serviceCount,
      MAX(o2.vstdate) AS lastServiceAt
    FROM ovst o2
      INNER JOIN opitemrece op2 ON op2.vn = o2.vn
    WHERE LOWER(op2.icode) IN ('eva001', 'cons01', '30001')
    GROUP BY o2.hn
  ) svc ON svc.hn = o.hn
WHERE o.vstdate = ${visitDate}
  AND o.ovstist = '17'
  AND ${buildClinicWhereClause(rule)}
  AND ${buildPalliativeDiagnosisExistsSql("o.vn")}
  AND EXISTS (
    SELECT 1
    FROM opitemrece opx
    WHERE opx.vn = o.vn
      AND LOWER(opx.icode) IN ('eva001', 'cons01', '30001')
  )
GROUP BY o.hn
ORDER BY o.hn, o.vn`;
}

export function buildCandidateByHnSql(rule: ClinicRule, hn = "?"): string {
  return `
SELECT
  o.hn,
  p.cid,
  CONCAT(p.pname, p.fname, '  ', p.lname) AS fullname,
  TIMESTAMPDIFF(YEAR, p.birthday, CURDATE()) AS age,
  p.sex,
  pt.pttype,
  pt.name AS pttype_name,
  '${rule.clinicName}' AS clinicName,
  '${rule.shortName}' AS clinicShortName,
  COALESCE(vs.pdx, '') AS pdx,
  COALESCE(vs.pdx, '') AS primaryDxName,
  IF(
    p.mobile_phone_number IS NOT NULL,
    p.mobile_phone_number,
    IF(p.hometel IS NOT NULL, p.hometel, p.informtel)
  ) AS TelNo,
  CONCAT(p.addrpart, ' ม. ', p.moopart, ' ต. ', t3.name) AS full_address,
  svc.serviceCount,
  svc.lastServiceAt,
  MAX(o.vstdate) AS visitDate
FROM ovst o
  INNER JOIN vn_stat vs ON vs.vn = o.vn
  LEFT OUTER JOIN patient p ON p.hn = o.hn
  LEFT OUTER JOIN pttype pt ON pt.pttype = o.pttype
  LEFT OUTER JOIN thaiaddress va ON va.addressid = vs.aid
  LEFT OUTER JOIN thaiaddress t3
    ON t3.chwpart = p.chwpart
   AND t3.amppart = p.amppart
   AND t3.tmbpart = p.tmbpart
  LEFT OUTER JOIN (
    SELECT
      o2.hn,
      COUNT(DISTINCT o2.vn) AS serviceCount,
      MAX(o2.vstdate) AS lastServiceAt
    FROM ovst o2
      INNER JOIN opitemrece op2 ON op2.vn = o2.vn
    WHERE LOWER(op2.icode) IN ('eva001', 'cons01', '30001')
    GROUP BY o2.hn
  ) svc ON svc.hn = o.hn
WHERE o.hn = ${hn}
  AND o.ovstist = '17'
  AND ${buildClinicWhereClause(rule)}
  AND ${buildPalliativeDiagnosisExistsSql("o.vn")}
  AND EXISTS (
    SELECT 1
    FROM opitemrece opx
    WHERE opx.vn = o.vn
      AND LOWER(opx.icode) IN ('eva001', 'cons01', '30001')
  )
GROUP BY o.hn
ORDER BY o.vstdate DESC, o.vn DESC
LIMIT 1`;
}

export function buildCandidateByHnDxOnlySql(hn = "?"): string {
  return `
SELECT
  o.hn,
  p.cid,
  CONCAT(p.pname, p.fname, '  ', p.lname) AS fullname,
  TIMESTAMPDIFF(YEAR, p.birthday, CURDATE()) AS age,
  p.sex,
  pt.pttype,
  pt.name AS pttype_name,
  COALESCE(matchDx.primaryDxCode, vs.pdx, '') AS pdx,
  COALESCE(matchDx.primaryDxCode, vs.pdx, '') AS primaryDxName,
  IF(
    p.mobile_phone_number IS NOT NULL,
    p.mobile_phone_number,
    IF(p.hometel IS NOT NULL, p.hometel, p.informtel)
  ) AS TelNo,
  CONCAT(p.addrpart, ' ม. ', p.moopart, ' ต. ', t3.name) AS full_address,
  svc.serviceCount,
  svc.lastServiceAt,
  MAX(o.vstdate) AS visitDate
FROM ovst o
  INNER JOIN vn_stat vs ON vs.vn = o.vn
  LEFT OUTER JOIN patient p ON p.hn = o.hn
  LEFT OUTER JOIN pttype pt ON pt.pttype = o.pttype
  LEFT OUTER JOIN thaiaddress t3
    ON t3.chwpart = p.chwpart
   AND t3.amppart = p.amppart
   AND t3.tmbpart = p.tmbpart
  LEFT OUTER JOIN (
    SELECT
      o2.hn,
      SUBSTRING_INDEX(
        GROUP_CONCAT(
          DISTINCT UPPER(REPLACE(d.icd10, '.', ''))
          ORDER BY UPPER(REPLACE(d.icd10, '.', ''))
        ),
        ',',
        1
      ) AS primaryDxCode
    FROM ovst o2
      INNER JOIN ovstdiag d ON d.vn = o2.vn
    WHERE o2.hn = ${hn}
      AND ${buildPalliativeDiagnosisWhereSql("d.icd10")}
    GROUP BY o2.hn
  ) matchDx ON matchDx.hn = o.hn
  LEFT OUTER JOIN (
    SELECT
      o2.hn,
      COUNT(DISTINCT ocs.vn) AS serviceCount,
      MAX(DATE(COALESCE(ocs.entry_datetime, o2.vstdate))) AS lastServiceAt
    FROM ovst o2
      INNER JOIN ovstdiag d ON d.vn = o2.vn
      LEFT OUTER JOIN ovst_community_service ocs ON ocs.vn = o2.vn
    WHERE o2.hn = ${hn}
      AND ${buildPalliativeDiagnosisExistsSql("o2.vn")}
    GROUP BY o2.hn
  ) svc ON svc.hn = o.hn
WHERE o.hn = ${hn}
  AND ${buildPalliativeDiagnosisExistsSql("o.vn")}
GROUP BY o.hn
ORDER BY o.vstdate DESC, o.vn DESC
LIMIT 1`;
}

export function buildCandidateByHnAnyAreaSql(hn = "?"): string {
  return buildCandidateByHnDxOnlySql(hn);
}
