// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AttendanceReportPrint, type AttendanceReportData } from "./attendance-report-print";

afterEach(() => cleanup());

const report: AttendanceReportData = {
  data: [
    {
      eventDate: "2026-08-16",
      eventTitle: "Session",
      participantName: "Alpha Student",
      groupName: "Group 1",
      batchName: "Batch 4",
      parkName: "Park One",
      cityName: "Lahore",
      status: "excused",
      markedByName: null,
      markedAt: "2026-08-16T00:00:00.000Z",
    },
  ],
  summary: {
    totalEvents: 1,
    totalRecords: 1,
    presentRate: 0,
    absentRate: 0,
    statusCounts: { present: 0, absent: 0, late: 0, excused: 1 },
    scopeLabel: "Park One",
    dateRange: { from: "2026-08-16", to: "2026-08-16" },
  },
};

describe("AttendanceReportPrint terminology", () => {
  it("prints Excuse while the record status stays excused", () => {
    const { container } = render(<AttendanceReportPrint report={report} onClose={vi.fn()} />);

    expect(container.textContent).toContain("Excuse: 1");
    expect(container.textContent).not.toContain("Leave");
    expect(report.data[0].status).toBe("excused");
  });
});
