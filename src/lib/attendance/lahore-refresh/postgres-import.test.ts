/**
 * Integration tests against a real, disposable PostgreSQL 18 database.
 *
 * They run only when `ATT01_TEST_POSTGRES_URL` points at a throwaway local
 * server; otherwise the whole suite is skipped. Each test clones a migrated
 * template database, so no test mutates another and nothing outside the
 * disposable server is touched. No production, staging or external database is
 * ever used, and no name, phone or connection string is asserted on beyond
 * checking that it is absent.
 */
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadRefreshManifest } from "./load";
import { assertPostgresImportAuthorized, readExpectedPostgresMigrations, summarizeTargetDiagnostics } from "./postgres-cli";
import { parsePostgresImportArgs } from "./postgres-cli";
import { runPostgresImport } from "./postgres-import";
import type { PostgresQueryPort } from "./postgres-port";
import {
  buildPostgresReconciliationReport,
  formatReconciliationSummary,
  readPostgresPostImportEvidence,
  readPostgresReconciliationSnapshot,
} from "./postgres-reconcile";
import { assertPostgresTargetReady, inspectPostgresTarget } from "./postgres-target";
import {
  applyMigrations,
  createDisposablePostgresHarness,
  disposableAdminUrl,
  withPort,
  type DisposablePostgresHarness,
} from "./postgres-test-support";
import { APPROVED_TOTALS } from "./reconcile";
import { buildSyntheticRefreshManifest } from "./test-support";

const ADMIN_URL = disposableAdminUrl();
const APPROVED_WORKBOOK = process.env.ATT01_APPROVED_WORKBOOK ?? "docs/sheets/Shabab_Batch_4_Attendance.xlsx";

describe.skipIf(!ADMIN_URL)("ATT01 PostgreSQL import and reconciliation (disposable PostgreSQL)", () => {
  let harness: DisposablePostgresHarness | undefined;

  beforeAll(async () => {
    harness = await createDisposablePostgresHarness({
      label: "imp",
      prepare: async (databaseUrl) => {
        applyMigrations(databaseUrl);
      },
    });
  }, 300000);

  afterAll(async () => {
    await harness?.destroy();
  }, 120000);

  async function freshDatabase(): Promise<string> {
    if (!harness) throw new Error("the disposable PostgreSQL harness was not created");
    return harness.createDatabase();
  }

  async function expectEmpty(port: PostgresQueryPort): Promise<void> {
    const snapshot = await readPostgresReconciliationSnapshot(port);
    expect(snapshot.aggregates).toEqual({
      parks: 0,
      groups: 0,
      participants: 0,
      attendanceEvents: 0,
      attendanceRecords: 0,
      calendarDates: 0,
    });
    expect(snapshot.staff.placeholders).toBe(0);
  }

  it("reports a fresh, compatible target and performs no writes", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      const diagnostics = await inspectPostgresTarget(port, readExpectedPostgresMigrations());
      expect(diagnostics.provider).toBe("postgresql");
      expect(diagnostics.ledger.applied).toBe(32);
      expect(diagnostics.ledger.missing).toEqual([]);
      expect(diagnostics.tablesMissing).toEqual([]);
      expect(diagnostics.constraintsMissing).toEqual([]);
      expect(diagnostics.indexesMissing).toEqual([]);
      expect(diagnostics.fresh).toBe(true);
      expect(diagnostics.compatible).toBe(true);
      expect(diagnostics.blockers).toEqual([]);
      expect(diagnostics.writesPerformed).toBe(false);
      await expectEmpty(port);
    });
  });

  it("imports the plan into a fresh target with the exact manifest totals", async () => {
    const url = await freshDatabase();
    const manifest = buildSyntheticRefreshManifest();
    await withPort(url, async (port) => {
      assertPostgresTargetReady(await inspectPostgresTarget(port, readExpectedPostgresMigrations()));
      const result = await runPostgresImport(port, manifest);
      expect(result.writesPerformed).toBe(true);
      expect(result.verification.ok).toBe(true);
      expect(result.counts.staffPlaceholders).toBe(0);

      const snapshot = await readPostgresReconciliationSnapshot(port);
      expect(snapshot.aggregates).toEqual({
        parks: manifest.counts.parks,
        groups: manifest.counts.groups,
        participants: manifest.counts.participants,
        attendanceEvents: manifest.counts.attendanceEvents,
        attendanceRecords: manifest.counts.attendanceRecords,
        calendarDates: manifest.counts.calendarDates,
      });
      expect(snapshot.staff.placeholders).toBe(0);
    });
  });

  it("reconciles the workbook against the fresh target as fully equal", async () => {
    const url = await freshDatabase();
    const manifest = buildSyntheticRefreshManifest();
    await withPort(url, async (port) => {
      assertPostgresTargetReady(await inspectPostgresTarget(port, readExpectedPostgresMigrations()));
      await runPostgresImport(port, manifest);
      const report = buildPostgresReconciliationReport(
        manifest,
        await readPostgresReconciliationSnapshot(port),
        await readPostgresPostImportEvidence(port)
      );
      expect(report.ok).toBe(true);
      expect(report.mismatches).toEqual([]);
      expect(report.keys.every((comparison) => comparison.equal)).toBe(true);
      expect(report.postImport.evidence.totalUsers).toBe(0);
    });
  });

  it("reports a deliberately altered row as a mismatch", async () => {
    const url = await freshDatabase();
    const manifest = buildSyntheticRefreshManifest();
    await withPort(url, async (port) => {
      assertPostgresTargetReady(await inspectPostgresTarget(port, readExpectedPostgresMigrations()));
      await runPostgresImport(port, manifest);
      await port.execute(
        'UPDATE "participants" SET "name" = "name" || \'-X\' WHERE "id" = (SELECT "id" FROM "participants" ORDER BY "id" LIMIT 1)'
      );
      const report = buildPostgresReconciliationReport(
        manifest,
        await readPostgresReconciliationSnapshot(port),
        await readPostgresPostImportEvidence(port)
      );
      expect(report.ok).toBe(false);
      expect(report.mismatches.length).toBeGreaterThan(0);
      const categories = report.mismatches.map((mismatch) => mismatch.category);
      expect(categories).toContain("participant_identity");
    });
  });

  it("refuses a non-empty target before any write", async () => {
    const url = await freshDatabase();
    const manifest = buildSyntheticRefreshManifest();
    await withPort(url, async (port) => {
      assertPostgresTargetReady(await inspectPostgresTarget(port, readExpectedPostgresMigrations()));
      await runPostgresImport(port, manifest);

      const before = await readPostgresReconciliationSnapshot(port);
      const diagnostics = await inspectPostgresTarget(port, readExpectedPostgresMigrations());
      // The schema is still compatible; it is the emptiness guard that refuses.
      expect(diagnostics.compatible).toBe(true);
      expect(diagnostics.fresh).toBe(false);
      expect(diagnostics.nonEmptyTables.length).toBeGreaterThan(0);
      expect(diagnostics.blockers.some((blocker) => blocker.startsWith("target_not_empty:"))).toBe(true);
      expect(() => assertPostgresTargetReady(diagnostics)).toThrow(/target_not_empty/);

      const after = await readPostgresReconciliationSnapshot(port);
      expect(after.aggregates).toEqual(before.aggregates);
    });
  });

  it("refuses a target missing a required table or constraint", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      await port.execute('DROP TABLE "batch_class_dates" CASCADE');
      await port.execute('ALTER TABLE "staff_meta" DROP CONSTRAINT "staff_meta_assistsMurabbiId_fkey"');
      const diagnostics = await inspectPostgresTarget(port, readExpectedPostgresMigrations());
      expect(diagnostics.compatible).toBe(false);
      expect(diagnostics.tablesMissing).toContain("batch_class_dates");
      expect(diagnostics.constraintsMissing).toContain("staff_meta_assistsMurabbiId_fkey");
      expect(() => assertPostgresTargetReady(diagnostics)).toThrow(/missing_table|missing_constraint/);
    });
  });

  it("refuses an unexpected migration ledger", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      await port.execute('DELETE FROM "_prisma_migrations" WHERE "migration_name" = $1', [
        "20260916080000_add_muawin_assistance",
      ]);
      const diagnostics = await inspectPostgresTarget(port, readExpectedPostgresMigrations());
      expect(diagnostics.ledger.missing).toEqual(["20260916080000_add_muawin_assistance"]);
      expect(diagnostics.compatible).toBe(false);
      expect(diagnostics.blockers).toContain("migration_ledger_mismatch");
    });
  });

  it("rolls the whole batch back when an insert fails", async () => {
    const url = await freshDatabase();
    const manifest = buildSyntheticRefreshManifest();
    await withPort(url, async (port) => {
      // A pre-existing city with the plan's code makes the first insert collide,
      // so the transaction must roll back and leave nothing but that city.
      await port.execute(
        'INSERT INTO "cities" ("id", "name", "code", "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, now(), now())',
        ["att01-city-lhr", "Pre-existing", "LHR", true]
      );
      await expect(runPostgresImport(port, manifest)).rejects.toThrow(/rolled_back|verification_failed/);

      const snapshot = await readPostgresReconciliationSnapshot(port);
      expect(snapshot.aggregates).toEqual({
        parks: 0,
        groups: 0,
        participants: 0,
        attendanceEvents: 0,
        attendanceRecords: 0,
        calendarDates: 0,
      });
      const cities = await port.query<{ count: number }>('SELECT COUNT(*)::int AS "count" FROM "cities"');
      expect(cities[0].count).toBe(1);
    });
  });

  it("keeps connection strings, participants and phones out of every output", async () => {
    const url = await freshDatabase();
    const manifest = buildSyntheticRefreshManifest();
    await withPort(url, async (port) => {
      assertPostgresTargetReady(await inspectPostgresTarget(port, readExpectedPostgresMigrations()));
      const result = await runPostgresImport(port, manifest);
      const diagnostics = summarizeTargetDiagnostics(await inspectPostgresTarget(port, readExpectedPostgresMigrations()));
      const report = buildPostgresReconciliationReport(
        manifest,
        await readPostgresReconciliationSnapshot(port),
        await readPostgresPostImportEvidence(port)
      );
      const output = `${JSON.stringify({ result, diagnostics, report })}\n${formatReconciliationSummary(report)}`;
      expect(output).not.toContain("postgresql://");
      expect(output).not.toContain("postgres://");
      expect(output).not.toContain(ADMIN_URL);
      expect(output).not.toContain("Student");
      expect(output).not.toContain("0300-0000000");
    });
  });

  it.skipIf(!fs.existsSync(APPROVED_WORKBOOK))(
    "imports the approved workbook into a fresh target with the approved totals",
    async () => {
      const url = await freshDatabase();
      const manifest = await loadRefreshManifest(APPROVED_WORKBOOK);
      await withPort(url, async (port) => {
        // The write gate is re-asserted here so the test cannot bypass it.
        expect(() =>
          assertPostgresImportAuthorized(
            parsePostgresImportArgs(["--input", APPROVED_WORKBOOK, "--target", "postgres", "--execute"])
          )
        ).toThrow(/confirm-att01-postgres-import/);
        assertPostgresTargetReady(await inspectPostgresTarget(port, readExpectedPostgresMigrations()));

        const result = await runPostgresImport(port, manifest);
        expect(result.verification.ok).toBe(true);
        expect(result.counts).toMatchObject({ ...APPROVED_TOTALS, staffPlaceholders: 0 });

        const snapshot = await readPostgresReconciliationSnapshot(port);
        expect(snapshot.aggregates).toEqual({ ...APPROVED_TOTALS });
        expect(snapshot.statusTotals).toEqual({ present: 1626, absent: 2570, late: 1346, excused: 668 });
        expect(snapshot.staff.placeholders).toBe(0);

        const report = buildPostgresReconciliationReport(
          manifest,
          snapshot,
          await readPostgresPostImportEvidence(port)
        );
        expect(report.ok).toBe(true);
        expect(report.mismatches).toEqual([]);
      });
    },
    180000
  );
});
