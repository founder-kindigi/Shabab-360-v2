import type {
  RawSourceRow,
  CallingImportOptions,
  CallingReconciliationReport,
  UnresolvedInterviewReport,
  AdmissionInterviewLookupService,
} from "./types";
import { parseCallingWorkbook } from "./parser";
import { normalizeCallingRows } from "./normalizer";
import { detectDuplicates } from "./duplicates";

/**
 * Top-level read-only importer processor. Synthesizes parsing, normalization,
 * scope validation, candidate deduplication, and read-only interview matching.
 * 
 * GUARANTEE: Performs ZERO database write operations (INSERT, UPDATE, DELETE).
 */
export async function processCallingImport(
  input: string | Buffer | RawSourceRow[],
  options: CallingImportOptions,
  lookupService: AdmissionInterviewLookupService
): Promise<CallingReconciliationReport> {
  if (!options.cityId || !options.cityId.trim()) {
    throw new Error(
      "Operator city context (--cityId) is mandatory for calling import processing."
    );
  }

  // 1. Obtain raw rows
  let rawRows: RawSourceRow[];
  if (Array.isArray(input)) {
    rawRows = input;
  } else {
    rawRows = await parseCallingWorkbook(input);
  }

  // 2. Obtain city parks for operator city scope check
  const cityParks = await lookupService.getCityParks(options.cityId);

  // 3. Normalize raw rows and validate operator scope
  const { validRows, invalidRows, unresolvedParks } = normalizeCallingRows(
    rawRows,
    options,
    cityParks
  );

  // 4. Perform deduplication clustering
  const { duplicateClusters, uniqueRows } = detectDuplicates(validRows);

  // 5. Read-only interview matching
  const unresolvedInterviewLinks: UnresolvedInterviewReport[] = [];

  for (const row of uniqueRows) {
    const match = await lookupService.findMatchingInterview({
      cityId: options.cityId,
      phone: row.primaryPhoneNormalized,
      guardianPhone: row.normalizedGuardianPhone,
      applicantName: row.prospectName,
    });

    if (!match.matched) {
      unresolvedInterviewLinks.push({
        rowNumber: row.rowNumber,
        sheetName: row.sheetName,
        prospectNameMasked: row.prospectNameMasked,
        prospectNameFingerprint: row.prospectNameFingerprint,
        reason: "No matching AdmissionInterview record found for this applicant",
        status: "unresolvedInterviewLink",
      });
    }
  }

  // 6. Build deterministic reconciliation report
  const report: CallingReconciliationReport = {
    summary: {
      totalRowsProcessed: rawRows.length,
      validLeadsCount: validRows.length,
      invalidLeadsCount: invalidRows.length,
      duplicateClustersCount: duplicateClusters.length,
      unresolvedParksCount: unresolvedParks.length,
      unresolvedInterviewLinksCount: unresolvedInterviewLinks.length,
    },
    invalidRows,
    unresolvedParks,
    unresolvedInterviewLinks,
    duplicates: duplicateClusters,
  };

  return report;
}
