function normalize(code?: string): string {
  return (code ?? "").toUpperCase().replaceAll(".", "").trim();
}

export function normalizeIcd10(code?: string): string {
  return normalize(code);
}

export function buildPalliativeDiagnosisWhereSql(column = "dx.icd10"): string {
  const normalized = `UPPER(REPLACE(${column}, '.', ''))`;
  return `${normalized} REGEXP '^(B2[0-4]|C|D[0-4]|I5|I6|J44|K704|K717|K72|N185|Z515|Z718)'`;
}

export function buildPalliativeDiagnosisExistsSql(vnExpr = "o.vn"): string {
  const condition = buildPalliativeDiagnosisWhereSql("d.icd10");
  return `(
    EXISTS (
      SELECT 1
      FROM ovstdiag d
      WHERE d.vn = ${vnExpr}
        AND ${condition}
    )
  )`;
}

export function isPalliativeEligibleCode(code?: string): boolean {
  const normalized = normalize(code);
  if (!normalized) {
    return false;
  }

  if (normalized === "B230" || normalized === "B231") {
    return false;
  }

  return (
    /^C\d{2,3}/.test(normalized) ||
    /^D3[7-9]/.test(normalized) ||
    /^I6[0-9]/.test(normalized) ||
    normalized === "N185" ||
    normalized === "J44" ||
    /^B2[0-4]/.test(normalized) ||
    normalized === "K72" ||
    normalized === "K704" ||
    normalized === "K717" ||
    normalized === "I50" ||
    normalized === "Z515" ||
    normalized === "Z718"
  );
}

export function isOpioidEligibleCode(code?: string): boolean {
  return /^C\d{2,3}/.test(normalize(code));
}

export function describeEligibility(code?: string): string {
  const normalized = normalize(code);
  if (!normalized) {
    return "รอคัดกรอง";
  }

  if (normalized.startsWith("C")) {
    return "กลุ่มมะเร็งระยะท้าย";
  }

  if (normalized.startsWith("I6")) {
    return "Stroke";
  }

  if (normalized === "N185") {
    return "CKD stage 5";
  }

  if (normalized === "J44") {
    return "COPD รุนแรง";
  }

  if (normalized.startsWith("B2")) {
    return "AIDS ระยะรุนแรง";
  }

  if (normalized.startsWith("K7")) {
    return "ภาวะตับล้มเหลว";
  }

  if (normalized === "I50") {
    return "หัวใจล้มเหลว";
  }

  if (normalized === "Z515") {
    return "Palliative care";
  }

  if (normalized === "Z718") {
    return "Advance Care Plan";
  }

  return "เข้าเกณฑ์ Palliative";
}
