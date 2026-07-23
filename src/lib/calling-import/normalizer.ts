import { normalizePakistanPhone } from "./phone";
import { maskName, maskPhone, computeFingerprint } from "./pii";
import type {
  RawSourceRow,
  NormalizedCallingRow,
  CallingImportOptions,
  InvalidRowReport,
  UnresolvedParkReport,
} from "./types";

export interface NormalizerResult {
  validRows: NormalizedCallingRow[];
  invalidRows: InvalidRowReport[];
  unresolvedParks: UnresolvedParkReport[];
}

/**
 * Normalizes raw workbook rows into structured NormalizedCallingRow objects.
 * Enforces explicit operator cityId and campaignId context and mandatory hmacSecret.
 */
export function normalizeCallingRows(
  rawRows: RawSourceRow[],
  options: CallingImportOptions,
  cityParks: Array<{ id: string; name: string }> = []
): NormalizerResult {
  if (!options.cityId || !options.cityId.trim()) {
    throw new Error(
      "Operator city context (--cityId) is required and cannot be empty."
    );
  }

  if (!options.campaignId || !options.campaignId.trim()) {
    throw new Error(
      "Operator campaign context (--campaignId) is required and cannot be empty."
    );
  }

  if (!options.hmacSecret || !options.hmacSecret.trim()) {
    throw new Error(
      "IMPORT_HMAC_SECRET is required and cannot be empty."
    );
  }

  const validRows: NormalizedCallingRow[] = [];
  const invalidRows: InvalidRowReport[] = [];
  const unresolvedParks: UnresolvedParkReport[] = [];

  for (const raw of rawRows) {
    const name = raw.prospectName?.trim();
    const contactPhoneNorm = normalizePakistanPhone(raw.contactPhone);
    const guardianPhoneNorm = normalizePakistanPhone(raw.guardianPhone);
    const primaryPhoneNorm = contactPhoneNorm || guardianPhoneNorm;

    const maskedNameStr = maskName(name);
    const nameFingerprint = computeFingerprint(name, options.hmacSecret);

    // Validation 1: Prospect Name must be present
    if (!name) {
      invalidRows.push({
        rowNumber: raw.rowNumber,
        sheetName: raw.sheetName,
        prospectNameMasked: maskedNameStr,
        prospectNameFingerprint: nameFingerprint,
        reason: "Missing required field: Prospect Name is empty",
      });
      continue;
    }

    // Validation 2: At least one valid phone number must be present
    if (!primaryPhoneNorm) {
      invalidRows.push({
        rowNumber: raw.rowNumber,
        sheetName: raw.sheetName,
        prospectNameMasked: maskedNameStr,
        prospectNameFingerprint: nameFingerprint,
        reason:
          "Missing required field: Contact Phone and Guardian Phone are both empty or invalid",
      });
      continue;
    }

    // Validation 3: Check park alignment if park name is provided
    let allocatedParkName: string | undefined = undefined;
    if (raw.allocatedPark && raw.allocatedPark.trim()) {
      const parkInput = raw.allocatedPark.trim();
      const matchedPark = cityParks.find(
        (p) => p.name.trim().toLowerCase() === parkInput.toLowerCase()
      );

      if (matchedPark) {
        allocatedParkName = matchedPark.name;
      } else {
        unresolvedParks.push({
          rowNumber: raw.rowNumber,
          providedParkNameMasked: maskName(parkInput),
          providedParkNameFingerprint: computeFingerprint(parkInput, options.hmacSecret),
          resolvedParkId: null,
          status: "UNRESOLVED_PARK",
        });
      }
    }

    const maskedPhoneStr = maskPhone(primaryPhoneNorm);
    const phoneFingerprint = computeFingerprint(
      primaryPhoneNorm,
      options.hmacSecret
    );

    let cnicClean: string | undefined = undefined;
    if (raw.guardianCnic) {
      cnicClean = raw.guardianCnic.replace(/\D/g, "");
    }

    validRows.push({
      rowNumber: raw.rowNumber,
      sheetName: raw.sheetName,
      prospectName: name,
      prospectNameMasked: maskedNameStr,
      prospectNameFingerprint: nameFingerprint,
      normalizedContactPhone: contactPhoneNorm || undefined,
      normalizedGuardianPhone: guardianPhoneNorm || undefined,
      primaryPhoneNormalized: primaryPhoneNorm,
      primaryPhoneMasked: maskedPhoneStr,
      primaryPhoneFingerprint: phoneFingerprint,
      guardianName: raw.guardianName?.trim(),
      guardianCnicClean: cnicClean,
      allocatedParkName,
      callOutcome: raw.callOutcome?.trim(),
      prospectStatus: raw.prospectStatus?.trim(),
      callNotes: raw.callNotes?.trim(),
      preferredDateRaw:
        typeof raw.preferredDate === "string"
          ? raw.preferredDate
          : raw.preferredDate instanceof Date
          ? raw.preferredDate.toISOString()
          : undefined,
    });
  }

  return {
    validRows,
    invalidRows,
    unresolvedParks,
  };
}
