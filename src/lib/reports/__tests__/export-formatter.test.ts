import { describe, it, expect } from "vitest";
import {
  generateAttendanceReportCsv,
  generateFeeReportCsv,
  AttendanceCsvRow,
  FeeReportCsvRow,
} from "../export-formatter";

describe("Export & Report Formatter", () => {
  it("formats attendance records into valid CSV with headers and escaped values", () => {
    const attendanceRows: AttendanceCsvRow[] = [
      { studentName: "Ali Raza, Muhammad", parkName: "State Life Park", groupName: "Group 01", status: "present", date: "2026-08-03" },
      { studentName: "Zaid Usman", parkName: "Model Town Park", groupName: "Group 02", status: "absent", date: "2026-08-03" },
    ];

    const csv = generateAttendanceReportCsv(attendanceRows);
    expect(csv).toContain("Student Name,Park Name,Group Name,Attendance Status,Date");
    expect(csv).toContain('"Ali Raza, Muhammad"');
    expect(csv).toContain("State Life Park");
  });

  it("formats fee report records into valid CSV", () => {
    const feeRows: FeeReportCsvRow[] = [
      { studentName: "Hamza Farooq", guardianName: "Farooq Omar", amount: 1500, status: "paid", dueDate: "2026-08-01" },
    ];

    const csv = generateFeeReportCsv(feeRows);
    expect(csv).toContain("Student Name,Guardian Name,Amount (PKR),Payment Status,Due Date");
    expect(csv).toContain("Hamza Farooq");
    expect(csv).toContain("1500");
  });
});
