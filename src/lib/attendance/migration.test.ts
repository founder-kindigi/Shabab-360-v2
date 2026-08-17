import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPaths = [
  "prisma/migrations/20260817090000_add_attendance_schedule/migration.sql",
  "prisma/postgres/migrations/20260817090000_add_attendance_schedule/migration.sql",
];

describe.each(migrationPaths)("attendance migration %s", (migrationPath) => {
  const sql = readFileSync(join(process.cwd(), migrationPath), "utf8");

  it("creates staff attendance tables before their indexes", () => {
    const eventTable = sql.indexOf('CREATE TABLE "staff_attendance_events"');
    const recordTable = sql.indexOf('CREATE TABLE "staff_attendance_records"');
    const eventIndex = sql.indexOf('CREATE UNIQUE INDEX "staff_attendance_events_parkId_eventDate_key"');

    expect(eventTable).toBeGreaterThan(-1);
    expect(recordTable).toBeGreaterThan(eventTable);
    expect(eventIndex).toBeGreaterThan(recordTable);
  });

  it("preserves park, event, and staff foreign-key relationships", () => {
    expect(sql).toContain('REFERENCES "parks"');
    expect(sql).toContain('REFERENCES "staff_attendance_events"');
    expect(sql).toContain('REFERENCES "staff_meta"');
  });
});
