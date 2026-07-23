import ExcelJS from "exceljs";
import type { RawSourceRow } from "./types";

/**
 * Helper to normalize column header strings for flexible matching.
 */
function normalizeHeader(headerText?: unknown): string {
  if (typeof headerText !== "string") {
    return "";
  }
  return headerText.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Helper to safely extract string value from an Excel cell.
 */
function getCellStringValue(cellValue: unknown): string {
  if (cellValue === null || cellValue === undefined) {
    return "";
  }
  if (typeof cellValue === "string") {
    return cellValue.trim();
  }
  if (typeof cellValue === "number" || typeof cellValue === "boolean") {
    return String(cellValue).trim();
  }
  if (typeof cellValue === "object" && cellValue !== null) {
    if ("result" in cellValue) {
      return String((cellValue as { result: unknown }).result).trim();
    }
    if ("text" in cellValue) {
      return String((cellValue as { text: unknown }).text).trim();
    }
  }
  return String(cellValue).trim();
}

/**
 * Parses an Excel workbook buffer or file path into RawSourceRow array.
 */
export async function parseCallingWorkbook(
  input: string | Buffer
): Promise<RawSourceRow[]> {
  const workbook = new ExcelJS.Workbook();
  if (typeof input === "string") {
    await workbook.xlsx.readFile(input);
  } else {
    await workbook.xlsx.load(input as any);
  }

  const rawRows: RawSourceRow[] = [];

  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name;
    let headerRowNumber = -1;
    const colMap: Record<string, number> = {};

    // Find header row (usually row 1)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (headerRowNumber !== -1) return;

      const headers: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        headers.push(normalizeHeader(cell.value));
      });

      // Check if this row contains expected headers
      const hasName = headers.some((h) => h.includes("name") || h.includes("prospect"));
      const hasPhone = headers.some((h) => h.includes("phone") || h.includes("contact"));

      if (hasName || hasPhone) {
        headerRowNumber = rowNumber;
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const norm = normalizeHeader(cell.value);
          if (norm.includes("prospectname") || norm === "name" || norm === "prospect") {
            colMap["prospectName"] = colNumber;
          } else if (norm.includes("contactphone") || (norm.includes("phone") && !norm.includes("guardian"))) {
            colMap["contactPhone"] = colNumber;
          } else if (norm.includes("guardianname") || norm.includes("fathername")) {
            colMap["guardianName"] = colNumber;
          } else if (norm.includes("guardianphone") || norm.includes("fatherphone")) {
            colMap["guardianPhone"] = colNumber;
          } else if (norm.includes("cnic")) {
            colMap["guardianCnic"] = colNumber;
          } else if (norm.includes("park") || norm.includes("venue")) {
            colMap["allocatedPark"] = colNumber;
          } else if (norm.includes("outcome")) {
            colMap["callOutcome"] = colNumber;
          } else if (norm.includes("status") || norm.includes("response")) {
            colMap["prospectStatus"] = colNumber;
          } else if (norm.includes("note") || norm.includes("remark")) {
            colMap["callNotes"] = colNumber;
          } else if (norm.includes("date") || norm.includes("preferred") || norm.includes("interview")) {
            colMap["preferredDate"] = colNumber;
          }
        });
      }
    });

    if (headerRowNumber === -1) {
      return;
    }

    // Process data rows
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;

      const rawRow: RawSourceRow = {
        rowNumber,
        sheetName,
        prospectName: colMap["prospectName"] ? getCellStringValue(row.getCell(colMap["prospectName"]).value) : undefined,
        contactPhone: colMap["contactPhone"] ? getCellStringValue(row.getCell(colMap["contactPhone"]).value) : undefined,
        guardianName: colMap["guardianName"] ? getCellStringValue(row.getCell(colMap["guardianName"]).value) : undefined,
        guardianPhone: colMap["guardianPhone"] ? getCellStringValue(row.getCell(colMap["guardianPhone"]).value) : undefined,
        guardianCnic: colMap["guardianCnic"] ? getCellStringValue(row.getCell(colMap["guardianCnic"]).value) : undefined,
        allocatedPark: colMap["allocatedPark"] ? getCellStringValue(row.getCell(colMap["allocatedPark"]).value) : undefined,
        callOutcome: colMap["callOutcome"] ? getCellStringValue(row.getCell(colMap["callOutcome"]).value) : undefined,
        prospectStatus: colMap["prospectStatus"] ? getCellStringValue(row.getCell(colMap["prospectStatus"]).value) : undefined,
        callNotes: colMap["callNotes"] ? getCellStringValue(row.getCell(colMap["callNotes"]).value) : undefined,
        preferredDate: colMap["preferredDate"] ? getCellStringValue(row.getCell(colMap["preferredDate"]).value) : undefined,
      };

      // Skip completely empty rows
      if (
        !rawRow.prospectName &&
        !rawRow.contactPhone &&
        !rawRow.guardianPhone &&
        !rawRow.guardianName
      ) {
        return;
      }

      rawRows.push(rawRow);
    });
  });

  return rawRows;
}
