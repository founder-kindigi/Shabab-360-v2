import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { readAttendanceSchemaPreflight, reconcileAttendanceSchema } from "../attendance-schema-reconcile";
import { LAHORE_REFRESH } from "./constants";
import { pktDayEndEpoch } from "./pkt-date";

const REPO_ROOT = process.cwd();
const SOURCE_DB = path.join(REPO_ROOT, "prisma", "dev.db");
const WORKBOOK = path.join(REPO_ROOT, "docs", "sheets", "Shabab_Batch_4_Attendance.xlsx");
const CLI = path.join(REPO_ROOT, "scripts", "lahore-batch-4-refresh.ts");
const hasRealInputs = fs.existsSync(SOURCE_DB) && fs.existsSync(WORKBOOK);

if (!hasRealInputs) {
  console.warn("Lahore real-schema rehearsal skipped: prisma/dev.db or the workbook is missing");
}

/** The rehearsal may only ever write to a temp copy, never the real database. */
function assertDisposableTarget(targetPath: string): void {
  const resolved = path.resolve(targetPath);
  if (resolved === path.resolve(SOURCE_DB)) throw new Error("Refusing to target the real development database");
  const tempRoot = path.resolve(os.tmpdir());
  if (!resolved.startsWith(tempRoot + path.sep)) throw new Error("Rehearsal target must live in an OS temp directory");
}

function runCli(args: readonly string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

function scalar(db: DatabaseSync, sql: string, ...params: (string | number)[]): number {
  const row = db.prepare(sql).get(...params) as { count?: number } | undefined;
  return typeof row?.count === "number" ? row.count : 0;
}

describe.skipIf(!hasRealInputs)("Lahore refresh disposable real-schema rehearsal", () => {
  it("refuses to target the real development database", () => {
    expect(() => assertDisposableTarget(SOURCE_DB)).toThrow(/real development database/);
    expect(() => assertDisposableTarget(path.join(REPO_ROOT, "prisma", "rehearsal-copy.db"))).toThrow(/temp directory/);
  });

  it(
    "runs the guarded CLI against a temp copy of the real schema and verifies the result",
    async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lahore-real-rehearsal-"));
      const target = path.join(tmp, "rehearsal.db");
      const backupDir = path.join(tmp, "backups");
      try {
        assertDisposableTarget(target);
        const sourceBefore = fs.statSync(SOURCE_DB);
        fs.copyFileSync(SOURCE_DB, target);

        // 1. Dry run supplies the expected aggregates for the same workbook.
        const dry = runCli(["--input", WORKBOOK, "--output", path.join(tmp, "dry-run")]);
        expect(dry.stderr).not.toMatch(/aborted/i);
        expect(dry.status).toBe(0);
        const drySummary = JSON.parse(dry.stdout) as {
          mode: string;
          writesPerformed: boolean;
          attendanceThrough: string;
          counts: Record<string, number>;
        };
        expect(drySummary.mode).toBe("dry-run");
        expect(drySummary.writesPerformed).toBe(false);
        expect(drySummary.counts.parks).toBe(6);
        expect(drySummary.counts.groups).toBe(18);

        // 2. While the attendance schema is unreconciled the refresh refuses to write.
        const schemaBefore = readAttendanceSchemaPreflight(target);
        expect(schemaBefore.blocked).toBe(false);
        if (!schemaBefore.upToDate) {
          const ungated = runCli([
            "--input",
            WORKBOOK,
            "--execute",
            "--confirm-lahore-refresh",
            "--target",
            "sqlite",
            "--sqlite-path",
            target,
            "--backup-dir",
            backupDir,
          ]);
          expect(ungated.status).toBe(1);
          expect(ungated.stderr).toMatch(/att01-database-compatibility/);
          expect(fs.existsSync(backupDir)).toBe(false);
        }

        // 3. Reconcile the copy first; a no-op when the baseline is already complete.
        const reconciled = await reconcileAttendanceSchema({
          database: target,
          backupDir: path.join(tmp, "schema-backups"),
          execute: true,
        });
        expect(reconciled.after.upToDate).toBe(true);

        const run = runCli([
          "--input",
          WORKBOOK,
          "--execute",
          "--confirm-lahore-refresh",
          "--target",
          "sqlite",
          "--sqlite-path",
          target,
          "--backup-dir",
          backupDir,
        ]);
        expect(run.stderr).not.toMatch(/aborted/i);
        expect(run.status).toBe(0);
        const summary = JSON.parse(run.stdout) as { mode: string; writesPerformed: boolean };
        expect(summary).toMatchObject({ mode: "execute", writesPerformed: true });

        // 3. A verified, non-empty backup exists.
        const backups = fs.readdirSync(backupDir).filter((name) => name.endsWith(".db"));
        expect(backups.length).toBeGreaterThan(0);
        const backupPath = path.join(backupDir, backups[0]);
        expect(fs.statSync(backupPath).size).toBeGreaterThan(0);
        const backupDb = new DatabaseSync(backupPath, { readOnly: true });
        try {
          expect((backupDb.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check).toBe("ok");
        } finally {
          backupDb.close();
        }

        const db = new DatabaseSync(target, { readOnly: true });
        try {
          // 4. Aggregate counts match the real-workbook dry run.
          expect(scalar(db, 'SELECT COUNT(*) AS count FROM "cities"')).toBe(1);
          expect(scalar(db, 'SELECT COUNT(*) AS count FROM "parks"')).toBe(drySummary.counts.parks);
          expect(scalar(db, 'SELECT COUNT(*) AS count FROM "groups"')).toBe(drySummary.counts.groups);
          expect(scalar(db, 'SELECT COUNT(*) AS count FROM "participants"')).toBe(drySummary.counts.participants);
          expect(scalar(db, 'SELECT COUNT(*) AS count FROM "attendance_events"')).toBe(drySummary.counts.attendanceEvents);
          expect(scalar(db, 'SELECT COUNT(*) AS count FROM "attendance_records"')).toBe(drySummary.counts.attendanceRecords);
          expect(scalar(db, 'SELECT COUNT(*) AS count FROM "batch_class_dates"')).toBe(drySummary.counts.calendarDates);

          // 5. Exactly one active Batch 4.
          const activeBatches = db.prepare('SELECT "name" AS name FROM "batches" WHERE "isActive" = 1').all() as { name: string }[];
          expect(activeBatches).toHaveLength(1);
          expect(activeBatches[0].name).toBe(LAHORE_REFRESH.batchName);

          // 6. Only Super Admin accounts are active; staff placeholders stay inactive.
          const activeSuper = scalar(
            db,
            'SELECT COUNT(*) AS count FROM "users" u JOIN "staff_meta" s ON s."userId" = u."id" WHERE u."isActive" = 1 AND s."role" = ?',
            "super_admin"
          );
          const activeOther = scalar(
            db,
            'SELECT COUNT(*) AS count FROM "users" u LEFT JOIN "staff_meta" s ON s."userId" = u."id" WHERE u."isActive" = 1 AND (s."role" IS NULL OR s."role" <> ?)',
            "super_admin"
          );
          expect(activeSuper).toBeGreaterThan(0);
          expect(activeOther).toBe(0);
          expect(scalar(db, 'SELECT COUNT(*) AS count FROM "users"')).toBe(activeSuper + drySummary.counts.staffPlaceholders);

          // 7. No attendance record after the completed-through date.
          const afterCutoff = scalar(
            db,
            'SELECT COUNT(*) AS count FROM "attendance_records" r JOIN "attendance_events" e ON e."id" = r."eventId" WHERE e."eventDate" > ?',
            pktDayEndEpoch(drySummary.attendanceThrough)
          );
          expect(afterCutoff).toBe(0);

          // 8. Referential integrity holds after the reset and import.
          expect(db.prepare("PRAGMA foreign_key_check").all()).toHaveLength(0);
        } finally {
          db.close();
        }

        // 9. The real development database was never opened or modified.
        const sourceAfter = fs.statSync(SOURCE_DB);
        expect(sourceAfter.size).toBe(sourceBefore.size);
        expect(sourceAfter.mtimeMs).toBe(sourceBefore.mtimeMs);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    },
    300_000
  );
});
