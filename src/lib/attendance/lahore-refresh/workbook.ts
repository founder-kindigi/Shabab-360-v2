import { createHash } from "node:crypto";
import type {
  ParsedGroup,
  ParsedPark,
  ParsedStaff,
  ParsedStatus,
  ParsedStudent,
  ParsedUnnumberedCandidate,
  SheetLike,
} from "./types";

/** The six Lahore Batch 4 sheets and their canonical park names. */
export const PARK_SHEETS: readonly (readonly [sheet: string, park: string])[] = [
  ["Gulberg", "Gulberg"],
  ["Gulshan_Iqbal", "Gulshan Iqbal"],
  ["Griffin", "Griffin"],
  ["Johar_Town", "Johar Town"],
  ["Gulshan_Ravi", "Gulshan Ravi"],
  ["State_Life", "State Life"],
];

export const STATUS_MAP: ReadonlyMap<string, "present" | "absent" | "late" | "excused"> = new Map([
  ["present", "present"],
  ["absent", "absent"],
  ["late", "late"],
  ["leave", "excused"],
]);

const IGNORED_STATUSES = new Set(["", "off", "sat off", "n/a"]);

export type StatusClassification =
  | { readonly kind: "record"; readonly target: "present" | "absent" | "late" | "excused" }
  | { readonly kind: "ignored" }
  | { readonly kind: "review"; readonly code: "malformed_attendance_value" | "dropout" };

export function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "result" in value) return text((value as { result: unknown }).result);
  return String(value).trim();
}

/** Stable, non-reversible identity key used only for duplicate detection. */
export function sourceFingerprint(name: string, phone: string, park: string, group: string): string {
  return createHash("sha256")
    .update(`${name.toLowerCase()}|${phone.replace(/\s+/g, "")}|${park}|${group}`)
    .digest("hex")
    .slice(0, 16);
}

/** Converts `D/M` session labels into ISO dates, rolling the year on month wrap. */
export function parseSessionDates(labels: readonly unknown[], startYear: number): (string | null)[] {
  let year = startYear;
  let previousMonth = 0;
  return labels.map((label) => {
    const match = /^(\d{1,2})\/(\d{1,2})$/.exec(text(label));
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    if (previousMonth && month < previousMonth) year += 1;
    previousMonth = month;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
}

export function classifyStatus(value: unknown): StatusClassification {
  if (value && typeof value === "object" && "formula" in value) {
    const formula = String((value as { formula: unknown }).formula);
    // The workbook's weekend OFF markers are formulas, not attendance values.
    if (/OFF Weekends/.test(formula) && /"OFF"/.test(formula)) return { kind: "ignored" };
    return { kind: "review", code: "malformed_attendance_value" };
  }
  const normalized = text(value).toLowerCase();
  const target = STATUS_MAP.get(normalized);
  if (target) return { kind: "record", target };
  if (IGNORED_STATUSES.has(normalized)) return { kind: "ignored" };
  if (normalized === "dropout") return { kind: "review", code: "dropout" };
  return { kind: "review", code: "malformed_attendance_value" };
}

export function canonicalStaffRole(roleLabel: string): string | null {
  const normalized = roleLabel.toLowerCase();
  if (normalized.includes("park lead")) return "park_lead";
  if (normalized.includes("park admin")) return "park_admin";
  if (normalized.includes("murabbi")) return "murabbi";
  return null;
}

/** A numbered roster row starts with an integer serial in column A. */
export function isSourceDataRow(value: unknown): boolean {
  return typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value.trim()));
}

/**
 * Per-group summary rows in the workbook carry one of these labels in the name
 * column and numeric cells under the date columns. They describe a group's
 * totals, not a person, so they must never be read as a participant or become an
 * attendance record.
 */
export const NON_PARTICIPANT_LABELS: ReadonlySet<string> = new Set([
  "present",
  "absent",
  "late",
  "leave",
  "total present",
  "attendance percentage",
  "strength",
]);

export function isNonParticipantLabel(value: unknown): boolean {
  return NON_PARTICIPANT_LABELS.has(text(value).toLowerCase().replace(/\s+/g, " "));
}

function cleanPhone(value: unknown): string {
  return text(value).replace(/^'/, "");
}

function statusesFor(sheet: SheetLike, row: number, columns: readonly number[], dates: readonly (string | null)[]): ParsedStatus[] {
  return columns.map((column, index) => ({ date: dates[index] ?? null, value: sheet.getCell(row, column).value }));
}

/**
 * Reads one park worksheet. Rows without an integer serial are retained as
 * candidates when they carry a name under an explicit group, so a student the
 * old parser called "unnumbered" is still importable when the group is known.
 */
export function readParkSheet(sheet: SheetLike, sheetName: string, parkName: string, startYear: number): ParsedPark {
  const attendanceColumns: number[] = [];
  for (let column = 9; column <= sheet.columnCount; column += 1) {
    if (/^C\d+$/i.test(text(sheet.getCell(3, column).value))) attendanceColumns.push(column);
  }
  const sessionDates = parseSessionDates(
    attendanceColumns.map((column) => sheet.getCell(4, column).value),
    startYear
  );

  const groups: ParsedGroup[] = [];
  const staff: ParsedStaff[] = [];
  const unnumberedCandidates: ParsedUnnumberedCandidate[] = [];
  let currentGroup: ParsedGroup | null = null;

  for (let row = 5; row <= sheet.rowCount; row += 1) {
    const firstCell = text(sheet.getCell(row, 1).value);
    const groupMatch = /^Group\s+(.+?)\s*\|\s*Murabbi:\s*(.*)$/i.exec(firstCell);
    if (groupMatch) {
      currentGroup = {
        name: `Group ${groupMatch[1].trim()}`,
        murabbiLabel: groupMatch[2].trim(),
        sourceRef: `${sheetName}!A${row}`,
        students: [],
      };
      groups.push(currentGroup);
      continue;
    }

    const nameValue = sheet.getCell(row, 2).value;
    if (!isSourceDataRow(sheet.getCell(row, 1).value)) {
      // Summary/header rows (Present, Absent, Late, Leave, Total Present,
      // Attendance Percentage, Strength) have no roster serial and carry totals
      // instead of a person, so they must never become a participant. A row with
      // a valid serial is always a real roster row, even when its name happens to
      // match one of those labels.
      if (isNonParticipantLabel(nameValue)) continue;
      if (currentGroup && typeof nameValue === "string" && text(nameValue) && !nameValue.trim().startsWith("=")) {
        const name = text(nameValue);
        const phone = cleanPhone(sheet.getCell(row, 3).value);
        const hasPhone = Boolean(text(sheet.getCell(row, 3).value));
        const age = text(sheet.getCell(row, 7).value);
        const grade = text(sheet.getCell(row, 8).value);
        const hasAttendance = attendanceColumns.some((column) => classifyStatus(sheet.getCell(row, column).value).kind !== "ignored");
        if (hasPhone || age || grade || hasAttendance) {
          unnumberedCandidates.push({
            sourceRef: `${sheetName}!${row}`,
            name,
            phone,
            fingerprint: sourceFingerprint(name, phone, parkName, currentGroup.name),
            hasPhone,
            age: /^\d+$/.test(age) ? Number(age) : null,
            grade,
            group: currentGroup.name,
            statuses: statusesFor(sheet, row, attendanceColumns, sessionDates),
          });
        }
      }
      continue;
    }

    const name = text(nameValue);
    if (!name) continue;
    const roleOrGrade = text(sheet.getCell(row, 8).value);
    const sourceRef = `${sheetName}!${row}`;
    if (!currentGroup) {
      staff.push({
        sourceRef,
        name,
        phone: cleanPhone(sheet.getCell(row, 3).value),
        roleLabel: roleOrGrade,
        canonicalRole: canonicalStaffRole(roleOrGrade),
      });
      continue;
    }

    const phone = cleanPhone(sheet.getCell(row, 3).value);
    currentGroup.students.push({
      sourceRef,
      name,
      phone,
      fingerprint: sourceFingerprint(name, phone, parkName, currentGroup.name),
      hasPhone: Boolean(phone),
      age: /^\d+$/.test(text(sheet.getCell(row, 7).value)) ? Number(text(sheet.getCell(row, 7).value)) : null,
      grade: roleOrGrade,
      statuses: statusesFor(sheet, row, attendanceColumns, sessionDates),
    });
  }

  return { sheetName, parkName, sessionDates, groups, staff, unnumberedCandidates };
}
