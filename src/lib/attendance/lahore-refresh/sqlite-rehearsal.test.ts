import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { PRESERVED_TABLES } from "./reset-plan";
import { createSqliteRefreshReader, importSqliteManifest, openRefreshDatabase, resetSqliteData } from "./sqlite-driver";
import {
  buildSyntheticRefreshManifest,
  createRefreshFixtureDatabase,
  FIXTURE_SEEDED_TABLES,
  FIXTURE_SUPER_ADMIN_STAFF_ID,
  FIXTURE_SUPER_ADMIN_USER_ID,
  fixtureScalar,
} from "./test-support";
import { verifyRefresh } from "./verify";

let dir: string;
let fixturePath: string;
let workingPath: string;

function openWorking(): DatabaseSync {
  const db = openRefreshDatabase(workingPath);
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

function foreignKeyViolations(db: DatabaseSync): number {
  return (db.prepare("PRAGMA foreign_key_check").all() as unknown[]).length;
}

describe("Lahore refresh disposable SQLite rehearsal", () => {
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "lahore-rehearsal-"));
    fixturePath = path.join(dir, "fixture.db");
    workingPath = path.join(dir, "working.db");
    createRefreshFixtureDatabase(fixturePath);
    fs.copyFileSync(fixturePath, workingPath);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("works on a disposable copy and never on the real development database", () => {
    expect(dir.startsWith(os.tmpdir())).toBe(true);
    expect(fixturePath).not.toContain("prisma");
    expect(workingPath).not.toBe(path.resolve("prisma/dev.db"));

    const db = openWorking();
    try {
      expect(fixtureScalar(db, "cities")).toBe(1);
      expect(fixtureScalar(db, "participants")).toBe(1);
      expect(fixtureScalar(db, "attendance_records")).toBe(1);
      for (const table of FIXTURE_SEEDED_TABLES) expect(fixtureScalar(db, table)).toBe(1);
      expect(fixtureScalar(db, "users")).toBe(2);
    } finally {
      db.close();
    }
  });

  it("removes every non-allowlisted application row while keeping Super Admin identity and metadata", () => {
    resetSqliteData(workingPath);

    const db = openWorking();
    try {
      const fixtureTables = (
        db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]
      ).map((row) => row.name);
      for (const table of fixtureTables) {
        // Preserved tables and the two Super-Admin-scoped tables are checked below.
        if (PRESERVED_TABLES.includes(table) || table === "users" || table === "staff_meta") continue;
        expect(fixtureScalar(db, table), `${table} should be empty`).toBe(0);
      }
      for (const table of FIXTURE_SEEDED_TABLES) expect(fixtureScalar(db, table)).toBe(0);

      // Only the Super Admin user and its StaffMeta survive.
      expect(fixtureScalar(db, "users")).toBe(1);
      expect(fixtureScalar(db, "staff_meta")).toBe(1);
      const superUser = db.prepare('SELECT "isActive" AS "isActive" FROM "users" WHERE "id" = ?').get(FIXTURE_SUPER_ADMIN_USER_ID) as { isActive: number };
      const superMeta = db.prepare('SELECT "role" AS "role", "isActive" AS "isActive" FROM "staff_meta" WHERE "id" = ?').get(FIXTURE_SUPER_ADMIN_STAFF_ID) as { role: string; isActive: number };
      expect(superUser.isActive).toBe(1);
      expect(superMeta).toEqual({ role: "super_admin", isActive: 1 });

      // Migrations and approved capability-override configuration are preserved.
      for (const table of PRESERVED_TABLES) expect(fixtureScalar(db, table)).toBe(1);

      expect(foreignKeyViolations(db)).toBe(0);
    } finally {
      db.close();
    }
  });

  it("imports the manifest, leaves staff accounts inactive and keeps no records after the cutoff", async () => {
    const manifest = buildSyntheticRefreshManifest();
    resetSqliteData(workingPath);
    const counts = await importSqliteManifest(workingPath, manifest);

    expect(counts).toEqual({
      parks: manifest.counts.parks,
      groups: manifest.counts.groups,
      participants: manifest.counts.participants,
      staffPlaceholders: manifest.counts.staffPlaceholders,
      attendanceEvents: manifest.counts.attendanceEvents,
      attendanceRecords: manifest.counts.attendanceRecords,
      calendarDates: manifest.counts.calendarDates,
    });

    const db = openWorking();
    try {
      expect(fixtureScalar(db, "cities")).toBe(1);
      expect(fixtureScalar(db, "parks")).toBe(manifest.counts.parks);
      expect(fixtureScalar(db, "groups")).toBe(manifest.counts.groups);
      expect(fixtureScalar(db, "participants")).toBe(manifest.counts.participants);
      expect(fixtureScalar(db, "attendance_events")).toBe(manifest.counts.attendanceEvents);
      expect(fixtureScalar(db, "attendance_records")).toBe(manifest.counts.attendanceRecords);
      expect(fixtureScalar(db, "batch_class_dates")).toBe(manifest.counts.calendarDates);

      // One active batch per city, and only the Super Admin is active.
      const activeBatches = db.prepare('SELECT COUNT(*) AS count FROM "batches" WHERE "isActive" = 1').get() as { count: number };
      expect(activeBatches.count).toBe(1);
      expect(fixtureScalar(db, "users")).toBe(1 + manifest.counts.staffPlaceholders);
      const activeNonSuper = db
        .prepare('SELECT COUNT(*) AS count FROM "users" u LEFT JOIN "staff_meta" s ON s."userId" = u."id" WHERE u."isActive" = 1 AND (s."role" IS NULL OR s."role" <> ?)')
        .get("super_admin") as { count: number };
      expect(activeNonSuper.count).toBe(0);

      expect(foreignKeyViolations(db)).toBe(0);

      const reader = createSqliteRefreshReader(db, manifest);
      expect(await reader.countAttendanceRecordsAfter(manifest.attendanceThrough)).toBe(0);
      const report = await verifyRefresh(reader, manifest);
      expect(report.failures).toEqual([]);
      expect(report.ok).toBe(true);
    } finally {
      db.close();
    }
  });
});
