import { describe, expect, it } from "vitest";

const parser = await import("../../scripts/lahore-batch-4-dry-run.cjs");

describe("Lahore Batch 4 dry-run report", () => {
  it("rolls scheduled January sessions into the following year", () => {
    expect(parser.parseSessionDates(["30/12", "31/12", "02/01"], 2026)).toEqual(["2026-12-30", "2026-12-31", "2027-01-02"]);
  });

  it("does not treat formula-driven group summary rows as people", () => {
    expect(parser.isSourceDataRow(1)).toBe(true);
    expect(parser.isSourceDataRow("23")).toBe(true);
    expect(parser.isSourceDataRow("Group Strength")).toBe(false);
    expect(parser.isGroupSummaryLabel("Strength")).toBe(true);
    expect(parser.isGroupSummaryLabel("Attendance Percentage")).toBe(true);
    expect(parser.isGroupSummaryLabel("A participant name")).toBe(false);
  });

  it("treats the workbook's weekend OFF formulas as non-attendance", () => {
    expect(parser.classifyStatus({ formula: "IF('⚙ OFF Weekends'!$D$4=\"OFF\",\"OFF\",\"\")" })).toEqual({ kind: "ignored" });
  });

  it("withholds attendance until the owner confirms a completed-through date", () => {
    const report = parser.buildDryRunReport({ parks: [{ sheetName: "Gulberg", parkName: "Gulberg", sessionDates: ["2026-05-23"], staff: [], groups: [{ name: "Group 1", murabbiLabel: "Murabbi", sourceRef: "Gulberg!A5", students: [{ sourceRef: "Gulberg!6", fingerprint: "student-1", hasPhone: true, hasAge: false, grade: "", statuses: [{ date: "2026-05-23", value: "Present" }] }] }] }], completedThrough: undefined, generatedAt: "2026-07-19T00:00:00.000Z" });
    expect(report.attendanceEligibility.proposedRecords).toBe(0);
    expect(report.attendance.statusTotals.withheld).toBe(1);
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "completed_through_required" })]));
  });

  it("maps valid student attendance and blocks malformed or dropout values without leaking identity", () => {
    const report = parser.buildDryRunReport({ parks: [{ sheetName: "Gulberg", parkName: "Gulberg", sessionDates: ["2026-05-23", "2026-05-24"], staff: [], unnumberedCandidates: [{ sourceRef: "Gulberg!99", group: "Group 1", hasPhone: false, grade: null }], groups: [{ name: "Group 1", murabbiLabel: "Murabbi", sourceRef: "Gulberg!A5", students: [{ sourceRef: "Gulberg!6", fingerprint: "student-1", hasPhone: false, hasAge: true, grade: "10th", statuses: [{ date: "2026-05-23", value: "Present" }, { date: "2026-05-23", value: "Absent(" }, { date: "2026-05-23", value: "Dropout" }, { date: "2026-05-24", value: "Dropout" }, { date: "2026-05-23", value: "OFF" }] }] }] }], completedThrough: "2026-05-24", generatedAt: "2026-07-19T00:00:00.000Z" });
    expect(report.attendance.statusTotals).toMatchObject({ present: 1, ignored: 1, review: 2 });
    expect(report.attendanceEligibility.proposedRecords).toBe(1);
    const issueCodes = report.issues.map((issue) => issue.code).filter((code): code is string => typeof code === "string");
    expect(issueCodes).toEqual(expect.arrayContaining(["malformed_attendance_value", "dropout_requires_owner_decision", "unnumbered_student_candidate", "profile_schema_deployment_required"]));
    expect(JSON.stringify(report)).not.toContain("student name");
  });
});
