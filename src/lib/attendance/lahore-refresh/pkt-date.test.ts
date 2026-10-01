import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { parseISO } from "date-fns";
import { attendanceDateStart } from "@/lib/attendance/schedule";
import { fromPKT } from "@/lib/timezone";
import { pktDayEndEpoch, pktDayStart, pktDayStartEpoch } from "./pkt-date";

const SESSION_DATE = "2026-05-23";
const UTC_MIDNIGHT = Date.parse(`${SESSION_DATE}T00:00:00.000Z`);

describe("Pakistan-time workbook date conversion", () => {
  it("matches the attendance API session instant exactly", () => {
    expect(pktDayStart(SESSION_DATE).getTime()).toBe(attendanceDateStart(SESSION_DATE).getTime());
    expect(pktDayStartEpoch(SESSION_DATE)).toBe(fromPKT(parseISO(SESSION_DATE)).getTime());
  });

  it("lands on Pakistan-time midnight, not UTC midnight", () => {
    expect(pktDayStart(SESSION_DATE).toISOString()).toBe("2026-05-22T19:00:00.000Z");
    expect(pktDayStartEpoch(SESSION_DATE) - UTC_MIDNIGHT).toBe(-5 * 60 * 60 * 1000);
  });

  it("spans exactly one Pakistan-time day", () => {
    expect(pktDayEndEpoch(SESSION_DATE) - pktDayStartEpoch(SESSION_DATE)).toBe(86_400_000 - 1);
  });

  it("rejects a non-canonical workbook date", () => {
    expect(() => pktDayStart("2026-5-3")).toThrow();
    expect(() => pktDayStart("not-a-date")).toThrow();
  });

  it("cannot create a second event for an already-imported group and date", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec('CREATE TABLE "attendance_events" ("id" TEXT PRIMARY KEY, "groupId" TEXT NOT NULL, "eventDate" INTEGER NOT NULL)');
      db.prepare('INSERT INTO "attendance_events" ("id","groupId","eventDate") VALUES (?,?,?)').run(
        "imported-event",
        "group-1",
        pktDayStartEpoch(SESSION_DATE)
      );
      const matching = db
        .prepare('SELECT COUNT(*) AS count FROM "attendance_events" WHERE "groupId" = ? AND "eventDate" = ?')
        .get("group-1", pktDayStartEpoch(SESSION_DATE)) as { count: number };
      const stale = db
        .prepare('SELECT COUNT(*) AS count FROM "attendance_events" WHERE "groupId" = ? AND "eventDate" = ?')
        .get("group-1", UTC_MIDNIGHT) as { count: number };

      // The prepare route dedupes on this exact value, so the imported session is found.
      expect(matching.count).toBe(1);
      // A UTC-midnight value would have missed it and created a duplicate session.
      expect(stale.count).toBe(0);
    } finally {
      db.close();
    }
  });
});
