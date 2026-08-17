import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readMigration = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe.each([
  "prisma/migrations/20260810193000_add_park_staff_attendance/migration.sql",
  "prisma/postgres/migrations/20260810193000_add_park_staff_attendance/migration.sql",
])("canonical staff attendance migration %s", (migrationPath) => {
  const sql = readMigration(migrationPath);

  it("creates the canonical park-scoped attendance tables", () => {
    expect(sql).toContain('CREATE TABLE "park_staff_attendance_events"');
    expect(sql).toContain('CREATE TABLE "park_staff_attendance_records"');
  });

  it("preserves park, event, and staff foreign-key relationships", () => {
    expect(sql).toContain('REFERENCES "parks"');
    expect(sql).toContain('REFERENCES "park_staff_attendance_events"');
    expect(sql).toContain('REFERENCES "staff_meta"');
  });
});

describe.each([
  "prisma/migrations/20260817090000_add_attendance_schedule/migration.sql",
  "prisma/postgres/migrations/20260817090000_add_attendance_schedule/migration.sql",
])("attendance schedule migration %s", (migrationPath) => {
  const sql = readMigration(migrationPath);

  it("does not recreate existing attendance tables or indexes", () => {
    expect(sql).not.toContain('CREATE TABLE "staff_attendance_events"');
    expect(sql).not.toContain('CREATE TABLE "park_staff_attendance_events"');
    expect(sql).not.toContain('attendance_events_groupId_eventDate_key');
  });
});
