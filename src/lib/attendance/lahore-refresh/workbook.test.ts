import { describe, expect, it } from "vitest";
import { classifyStatus, isNonParticipantLabel, parseSessionDates, readParkSheet, sourceFingerprint } from "./workbook";
import type { SheetLike } from "./types";

/** Builds a 1-indexed sheet surface from a plain matrix of 0-indexed rows. */
function sheetFromMatrix(rows: readonly (readonly unknown[])[]): SheetLike {
  return {
    rowCount: rows.length,
    columnCount: rows.reduce((max, row) => Math.max(max, row.length), 0),
    getCell(row, column) {
      return { value: rows[row - 1]?.[column - 1] ?? null };
    },
  };
}

const HEADER = [null, null, null, null, null, null, null, null, "C1", "C2", "C3"];
const DATES = [null, null, null, null, null, null, null, null, "1/6", "2/6", "3/6"];

describe("Lahore workbook parser", () => {
  it("reads groups, numbered students, staff and unnumbered candidates", () => {
    const sheet = sheetFromMatrix([
      [], // row 1
      [], // row 2
      HEADER, // row 3
      DATES, // row 4
      [1, "Park Lead One", "0300-9999999", null, null, null, null, "Park Lead", null, null, null],
      ["Group 1 | Murabbi: Alim", null, null, null, null, null, null, null, null, null, null],
      [1, "Alpha Student", "0300-0000000", null, null, null, 12, "Grade 6", "present", "absent", "leave"],
      ["", "Beta Student", "", null, null, null, "", "", "dropout", "", ""],
      [2, "Gamma Student", "0300-1111111", null, null, null, 13, "Grade 7", "absent", "dropout", ""],
    ]);

    const park = readParkSheet(sheet, "Gulberg", "Gulberg", 2026);

    expect(park.sessionDates).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
    expect(park.staff).toEqual([
      expect.objectContaining({ name: "Park Lead One", canonicalRole: "park_lead" }),
    ]);
    expect(park.groups).toHaveLength(1);
    expect(park.groups[0]).toMatchObject({ name: "Group 1", murabbiLabel: "Alim" });
    expect(park.groups[0].students.map((student) => student.name)).toEqual(["Alpha Student", "Gamma Student"]);
    expect(park.unnumberedCandidates).toHaveLength(1);
    expect(park.unnumberedCandidates[0]).toMatchObject({ name: "Beta Student", group: "Group 1" });
    expect(park.groups[0].students[0].statuses.map((status) => status.date)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });

  it("never reads a group summary/metric row as a participant", () => {
    const sheet = sheetFromMatrix([
      [], // row 1
      [], // row 2
      HEADER, // row 3
      DATES, // row 4
      ["Group 1 | Murabbi: Alim", null, null, null, null, null, null, null, null, null, null],
      [1, "Alpha Student", "0300-0000000", null, null, null, 12, "Grade 6", "present", "absent", "late"],
      // Summary rows: a numeric date-column total would previously satisfy the
      // "has attendance" check, and Strength/Percentage rows a numeric age/grade.
      ["", "Present", null, null, null, null, null, null, 5, 4, 6],
      ["", "Total Present", null, null, null, null, null, null, 5, 4, 6],
      ["", "Attendance Percentage", null, null, null, null, null, null, 83, 66, 100],
      ["", "Strength", null, null, null, null, 14, null, null, null, null],
      ["", "Absent", null, null, null, null, null, null, 1, 2, 0],
      ["", "Late", null, null, null, null, null, null, 0, 1, 1],
      ["", "Leave", null, null, null, null, null, null, 1, 0, 0],
      ["", "Beta Student", "", null, null, null, "", "", "present", "", ""],
      // A valid serial makes the row a real participant even when the name
      // matches a summary label.
      [2, "Late", "0300-2222222", null, null, null, 14, "Grade 8", "present", "present", "absent"],
      [3, "Present", "0300-3333333", null, null, null, 15, "Grade 9", "absent", "present", "late"],
    ]);

    const park = readParkSheet(sheet, "Gulberg", "Gulberg", 2026);

    expect(park.unnumberedCandidates.map((candidate) => candidate.name)).toEqual(["Beta Student"]);
    expect(park.groups[0].students.map((student) => student.name)).toEqual(["Alpha Student", "Late", "Present"]);
    for (const label of ["Present", "Total Present", "Attendance Percentage", "Strength", "Absent", "Late", "Leave"]) {
      expect(isNonParticipantLabel(label)).toBe(true);
    }
    expect(isNonParticipantLabel("  attendance   percentage ")).toBe(true);
    expect(isNonParticipantLabel("Alpha Student")).toBe(false);
  });

  it("rolls the year over when a session month wraps", () => {
    expect(parseSessionDates(["1/12", "1/1"], 2026)).toEqual(["2026-12-01", "2027-01-01"]);
  });

  it("classifies marks, ignores, weekend OFF formulas and dropout cells", () => {
    expect(classifyStatus("present")).toEqual({ kind: "record", target: "present" });
    expect(classifyStatus("leave")).toEqual({ kind: "record", target: "excused" });
    expect(classifyStatus("Sat Off")).toEqual({ kind: "ignored" });
    expect(classifyStatus("DROPout")).toEqual({ kind: "review", code: "dropout" });
    expect(classifyStatus("???")).toEqual({ kind: "review", code: "malformed_attendance_value" });
    expect(classifyStatus({ formula: 'IF(OR(...OFF Weekends...),"OFF","")' })).toEqual({ kind: "ignored" });
  });

  it("derives a non-reversible fingerprint from the source fields", () => {
    const fingerprint = sourceFingerprint("Alpha Student", "0300-0000000", "Gulberg", "Group 1");
    expect(fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprint).not.toContain("Alpha");
  });
});
