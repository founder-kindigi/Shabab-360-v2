/**
 * Guarded cleanup for the seven ATT01 browser-test sessions that were created
 * after the Batch 4 workbook import. This is intentionally local SQLite only:
 * it never reads environment configuration and it cannot accept a URL or UNC
 * database path.
 *
 * The targets are a fixed business-key whitelist from the 2026-09-18
 * reconciliation report. A changed or partial target set refuses execution.
 * Audit and operation-receipt history are deliberately retained; only the
 * test attendance record and its empty test events are removed.
 */
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { pktDayStartEpoch } from "./lahore-refresh/pkt-date";
import {
  countForeignKeyViolations,
  createSqliteFileBackup,
  openSqliteDatabase,
  restoreSqliteFileBackup,
  verifySqliteBackupFile,
  type SqliteFileArtifact,
} from "./sqlite-support";

export const ATT01_BROWSER_TEST_EVENT_TARGETS = Object.freeze([
  { park: "Griffin", group: "Group 1", date: "2026-09-19" },
  { park: "Griffin", group: "Group 2", date: "2026-09-19" },
  { park: "Griffin", group: "Group 3", date: "2026-09-19" },
  { park: "Gulshan Ravi", group: "Group 1", date: "2026-09-19" },
  { park: "Gulshan Ravi", group: "Group 2", date: "2026-09-19" },
  { park: "Gulshan Ravi", group: "Group 1", date: "2026-09-20" },
  { park: "Gulshan Ravi", group: "Group 2", date: "2026-09-20" },
] as const);

export interface AttendanceWorkbookBaseline {
  readonly attendanceEvents: number;
  readonly attendanceRecords: number;
  readonly excusedRecords: number;
}

export const ATT01_WORKBOOK_BASELINE: AttendanceWorkbookBaseline = Object.freeze({
  attendanceEvents: 460,
  attendanceRecords: 6210,
  excusedRecords: 668,
});

export interface BrowserTestCleanupTarget {
  readonly id: string;
  readonly park: string;
  readonly group: string;
  readonly date: string;
  readonly isClosed: boolean;
  readonly resetVersion: number;
  readonly recordCount: number;
  readonly operatorExcusedRecordCount: number;
}

export interface BrowserTestCleanupPreflight {
  readonly targets: readonly BrowserTestCleanupTarget[];
  readonly expectedTargetCount: number;
  readonly matchedTargetCount: number;
  readonly attendanceEvents: number;
  readonly attendanceRecords: number;
  readonly excusedRecords: number;
  readonly foreignKeyViolations: number;
}

export interface BrowserTestCleanupInput {
  readonly database: string;
  readonly backupDir: string;
  readonly execute: boolean;
  /** Test-only dependency that is not exposed by the CLI. */
  readonly expectedBaseline?: AttendanceWorkbookBaseline;
}

export interface BrowserTestCleanupResult {
  readonly mode: "dry-run" | "execute";
  readonly writesPerformed: boolean;
  readonly outcome: "dry-run" | "cleaned" | "already-clean";
  readonly before: BrowserTestCleanupPreflight;
  readonly after: BrowserTestCleanupPreflight;
  readonly deletedEvents: number;
  readonly deletedRecords: number;
  readonly backup: SqliteFileArtifact | null;
}

interface EventRow {
  readonly id: string;
  readonly park: string;
  readonly group: string;
  readonly eventDate: number;
  readonly isClosed: number;
  readonly resetVersion: number;
  readonly recordCount: number;
  readonly operatorExcusedRecordCount: number;
}

function assertLocalSqliteTarget(database: string): void {
  if (!database || /^[a-z][a-z0-9+.-]*:\/\//i.test(database) || /^(\\\\|\/\/)/.test(database)) {
    throw new Error("Refusing cleanup: --sqlite-path must be an explicit local SQLite file path");
  }
  if (!fs.existsSync(database)) throw new Error("Refusing cleanup: the local SQLite file does not exist");
}

function dayEnd(date: string): number {
  return pktDayStartEpoch(date) + 86_400_000;
}

function eventRowsForTarget(db: DatabaseSync, target: (typeof ATT01_BROWSER_TEST_EVENT_TARGETS)[number]): EventRow[] {
  return db.prepare(
    'SELECT e."id" AS id, p."name" AS park, g."name" AS "group", e."eventDate" AS eventDate, e."isClosed" AS isClosed, e."resetVersion" AS resetVersion, COUNT(r."id") AS recordCount, SUM(CASE WHEN r."markedBy" IS NOT NULL AND r."status" = \'excused\' THEN 1 ELSE 0 END) AS operatorExcusedRecordCount FROM "attendance_events" e JOIN "groups" g ON g."id" = e."groupId" JOIN "parks" p ON p."id" = g."parkId" LEFT JOIN "attendance_records" r ON r."eventId" = e."id" WHERE p."name" = ? AND g."name" = ? AND e."eventDate" >= ? AND e."eventDate" < ? GROUP BY e."id"'
  ).all(target.park, target.group, pktDayStartEpoch(target.date), dayEnd(target.date)) as unknown as EventRow[];
}

function scalar(db: DatabaseSync, sql: string, ...params: (string | number)[]): number {
  return Number((db.prepare(sql).get(...params) as { count?: number } | undefined)?.count ?? 0);
}

/** Read-only inventory. It returns IDs only to the local caller so no ID is emitted by the CLI. */
export function readBrowserTestCleanupPreflight(database: string): BrowserTestCleanupPreflight {
  assertLocalSqliteTarget(database);
  const db = openSqliteDatabase(database, true);
  try {
    const targets = ATT01_BROWSER_TEST_EVENT_TARGETS.flatMap((target) =>
      eventRowsForTarget(db, target).map((row) => ({
        id: row.id,
        park: row.park,
        group: row.group,
        date: target.date,
        isClosed: row.isClosed === 1,
        resetVersion: row.resetVersion,
        recordCount: row.recordCount,
        operatorExcusedRecordCount: row.operatorExcusedRecordCount ?? 0,
      }))
    );
    return {
      targets,
      expectedTargetCount: ATT01_BROWSER_TEST_EVENT_TARGETS.length,
      matchedTargetCount: targets.length,
      attendanceEvents: scalar(db, 'SELECT COUNT(*) AS count FROM "attendance_events"'),
      attendanceRecords: scalar(db, 'SELECT COUNT(*) AS count FROM "attendance_records"'),
      excusedRecords: scalar(db, 'SELECT COUNT(*) AS count FROM "attendance_records" WHERE "status" = ?', "excused"),
      foreignKeyViolations: countForeignKeyViolations(database),
    };
  } finally {
    db.close();
  }
}

function assertSafeTargetSet(preflight: BrowserTestCleanupPreflight): void {
  if (preflight.foreignKeyViolations > 0) {
    throw new Error(`Refusing cleanup: target has ${preflight.foreignKeyViolations} foreign-key violation(s)`);
  }
  if (preflight.matchedTargetCount !== preflight.expectedTargetCount) {
    throw new Error(`Refusing cleanup: expected exactly ${preflight.expectedTargetCount} browser-test sessions but found ${preflight.matchedTargetCount}`);
  }
  if (preflight.targets.some((target) => target.isClosed)) {
    throw new Error("Refusing cleanup: a browser-test session is closed");
  }
  const recordCount = preflight.targets.reduce((total, target) => total + target.recordCount, 0);
  const operatorExcusedRecordCount = preflight.targets.reduce((total, target) => total + target.operatorExcusedRecordCount, 0);
  if (recordCount !== 1 || operatorExcusedRecordCount !== 1) {
    throw new Error(`Refusing cleanup: expected one operator-written excused record but found ${recordCount} record(s), ${operatorExcusedRecordCount} operator excused`);
  }
}

function assertWorkbookBaseline(preflight: BrowserTestCleanupPreflight, expected: AttendanceWorkbookBaseline): void {
  const failures: string[] = [];
  if (preflight.attendanceEvents !== expected.attendanceEvents) failures.push(`events=${preflight.attendanceEvents}`);
  if (preflight.attendanceRecords !== expected.attendanceRecords) failures.push(`records=${preflight.attendanceRecords}`);
  if (preflight.excusedRecords !== expected.excusedRecords) failures.push(`excused=${preflight.excusedRecords}`);
  if (preflight.foreignKeyViolations > 0) failures.push(`foreignKeyViolations=${preflight.foreignKeyViolations}`);
  if (failures.length > 0) throw new Error(`Post-cleanup verification failed: ${failures.join(", ")}`);
}

function deleteTargets(database: string, targets: readonly BrowserTestCleanupTarget[]): { deletedEvents: number; deletedRecords: number } {
  const db = openSqliteDatabase(database);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("BEGIN IMMEDIATE");
    try {
      const placeholders = targets.map(() => "?").join(",");
      const ids = targets.map((target) => target.id);
      const deletedRecords = Number(db.prepare(`DELETE FROM "attendance_records" WHERE "eventId" IN (${placeholders})`).run(...ids).changes);
      const deletedEvents = Number(db.prepare(`DELETE FROM "attendance_events" WHERE "id" IN (${placeholders})`).run(...ids).changes);
      if (deletedRecords !== 1 || deletedEvents !== ATT01_BROWSER_TEST_EVENT_TARGETS.length) {
        throw new Error(`Unexpected delete count (events=${deletedEvents}, records=${deletedRecords})`);
      }
      db.exec("COMMIT");
      return { deletedEvents, deletedRecords };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
}

/**
 * Removes only the audited browser-test attendance artefacts after a verified
 * backup. Any failed delete or verification restores the complete backup.
 */
export async function cleanupAtt01BrowserTestSessions(input: BrowserTestCleanupInput): Promise<BrowserTestCleanupResult> {
  assertLocalSqliteTarget(input.database);
  const before = readBrowserTestCleanupPreflight(input.database);
  const expected = input.expectedBaseline ?? ATT01_WORKBOOK_BASELINE;

  if (!input.execute) {
    return { mode: "dry-run", writesPerformed: false, outcome: "dry-run", before, after: before, deletedEvents: 0, deletedRecords: 0, backup: null };
  }

  if (before.matchedTargetCount === 0) {
    assertWorkbookBaseline(before, expected);
    return { mode: "execute", writesPerformed: false, outcome: "already-clean", before, after: before, deletedEvents: 0, deletedRecords: 0, backup: null };
  }
  if (!input.backupDir) throw new Error("Refusing cleanup without a verified --backup-dir");
  assertSafeTargetSet(before);

  const backup = await createSqliteFileBackup({ path: input.database, backupDir: input.backupDir }, "att01-browser-test-cleanup");
  await verifySqliteBackupFile(backup);
  try {
    const deleted = deleteTargets(input.database, before.targets);
    const after = readBrowserTestCleanupPreflight(input.database);
    if (after.matchedTargetCount !== 0) throw new Error(`Post-cleanup verification failed: ${after.matchedTargetCount} browser-test session(s) remain`);
    assertWorkbookBaseline(after, expected);
    return { mode: "execute", writesPerformed: true, outcome: "cleaned", before, after, ...deleted, backup };
  } catch (error) {
    restoreSqliteFileBackup(backup, { path: input.database });
    throw error;
  }
}
