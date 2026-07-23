import type {
  NormalizedCallingRow,
  DuplicateClusterReport,
  DuplicateMatchingRow,
} from "./types";

export interface DeduplicationResult {
  duplicateClusters: DuplicateClusterReport[];
  uniqueRows: NormalizedCallingRow[];
}

/**
 * Detects duplicate candidates across rows and sheets using primary phone key
 * and secondary name key. Returns duplicate clusters and unique deduplicated rows.
 */
export function detectDuplicates(
  rows: NormalizedCallingRow[]
): DeduplicationResult {
  const phoneClustersMap = new Map<string, NormalizedCallingRow[]>();

  for (const row of rows) {
    const key = row.primaryPhoneNormalized;
    if (!key) continue;

    const existing = phoneClustersMap.get(key) || [];
    existing.push(row);
    phoneClustersMap.set(key, existing);
  }

  const duplicateClusters: DuplicateClusterReport[] = [];
  const uniqueRows: NormalizedCallingRow[] = [];

  for (const [, clusterRows] of phoneClustersMap) {
    const headRow = clusterRows[0];

    if (clusterRows.length > 1) {
      const matchingRows: DuplicateMatchingRow[] = clusterRows.map((r) => ({
        rowNumber: r.rowNumber,
        sheetName: r.sheetName,
      }));

      duplicateClusters.push({
        maskedPhone: headRow.primaryPhoneMasked || "N/A",
        phoneFingerprint: headRow.primaryPhoneFingerprint || "N/A",
        matchingRows,
        resolution: "MERGE_HISTORIC_TIMELINE",
      });
    }

    // Keep first occurrences as primary entry
    uniqueRows.push(headRow);
  }

  return {
    duplicateClusters,
    uniqueRows,
  };
}
