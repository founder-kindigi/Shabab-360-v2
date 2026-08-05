/**
 * Export & Report Formatter Helper for Shabab 360
 * Generates formatted CSV payloads for attendance records, fee reports, and retention watchlists.
 */

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface AttendanceCsvRow {
  studentName: string;
  parkName: string;
  groupName: string;
  status: string;
  date: string;
}

export interface FeeReportCsvRow {
  studentName: string;
  guardianName: string;
  amount: number;
  status: string;
  dueDate: string;
}

export function generateAttendanceReportCsv(rows: AttendanceCsvRow[]): string {
  const headers = ["Student Name", "Park Name", "Group Name", "Attendance Status", "Date"];
  const csvLines = [headers.join(",")];

  for (const row of rows) {
    const line = [
      escapeCsvCell(row.studentName),
      escapeCsvCell(row.parkName),
      escapeCsvCell(row.groupName),
      escapeCsvCell(row.status),
      escapeCsvCell(row.date),
    ].join(",");
    csvLines.push(line);
  }

  return csvLines.join("\r\n");
}

export function generateFeeReportCsv(rows: FeeReportCsvRow[]): string {
  const headers = ["Student Name", "Guardian Name", "Amount (PKR)", "Payment Status", "Due Date"];
  const csvLines = [headers.join(",")];

  for (const row of rows) {
    const line = [
      escapeCsvCell(row.studentName),
      escapeCsvCell(row.guardianName),
      escapeCsvCell(row.amount),
      escapeCsvCell(row.status),
      escapeCsvCell(row.dueDate),
    ].join(",");
    csvLines.push(line);
  }

  return csvLines.join("\r\n");
}
