/**
 * CSV Export Utility for Shabab360
 *
 * Provides a generic function to export arrays of objects as CSV files,
 * with UTF-8 BOM for Excel compatibility.
 */

interface CsvColumn {
  key: string;
  header: string;
}

/**
 * Escape a single CSV field value.
 * Wraps in quotes if the value contains commas, double-quotes, or newlines.
 */
function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects into a CSV string with a UTF-8 BOM prefix.
 */
export function objectsToCsv(
  data: Record<string, unknown>[],
  columns?: { key: string; header: string }[]
): string {
  if (data.length === 0) return "";

  const BOM = "\uFEFF";

  // Use provided columns or infer from first row keys
  const cols: { key: string; header: string }[] =
    columns ?? Object.keys(data[0]).map((key) => ({ key, header: key }));

  const headerRow = cols.map((c) => escapeCsvField(c.header)).join(",");
  const dataRows = data.map((row) =>
    cols.map((c) => escapeCsvField(row[c.key])).join(",")
  );

  return BOM + [headerRow, ...dataRows].join("\n");
}

/**
 * Trigger a CSV file download in the browser.
 *
 * @param data  - Array of row objects to export.
 * @param filename - Desired file name (without extension; .csv is appended automatically).
 * @param columns  - Optional column definitions to control order and header labels.
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; header: string }[]
): void {
  const csvString = objectsToCsv(data, columns);
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export type { CsvColumn };