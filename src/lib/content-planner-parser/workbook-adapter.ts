import ExcelJS from "exceljs";
import { workbookContextSchema, type WorkbookContext } from "./types";
import { parseSheet, computeSummary } from "./parser";

/**
 * A raw workbook sheet as an array of row records (Record<string, unknown>[]).
 */
export interface RawSheet {
  name: string;
  rows: Record<string, unknown>[];
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

/** Known content-plan sheet names. */
const KNOWN_SHEETS = new Set(["all parks", "state life school"]);

function normaliseSheetName(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Read an .xlsx buffer and return raw rows for each recognised sheet.
 * Unrecognised/empty/duplicate sheets produce bounded errors.
 */
export async function readWorkbook(
  data: Uint8Array,
  contextInput: WorkbookContext
): Promise<AdapterResult> {
  const errors: { sheetName: string; message: string }[] = [];

  const ctxResult = workbookContextSchema.safeParse(contextInput);
  if (!ctxResult.success) {
    errors.push({
      sheetName: "(context)",
      message: `Invalid workbook context: ${JSON.stringify(ctxResult.error.flatten().fieldErrors)}`,
    });
    return { context: contextInput, sheets: [], errors };
  }
  const context = ctxResult.data;

  let workbook: ExcelJS.Workbook;
  try {
    workbook = await new ExcelJS.Workbook().xlsx.load(data as never);
  } catch (err) {
    errors.push({
      sheetName: "(workbook)",
      message: `Failed to read .xlsx: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    return { context, sheets: [], errors };
  }

  const sheets: AdapterSheetResult[] = [];
  const seen = new Set<string>();

  for (const ws of workbook.worksheets) {
    const sheetName = ws.name?.trim() ?? "";
    if (!sheetName) {
      errors.push({ sheetName: "(unnamed)", message: "Worksheet has no name" });
      continue;
    }

    const norm = normaliseSheetName(sheetName);
    if (!KNOWN_SHEETS.has(norm)) {
      errors.push({
        sheetName,
        message: `Unsupported sheet: "${sheetName}". Supported: ${Array.from(KNOWN_SHEETS).join(", ")}`,
      });
      continue;
    }

    if (seen.has(norm)) {
      errors.push({ sheetName, message: `Duplicate sheet name: "${sheetName}"` });
      continue;
    }
    seen.add(norm);

    // Read headers by scanning up to maxCols. ExcelJS getCell creates cells on
    // access up to the worksheet's dimensions, so this reliably finds all columns.
    const headerRow = ws.getRow(1);
    const actualColCount = ws.columnCount || 8;
    const maxCols = Math.max(actualColCount, 20);
    const headerCells: { colIdx: number; name: string }[] = [];
    for (let c = 1; c <= maxCols; c++) {
      const cell = headerRow.getCell(c);
      const val = cell.value;
      const name = val !== null && val !== undefined ? String(val).trim() : "";
      if (name) {
        headerCells.push({ colIdx: c, name });
      }
    }

    const headers = headerCells.map((h) => h.name);

    const rawRows: Record<string, unknown>[] = [];

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const record: Record<string, unknown> = {};
      let hasAnyValue = false;

      // Always include every header key so the parser sees all expected columns.
      for (const { colIdx, name } of headerCells) {
        const cell = row.getCell(colIdx);
        const val = cell.value;
        if (val !== null && val !== undefined && val !== "") {
          let sv: string;
          if (val instanceof Date) {
            sv = val.toISOString().slice(0, 10);
          } else if (typeof val === "object" && "text" in (val as object)) {
            sv = (val as { text: string }).text;
          } else {
            sv = String(val);
          }
          record[name] = sv;
          hasAnyValue = true;
        }
        // If cell is empty/null, we still leave the key absent from the record.
        // parseSheet() treats missing keys as null — but REQUIRED_COLUMNS check
        // will fail. So we always set the key even for empty cells.
        // This is handled at the end of the loop.
      }

      // Ensure every header column exists in the record (null if not present).
      for (const { name } of headerCells) {
        if (!(name in record)) {
          record[name] = null;
        }
      }

      if (hasAnyValue) {
        rawRows.push(record);
      }
    }

    if (rawRows.length === 0) {
      errors.push({ sheetName, message: `Sheet "${sheetName}" has no data rows` });
      continue;
    }

    sheets.push({ sheetName, rawRows, error: null, skipped: false });
  }

  return { context, sheets, errors };
}

/**
 * End-to-end dry run: read workbook, parse each sheet, compute summary.
 * Returns a reconciliation report. Never writes to any database.
 */
export async function dryRun(
  data: Uint8Array,
  contextInput: WorkbookContext
): Promise<{
  errors: { sheetName: string; message: string }[];
  summary: ReturnType<typeof computeSummary> | null;
}> {
  const adapterResult = await readWorkbook(data, contextInput);
  const allErrors: { sheetName: string; message: string }[] = [...adapterResult.errors];

  if (adapterResult.sheets.length === 0) {
    return { errors: allErrors, summary: null };
  }

  const validSheets: import("./types").ParsedSheet[] = [];

  for (const sheet of adapterResult.sheets) {
    const result = parseSheet(sheet.sheetName, sheet.rawRows, adapterResult.context);
    for (const err of result.errors) {
      allErrors.push({ sheetName: sheet.sheetName, message: `Row ${err.row}: ${err.message}` });
    }
    if (result.sheet) {
      validSheets.push(result.sheet);
    }
  }

  const summary = validSheets.length > 0 ? computeSummary(validSheets) : null;
  return { errors: allErrors, summary };
}
