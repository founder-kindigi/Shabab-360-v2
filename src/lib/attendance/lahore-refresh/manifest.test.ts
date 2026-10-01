import { describe, expect, it } from "vitest";
import { buildDryRunSummary, buildRefreshManifest, earliestDropoutDate, placeholderStaffEmail } from "./manifest";
import type {
  ParsedGroup,
  ParsedPark,
  ParsedStaff,
  ParsedStatus,
  ParsedStudent,
  ParsedUnnumberedCandidate,
} from "./types";

function status(date: string, value: unknown): ParsedStatus {
  return { date, value };
}

function student(overrides: Partial<ParsedStudent> & { sourceRef: string }): ParsedStudent {
  return {
    name: "Alpha Student",
    phone: "0300-0000000",
    fingerprint: "fingerprint",
    hasPhone: true,
    age: null,
    grade: "",
    statuses: [],
    ...overrides,
  };
}

function park(overrides: Partial<ParsedPark> = {}): ParsedPark {
  return { sheetName: "Gulberg", parkName: "Gulberg", sessionDates: [], groups: [], staff: [], unnumberedCandidates: [], ...overrides };
}

function group(name: string, students: ParsedStudent[]): ParsedGroup {
  return { name, murabbiLabel: "Alim", sourceRef: "Gulberg!6", students };
}

describe("Lahore refresh manifest", () => {
  it("imports marks only through the completed-through date and keeps later dates as calendar only", () => {
    const manifest = buildRefreshManifest([
      park({
        sessionDates: ["2026-09-12", "2026-09-13", "2026-09-14", "2026-10-01", "2027-01-31"],
        groups: [
          group("Group 1", [
            student({
              sourceRef: "Gulberg!7",
              statuses: [status("2026-09-12", "present"), status("2026-09-13", "absent"), status("2026-09-14", "present"), status("2026-10-01", "late")],
            }),
          ]),
        ],
      }),
    ]);

    expect(manifest.calendarDates).toEqual(["2026-09-12", "2026-09-13", "2026-09-14", "2026-10-01", "2027-01-31"]);
    expect(manifest.counts.futureCalendarDates).toBe(3);
    expect(manifest.counts.historicalCalendarDates).toBe(2);
    expect(manifest.events.map((event) => event.date)).toEqual(["2026-09-12", "2026-09-13"]);
    expect(manifest.counts.attendanceRecords).toBe(2);
    expect(manifest.counts.statusTotals).toEqual({ present: 1, absent: 1, late: 0, excused: 0 });
    expect(manifest.events.every((event) => event.date <= manifest.attendanceThrough)).toBe(true);
  });

  it("turns a workbook Dropout cell into the dropout date and omits later marks", () => {
    const manifest = buildRefreshManifest([
      park({
        sessionDates: ["2026-06-01", "2026-07-01", "2026-08-01", "2026-08-02"],
        groups: [
          group("Group 1", [
            student({
              sourceRef: "Gulberg!7",
              statuses: [status("2026-06-01", "present"), status("2026-07-01", "absent"), status("2026-08-01", "Dropout"), status("2026-08-02", "present")],
            }),
          ]),
        ],
      }),
    ]);

    const participant = manifest.participants[0];
    expect(participant.state).toBe("dropout");
    expect(participant.dropoutAt).toBe("2026-08-01");
    expect(participant.dropoutReason).toBe("Workbook dropout");
    expect(participant.dropoutSource).toBe("import");
    expect(participant.reactivatedAt).toBeNull();
    // Prior marks retained; the mark on and after the dropout date is omitted.
    expect(manifest.events.map((event) => event.date)).toEqual(["2026-06-01", "2026-07-01"]);
    expect(manifest.counts.participantsWithDropout).toBe(1);
    expect(earliestDropoutDate([status("2026-08-05", "Dropout"), status("2026-08-01", "Dropout")], "2026-09-13")).toBe("2026-08-01");
    expect(earliestDropoutDate([status("2026-10-01", "Dropout")], "2026-09-13")).toBeNull();
  });

  it("imports unnumbered rows when their group is explicit and allows a missing phone", () => {
    const candidate: ParsedUnnumberedCandidate = {
      sourceRef: "Gulberg!9",
      name: "Beta Student",
      phone: "",
      fingerprint: "candidate",
      hasPhone: false,
      age: null,
      grade: "",
      group: "Group 1",
      statuses: [status("2026-06-01", "present")],
    };
    const manifest = buildRefreshManifest([
      park({
        sessionDates: ["2026-06-01"],
        groups: [group("Group 1", [student({ sourceRef: "Gulberg!7", hasPhone: false, phone: "" })])],
        unnumberedCandidates: [candidate],
      }),
    ]);

    expect(manifest.participants.map((participant) => participant.name)).toEqual(["Alpha Student", "Beta Student"]);
    expect(manifest.participants.every((participant) => participant.phone === null)).toBe(true);
    expect(manifest.counts.participantsMissingPhone).toBe(2);
  });

  it("keeps staff as inactive placeholders with a reserved email identity", () => {
    const staff: ParsedStaff = { sourceRef: "Gulberg!5", name: "Murabbi One", phone: "0300-1111111", roleLabel: "Murabbi", canonicalRole: "murabbi" };
    const unknown: ParsedStaff = { sourceRef: "Gulberg!6", name: "Helper One", phone: "", roleLabel: "Helper", canonicalRole: null };
    const manifest = buildRefreshManifest([park({ staff: [staff, unknown] })]);

    expect(manifest.staff).toHaveLength(2);
    for (const placeholder of manifest.staff) {
      expect(placeholder.isActive).toBe(false);
      expect(placeholder.mustResetPwd).toBe(true);
      expect(placeholder.email.endsWith("@example.invalid")).toBe(true);
    }
    expect(manifest.staff[0].role).toBe("murabbi");
    expect(manifest.staff[1].role).toBe("pending_assignment");
    expect(placeholderStaffEmail("Gulberg!5")).toMatch(/^staff-refresh\+[0-9a-f]{20}@example\.invalid$/);
  });

  it("reports aggregate counts without names, phones or source references", () => {
    const manifest = buildRefreshManifest([
      park({
        sessionDates: ["2026-06-01"],
        groups: [group("Group 1", [student({ sourceRef: "Gulberg!7", statuses: [status("2026-06-01", "present")] })])],
      }),
    ]);

    const serialized = JSON.stringify(buildDryRunSummary(manifest));
    expect(serialized).toContain('"mode":"dry-run"');
    expect(serialized).toContain('"writesPerformed":false');
    expect(serialized).not.toContain("Alpha Student");
    expect(serialized).not.toContain("0300-0000000");
    expect(serialized).not.toContain("Gulberg!7");
  });
});
