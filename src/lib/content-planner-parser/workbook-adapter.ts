import { workbookContextSchema, type WorkbookContext } from "./types";

/**
 * A raw workbook sheet as JSON — the output of reading an .xlsx file.
 * Never contains real workbook content in committed code.
 */
export interface RawSheet {
  name: string;
  rows: Record<string, unknown>[];
}

/** The full workbook JSON structure. */
export interface RawWorkbookInput {
  sheets: RawSheet[];
}

/** Adapter result for one sheet. */
export interface AdapterSheetResult {
  sheetName: string;
  rawRows: Record<string, unknown>[];
  error: string | null;
  skipped: boolean;
}

/** Overall adapter result. */
export interface AdapterResult {
  context: WorkbookContext;
  sheets: AdapterSheetResult[];
  errors: { sheetName: string; message: string }[];
}

/**
 * Known content-plan sheet names that contain parsable session data.
 * Sheets not in this list are rejected with a bounded error.
 */
const KNOWN_SHEETS = new Set(["all parks", "state life school"]);

function normaliseSheetName(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Build the operator context from an explicit input.
 * This must be provided by the operator — never inferred from the workbook.
 */
export function buildContext(raw: unknown): WorkbookContext {
  const result = workbookContextSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid workbook context: ${JSON.stringify(result.error.flatten().fieldErrors)}`
    );
  }
  return result.data;
}

/**
 * Convert a raw JSON workbook representation into raw rows ready for
 * the CP-IMPORT-001 parseSheet() function.
 *
 * Each recognised sheet is extracted as an array of row records.
 * Unrecognised/empty/duplicate sheets produce a bounded error and are skipped.
 */
export function adaptWorkbook(
  input: RawWorkbookInput,
  contextInput: WorkbookContext
): AdapterResult {
  const errors: { sheetName: string; message: string }[] = [];
  const sheets: AdapterSheetResult[] = [];

  if (!Array.isArray(input.sheets)) {
    errors.push({ sheetName: "(root)", message: "Workbook input has no 'sheets' array" });
    return { context: contextInput, sheets, errors };
  }

  if (input.sheets.length === 0) {
    errors.push({ sheetName: "(root)", message: "Workbook input has no sheets" });
    return { context: contextInput, sheets, errors };
  }

  const seen = new Set<string>();

  for (const sheet of input.sheets) {
    if (!sheet || typeof sheet !== "object") {
      errors.push({ sheetName: "(unknown)", message: "Sheet entry is not an object" });
      continue;
    }

    const sheetName = typeof sheet.name === "string" ? sheet.name.trim() : "";
    if (!sheetName) {
      errors.push({ sheetName: "(unnamed)", message: "Sheet has no name" });
      continue;
    }

    const norm = normaliseSheetName(sheetName);
    if (seen.has(norm)) {
      errors.push({ sheetName, message: `Duplicate sheet name: "${sheetName}"` });
      continue;
    }
    seen.add(norm);

    if (!KNOWN_SHEETS.has(norm)) {
      errors.push({ sheetName, message: `Unsupported sheet: "${sheetName}". Supported: ${Array.from(KNOWN_SHEETS).join(", ")}` });
      continue;
    }

    if (!Array.isArray(sheet.rows)) {
      errors.push({ sheetName, message: `Sheet "${sheetName}" has no 'rows' array` });
      continue;
    }

    if (sheet.rows.length === 0) {
      errors.push({ sheetName, message: `Sheet "${sheetName}" is empty` });
      continue;
    }

    sheets.push({
      sheetName,
      rawRows: sheet.rows,
      error: null,
      skipped: false,
    });
  }

  return { context: contextInput, sheets, errors };
}
