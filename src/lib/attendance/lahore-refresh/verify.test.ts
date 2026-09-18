import { describe, expect, it } from "vitest";
import { verifyRefresh } from "./verify";
import type { RefreshManifest, RefreshReader } from "./types";

const manifest = {
  version: 1,
  city: { name: "Lahore", code: "LHR" },
  batch: { name: "Batch 4", startDate: "2026-05-23", endDate: "2027-01-31" },
  attendanceThrough: "2026-09-13",
  parks: [],
  groups: [],
  participants: [],
  staff: [{}, {}],
  events: [],
  calendarDates: [],
  counts: {
    parks: 6,
    groups: 18,
    participants: 40,
    staffPlaceholders: 2,
    attendanceEvents: 5,
    attendanceRecords: 30,
    calendarDates: 9,
    historicalCalendarDates: 6,
    futureCalendarDates: 3,
    participantsMissingPhone: 1,
    participantsWithDropout: 0,
    statusTotals: { present: 0, absent: 0, late: 0, excused: 0 },
  },
} as unknown as RefreshManifest;

interface ReaderValues {
  readonly tables?: Readonly<Record<string, number>>;
  readonly superAdmin?: number;
  readonly other?: number;
  readonly foreignCities?: number;
  readonly foreignParks?: number;
  readonly withoutGroup?: number;
  readonly withoutBatch?: number;
  readonly afterCutoff?: number;
}

const GOOD_TABLES = {
  cities: 1,
  parks: 6,
  groups: 18,
  participants: 40,
  attendance_events: 5,
  attendance_records: 30,
  batch_class_dates: 9,
  users: 3,
};

function makeReader(values: ReaderValues = {}): RefreshReader {
  const tables = values.tables ?? GOOD_TABLES;
  return {
    countTable: async (table) => tables[table] ?? 0,
    countActiveUsersByRole: async () => ({ superAdmin: values.superAdmin ?? 1, other: values.other ?? 0 }),
    countCitiesOtherThanLahore: async () => values.foreignCities ?? 0,
    countParksOutsideLahore: async () => values.foreignParks ?? 0,
    countParticipantsWithoutGroup: async () => values.withoutGroup ?? 0,
    countGroupsWithoutBatch: async () => values.withoutBatch ?? 0,
    countAttendanceRecordsAfter: async () => values.afterCutoff ?? 0,
  };
}

describe("Lahore refresh verification", () => {
  it("passes when counts, hierarchy and account state all match", async () => {
    const report = await verifyRefresh(makeReader(), manifest);
    expect(report.ok).toBe(true);
    expect(report.failures).toEqual([]);
  });

  it("fails when a non-Lahore city or park survives the reset", async () => {
    const report = await verifyRefresh(makeReader({ foreignCities: 1, foreignParks: 2 }), manifest);
    expect(report.ok).toBe(false);
    expect(report.failures).toEqual(expect.arrayContaining(["cityIsLahoreOnly", "noForeignParks"]));
  });

  it("fails when any non-Super-Admin account stays active", async () => {
    const report = await verifyRefresh(makeReader({ other: 1 }), manifest);
    expect(report.ok).toBe(false);
    expect(report.failures).toContain("onlySuperAdminsActive");
  });

  it("fails when an attendance record exists after the completed-through date", async () => {
    const report = await verifyRefresh(makeReader({ afterCutoff: 2 }), manifest);
    expect(report.ok).toBe(false);
    expect(report.failures).toContain("noRecordsAfterCutoff");
  });

  it("fails on a count mismatch or an ungrouped participant", async () => {
    const report = await verifyRefresh(makeReader({ tables: { ...GOOD_TABLES, parks: 7 }, withoutGroup: 3 }), manifest);
    expect(report.ok).toBe(false);
    expect(report.failures).toEqual(expect.arrayContaining(["parks", "expectedParks", "participantsAllGrouped"]));
  });
});
