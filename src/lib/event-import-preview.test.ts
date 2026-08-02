import { describe, expect, it } from "vitest";

const parser = await import("../../scripts/event-import-preview.cjs");

describe("EVENT-006 Event Workbook Import & Zero-Write Preview", () => {
  it("requires explicit operator context (eventCode and cityCode)", () => {
    expect(() =>
      parser.buildEventPreviewReport(
        { records: [], errors: [] },
        { eventCode: "", cityCode: "LHR" }
      )
    ).toThrow("Event code and city code must be explicitly provided");
  });

  it("redacts phone PII in output reports", () => {
    expect(parser.redactPhone("03001234567")).toBe("0300****567");
  });

  it("blocks foreign event and city scope rows", () => {
    const parsed = parser.parseEventRows(
      [
        {
          sourceReference: "EVT-1",
          eventCode: "FOREIGN-EVT",
          cityCode: "LHR",
          participantName: "Student A",
        },
      ],
      { expectedEventCode: "CAMP-2026", expectedCityCode: "LHR" }
    );

    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0].code).toBe("foreign_event_scope");
  });

  it("flags duplicate registrations and unmatched participants", () => {
    const parsed = parser.parseEventRows(
      [
        {
          sourceReference: "EVT-DUP",
          eventCode: "CAMP-2026",
          cityCode: "LHR",
          participantReference: "UNMATCHED-PART",
          participantName: "Student A",
        },
        {
          sourceReference: "EVT-DUP",
          eventCode: "CAMP-2026",
          cityCode: "LHR",
          participantReference: "UNMATCHED-PART",
          participantName: "Student A",
        },
      ],
      {
        expectedEventCode: "CAMP-2026",
        expectedCityCode: "LHR",
        knownParticipants: ["PART-101"],
      }
    );

    const codes = parsed.errors.map((e: any) => e.code);
    expect(codes).toContain("duplicate_registration");
    expect(codes).toContain("unmatched_participant_candidate");
  });

  it("builds zero-write preview report with zero database writes", () => {
    const report = parser.buildEventPreviewReport(
      {
        records: [
          {
            sourceReference: "EVT-1",
            participantName: "Student A",
            isMatched: true,
          },
        ],
        errors: [],
      },
      { eventCode: "CAMP-2026", cityCode: "LHR" }
    );

    expect(report.mode).toBe("zero_write_preview");
    expect(report.writesPerformed).toBe(false);
    expect(report.target).toEqual({ eventCode: "CAMP-2026", cityCode: "LHR" });
    expect(report.metrics.validRegistrations).toBe(1);
  });
});
