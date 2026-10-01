import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  ATT01_BROWSER_TEST_EVENT_TARGETS,
  cleanupAtt01BrowserTestSessions,
  readBrowserTestCleanupPreflight,
} from "./browser-test-cleanup";
import { pktDayStartEpoch } from "./lahore-refresh/pkt-date";

let directory: string;
let database: string;

const expectedBaseline = { attendanceEvents: 1, attendanceRecords: 0, excusedRecords: 0 } as const;

function createFixture(options: { omitLastTarget?: boolean; extraTargetRecord?: boolean } = {}): void {
  const db = new DatabaseSync(database);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    db.exec('CREATE TABLE "parks" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL)');
    db.exec('CREATE TABLE "groups" ("id" TEXT PRIMARY KEY, "parkId" TEXT NOT NULL REFERENCES "parks"("id"), "name" TEXT NOT NULL)');
    db.exec('CREATE TABLE "attendance_events" ("id" TEXT PRIMARY KEY, "groupId" TEXT NOT NULL REFERENCES "groups"("id"), "eventDate" INTEGER NOT NULL, "isClosed" INTEGER NOT NULL DEFAULT 0, "resetVersion" INTEGER NOT NULL DEFAULT 0)');
    db.exec('CREATE TABLE "attendance_records" ("id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL REFERENCES "attendance_events"("id") ON DELETE CASCADE, "participantId" TEXT NOT NULL, "status" TEXT NOT NULL, "markedBy" TEXT)');
    db.prepare('INSERT INTO "parks" ("id","name") VALUES (?,?)').run("park-griffin", "Griffin");
    db.prepare('INSERT INTO "parks" ("id","name") VALUES (?,?)').run("park-ravi", "Gulshan Ravi");
    for (const [index, target] of ATT01_BROWSER_TEST_EVENT_TARGETS.entries()) {
      if (options.omitLastTarget && index === ATT01_BROWSER_TEST_EVENT_TARGETS.length - 1) continue;
      const parkId = target.park === "Griffin" ? "park-griffin" : "park-ravi";
      const groupId = `${parkId}-${target.group}`;
      db.prepare('INSERT OR IGNORE INTO "groups" ("id","parkId","name") VALUES (?,?,?)').run(groupId, parkId, target.group);
      const eventId = `target-${index}`;
      db.prepare('INSERT INTO "attendance_events" ("id","groupId","eventDate","isClosed","resetVersion") VALUES (?,?,?,?,?)').run(eventId, groupId, pktDayStartEpoch(target.date), 0, target.group === "Group 2" && target.date === "2026-09-19" ? 2 : 0);
      if (target.park === "Griffin" && target.group === "Group 2" && target.date === "2026-09-19") {
        db.prepare('INSERT INTO "attendance_records" ("id","eventId","participantId","status","markedBy") VALUES (?,?,?,?,?)').run("operator-record", eventId, "participant-1", "excused", "user-1");
        if (options.extraTargetRecord) {
          db.prepare('INSERT INTO "attendance_records" ("id","eventId","participantId","status","markedBy") VALUES (?,?,?,?,?)').run("unexpected-record", eventId, "participant-2", "present", "user-1");
        }
      }
    }
    db.prepare('INSERT INTO "groups" ("id","parkId","name") VALUES (?,?,?)').run("imported-group", "park-griffin", "Imported Group");
    db.prepare('INSERT INTO "attendance_events" ("id","groupId","eventDate","isClosed","resetVersion") VALUES (?,?,?,?,?)').run("imported-event", "imported-group", pktDayStartEpoch("2026-09-12"), 1, 0);
  } finally {
    db.close();
  }
}

function rowCount(table: string): number {
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    return Number((db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number }).count);
  } finally {
    db.close();
  }
}

describe("ATT01 browser-test cleanup", () => {
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "att01-browser-cleanup-"));
    database = path.join(directory, "fixture.db");
    createFixture();
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("reports the exact target set in a read-only dry run", async () => {
    const before = readBrowserTestCleanupPreflight(database);
    const result = await cleanupAtt01BrowserTestSessions({ database, backupDir: path.join(directory, "backups"), execute: false, expectedBaseline });

    expect(result).toMatchObject({ mode: "dry-run", writesPerformed: false, outcome: "dry-run", deletedEvents: 0, deletedRecords: 0 });
    expect(result.before.matchedTargetCount).toBe(7);
    expect(result.before.targets.reduce((total, target) => total + target.recordCount, 0)).toBe(1);
    expect(readBrowserTestCleanupPreflight(database)).toEqual(before);
    expect(fs.existsSync(path.join(directory, "backups"))).toBe(false);
  });

  it("backs up, deletes only the whitelisted record and events, and verifies the baseline", async () => {
    const result = await cleanupAtt01BrowserTestSessions({ database, backupDir: path.join(directory, "backups"), execute: true, expectedBaseline });

    expect(result).toMatchObject({ mode: "execute", writesPerformed: true, outcome: "cleaned", deletedEvents: 7, deletedRecords: 1 });
    expect(result.after.matchedTargetCount).toBe(0);
    expect(rowCount("attendance_events")).toBe(1);
    expect(rowCount("attendance_records")).toBe(0);
    expect(fs.existsSync(String(result.backup?.path))).toBe(true);
    const backup = new DatabaseSync(String(result.backup?.path), { readOnly: true });
    try {
      expect(Number((backup.prepare('SELECT COUNT(*) AS count FROM "attendance_events"').get() as { count: number }).count)).toBe(8);
      expect(Number((backup.prepare('SELECT COUNT(*) AS count FROM "attendance_records"').get() as { count: number }).count)).toBe(1);
    } finally {
      backup.close();
    }
  });

  it("refuses a partial or changed target set without creating a backup", async () => {
    fs.rmSync(database);
    createFixture({ omitLastTarget: true });
    await expect(cleanupAtt01BrowserTestSessions({ database, backupDir: path.join(directory, "backups"), execute: true, expectedBaseline })).rejects.toThrow(/expected exactly 7/);
    expect(rowCount("attendance_events")).toBe(7);
    expect(fs.existsSync(path.join(directory, "backups"))).toBe(false);
  });

  it("refuses an unexpected extra record and leaves the database intact", async () => {
    fs.rmSync(database);
    createFixture({ extraTargetRecord: true });
    await expect(cleanupAtt01BrowserTestSessions({ database, backupDir: path.join(directory, "backups"), execute: true, expectedBaseline })).rejects.toThrow(/expected one operator-written excused record/);
    expect(rowCount("attendance_events")).toBe(8);
    expect(rowCount("attendance_records")).toBe(2);
  });
});
