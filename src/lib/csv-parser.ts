import Papa from "papaparse";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "email" | "date" | "number";
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: Record<string, string>[];
  errors: ValidationError[];
}

// ─── Parse CSV ───────────────────────────────────────────────────────────────

export function parseCSV(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(
            new Error(
              `CSV parse error: ${results.errors.map((e) => e.message).join(", ")}`
            )
          );
          return;
        }
        // Normalize keys: trim whitespace from values
        const normalized = results.data.map((row) => {
          const clean: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            clean[k.trim()] = (v ?? "").trim();
          }
          return clean;
        });
        resolve(normalized);
      },
      error: (err: Error) => {
        reject(new Error(`Failed to parse CSV: ${err.message}`));
      },
    });
  });
}

// ─── Parse Excel (placeholder — returns empty for now, CSV is primary) ───────

export async function parseExcel(
  file: File
): Promise<Record<string, string>[]> {
  // For now, we only support CSV. Excel files (.xlsx, .xls) are not natively
  // supported without a heavy library. Users should save their Excel as CSV.
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    return parseCSV(file);
  }
  throw new Error(
    "Only CSV files are supported. Please save your Excel file as CSV (.csv) and try again."
  );
}

// ─── Validate Import Data ────────────────────────────────────────────────────

export function validateImportData(
  data: Record<string, string>[],
  fields: ImportField[]
): ValidationResult {
  const valid: Record<string, string>[] = [];
  const errors: ValidationError[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // +2 because row 1 is the header
    let rowValid = true;

    for (const field of fields) {
      const value = row[field.key] ?? "";

      // Check required
      if (field.required && !value) {
        errors.push({
          row: rowNum,
          field: field.label,
          message: `${field.label} is required`,
        });
        rowValid = false;
        continue;
      }

      // Skip type validation if empty and not required
      if (!value) continue;

      // Type validation
      switch (field.type) {
        case "email": {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push({
              row: rowNum,
              field: field.label,
              message: `Invalid email format: "${value}"`,
            });
            rowValid = false;
          }
          break;
        }
        case "date": {
          const parsed = Date.parse(value);
          if (isNaN(parsed)) {
            errors.push({
              row: rowNum,
              field: field.label,
              message: `Invalid date format: "${value}" (use YYYY-MM-DD)`,
            });
            rowValid = false;
          }
          break;
        }
        case "number": {
          if (isNaN(Number(value))) {
            errors.push({
              row: rowNum,
              field: field.label,
              message: `Must be a number: "${value}"`,
            });
            rowValid = false;
          }
          break;
        }
        default:
          break;
      }
    }

    if (rowValid) {
      valid.push(row);
    }
  }

  return { valid, errors };
}

// ─── Generate Template CSV ───────────────────────────────────────────────────

export function generateTemplateCSV(
  fields: ImportField[],
  exampleRows: Record<string, string>[],
  filename: string
): void {
  const headers = fields.map((f) => f.label).join(",");
  const rows = exampleRows
    .map((row) => fields.map((f) => row[f.label] ?? "").join(","))
    .join("\n");
  const csv = [headers, ...exampleRows.map((row) => fields.map((f) => `"${(row[f.label] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-template.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Generate Error CSV ──────────────────────────────────────────────────────

export function generateErrorCSV(errors: ValidationError[]): void {
  if (errors.length === 0) return;

  const headers = "Row,Field,Error";
  const rows = errors.map((e) => `${e.row},"${e.field}","${e.message.replace(/"/g, '""')}"`).join("\n");
  const csv = `${headers}\n${rows}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "import-errors.csv";
  link.click();
  URL.revokeObjectURL(url);
}