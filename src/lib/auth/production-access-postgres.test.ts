/**
 * Integration tests for the PostgreSQL Team Access provisioning writer.
 *
 * They run only when `ATT01_TEST_POSTGRES_URL` points at a throwaway local server
 * and the approved workbook is present; otherwise the suite is skipped. Each test
 * clones a template that has the committed migrations plus the approved ATT01
 * import, so the provisioning guard can be exercised for real. No production,
 * staging or external database is contacted, no real roster is used, and every
 * credential is synthetic.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadRefreshManifest } from "../attendance/lahore-refresh/load";
import { readExpectedPostgresMigrations } from "../attendance/lahore-refresh/postgres-cli";
import { runPostgresImport } from "../attendance/lahore-refresh/postgres-import";
import type { PostgresQueryPort } from "../attendance/lahore-refresh/postgres-port";
import {
  applyMigrations,
  createDisposablePostgresHarness,
  disposableAdminUrl,
  withPort,
  type DisposablePostgresHarness,
} from "../attendance/lahore-refresh/postgres-test-support";
import { AccessRefusedError } from "./production-access";
import {
  assertProvisioningTargetReady,
  inspectProvisioningTarget,
  planPostgresAccess,
  provisionPostgresAccess,
} from "./production-access-postgres";
import { parseAccessRoster, type RosterEntry } from "./production-access-roster";

const ADMIN_URL = disposableAdminUrl();
const APPROVED_WORKBOOK = process.env.ATT01_APPROVED_WORKBOOK ?? "docs/sheets/Shabab_Batch_4_Attendance.xlsx";
const CAN_RUN = Boolean(ADMIN_URL) && fs.existsSync(APPROVED_WORKBOOK);

const ROSTER_HEADER = "ref,email,role,city,park,group,assists_ref,name";

function roster(...rows: readonly string[]): RosterEntry[] {
  return parseAccessRoster([ROSTER_HEADER, ...rows].join("\n"));
}

interface AccountCounts {
  readonly users: number;
  readonly staff: number;
  readonly audit: number;
}

async function accountCounts(port: PostgresQueryPort): Promise<AccountCounts> {
  const rows = await port.query<AccountCounts>(
    'SELECT (SELECT COUNT(*)::int FROM "users") AS "users", (SELECT COUNT(*)::int FROM "staff_meta") AS "staff", (SELECT COUNT(*)::int FROM "audit_log") AS "audit"'
  );
  return { users: Number(rows[0].users), staff: Number(rows[0].staff), audit: Number(rows[0].audit) };
}

/** A synthetic handoff recorder: it never writes a credential to disk. */
function recordingHandoff(sink: { credentials: { email: string; password: string }[] }) {
  return async (outputPath: string, entries: readonly { email: string; password: string }[]): Promise<void> => {
    sink.credentials = [...entries];
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, "synthetic-handoff-placeholder\n", { mode: 0o600 });
  };
}

/** Wraps a port so a chosen statement fails, to prove the batch rolls back. */
function flakyPort(port: PostgresQueryPort, failOn: (sql: string, occurrence: number) => boolean): PostgresQueryPort {
  const counters = new Map<string, number>();
  const wrap = (inner: PostgresQueryPort): PostgresQueryPort => ({
    query: (sql, params) => inner.query(sql, params),
    execute: async (sql, params) => {
      const key = sql.trim().slice(0, 48);
      const occurrence = (counters.get(key) ?? 0) + 1;
      counters.set(key, occurrence);
      if (failOn(sql, occurrence)) throw new Error("synthetic database failure");
      return inner.execute(sql, params);
    },
    transaction: (run) => inner.transaction((tx) => run(wrap(tx))),
    close: async () => {},
  });
  return wrap(port);
}

describe.skipIf(!CAN_RUN)("ATT01 PostgreSQL Team Access provisioning (disposable PostgreSQL)", () => {
  let harness: DisposablePostgresHarness | undefined;
  let cityCode = "LHR";
  let parkA = "";
  let parkB = "";
  let groupA = "";
  let groupB = "";
  /** A park plus a group name that exists elsewhere but not in that park. */
  let foreignPark = "";
  let foreignGroup = "";

  const tempDirs: string[] = [];

  function handoffPath(): string {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "att01-access-"));
    tempDirs.push(directory);
    return path.join(directory, "handoff.bin");
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      const directory = tempDirs.pop();
      if (directory) fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  beforeAll(async () => {
    harness = await createDisposablePostgresHarness({
      label: "acc",
      prepare: async (databaseUrl) => {
        applyMigrations(databaseUrl);
        await withPort(databaseUrl, async (port) => {
          await runPostgresImport(port, await loadRefreshManifest(APPROVED_WORKBOOK));
        });
      },
    });

    // The approved dataset is the source of truth for the scope references used below.
    await withPort(await harness.createDatabase(), async (port) => {
      const cities = await port.query<{ code: string }>('SELECT "code" FROM "cities" ORDER BY "code"');
      cityCode = cities[0].code;
      const parks = await port.query<{ name: string }>('SELECT "name" FROM "parks" ORDER BY "name"');
      parkA = parks[0].name;
      parkB = parks[1].name;
      const groups = await port.query<{ name: string; park: string }>(
        'SELECT g."name" AS "name", p."name" AS "park" FROM "groups" g JOIN "parks" p ON p."id" = g."parkId"'
      );
      groupA = groups.find((row) => row.park === parkA)?.name ?? "";
      groupB = groups.find((row) => row.park === parkB)?.name ?? "";

      // Park group names repeat across parks, so "a group that is not in this park"
      // is a name that exists somewhere else but not in the park under test.
      const namesByPark = new Map<string, Set<string>>();
      for (const row of groups) {
        const names = namesByPark.get(row.park) ?? new Set<string>();
        names.add(row.name);
        namesByPark.set(row.park, names);
      }
      const everyName = [...new Set(groups.map((row) => row.name))];
      for (const [park, names] of namesByPark) {
        const missing = everyName.find((name) => !names.has(name));
        if (missing) {
          foreignPark = park;
          foreignGroup = missing;
          break;
        }
      }
    });
  }, 300000);

  afterAll(async () => {
    await harness?.destroy();
  }, 120000);

  async function freshDatabase(): Promise<string> {
    if (!harness) throw new Error("the disposable PostgreSQL harness was not created");
    return harness.createDatabase();
  }

  it("requires the approved import totals and the committed ledger", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      const diagnostics = await inspectProvisioningTarget(port, readExpectedPostgresMigrations());
      expect(diagnostics.provider).toBe("postgresql");
      expect(diagnostics.ledgerApplied).toBe(32);
      expect(diagnostics.cities).toBe(1);
      expect(diagnostics.importTotalsMatch).toBe(true);
      expect(diagnostics.blockers).toEqual([]);
      expect(() => assertProvisioningTargetReady(diagnostics)).not.toThrow();
    });
  });

  it("refuses a target whose migration ledger is not the committed chain", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      await port.execute('DELETE FROM "_prisma_migrations" WHERE "migration_name" = $1', ["20260916080000_add_muawin_assistance"]);
      const diagnostics = await inspectProvisioningTarget(port, readExpectedPostgresMigrations());
      expect(diagnostics.blockers).toContain("migration_ledger_mismatch");
      expect(() => assertProvisioningTargetReady(diagnostics)).toThrow(/migration_ledger_mismatch/);
    });
  });

  it("refuses a target that does not hold the approved ATT01 import totals", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      await port.execute('DELETE FROM "attendance_records" WHERE "id" IN (SELECT "id" FROM "attendance_records" LIMIT 5)');
      const diagnostics = await inspectProvisioningTarget(port, readExpectedPostgresMigrations());
      expect(diagnostics.importTotalsMatch).toBe(false);
      expect(diagnostics.blockers).toContain("import_totals_mismatch");
      expect(() => assertProvisioningTargetReady(diagnostics)).toThrow(/import_totals_mismatch/);
    });
  });

  it("plans without writing anything", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      const before = await accountCounts(port);
      const { plan, summary } = await planPostgresAccess(
        port,
        roster(`row-1,it-dry-run@example.invalid,City Head,${cityCode},,,,`)
      );
      expect(plan.refusals).toEqual([]);
      expect(summary).toMatchObject({ mode: "dry-run", writesPerformed: false, planned: 1, requiresProtectedHandoff: true });
      const after = await accountCounts(port);
      expect(after).toEqual(before);
      expect(after.users).toBe(0);
      expect(after.staff).toBe(0);
    });
  });

  it("provisions staff roles and scopes with audit evidence and no plaintext", async () => {
    const url = await freshDatabase();
    const sink: { credentials: { email: string; password: string }[] } = { credentials: [] };
    await withPort(url, async (port) => {
      const entries = roster(
        `row-1,it-city-head@example.invalid,City Head,${cityCode},,,,`,
        `row-2,it-park-lead@example.invalid,Park Lead,${cityCode},${parkA},,,`,
        `row-3,it-murabbi@example.invalid,Murabbi,${cityCode},${parkA},${groupA},,`,
        `row-4,it-muawin@example.invalid,Muawin,${cityCode},${parkA},,row-3,`
      );
      const target = await inspectProvisioningTarget(port, readExpectedPostgresMigrations());
      const result = await provisionPostgresAccess({
        port,
        entries,
        handoffPath: handoffPath(),
        reason: "owner-approval-2026-09-23",
        writeHandoff: recordingHandoff(sink),
      });
      expect(result).toMatchObject({ mode: "execute", writesPerformed: true, activated: 4, alreadyConfigured: 0 });
      expect(sink.credentials).toHaveLength(4);

      const rows = await port.query<{
        email: string;
        role: string;
        staffId: string;
        cityId: string;
        parkId: string | null;
        groupId: string | null;
        assistsMurabbiId: string | null;
        isActive: boolean;
        mustResetPwd: boolean;
        passwordHash: string;
      }>(
        'SELECT u."email" AS "email", s."role" AS "role", s."id" AS "staffId", s."assignedCityId" AS "cityId", s."assignedParkId" AS "parkId", s."assignedGroupId" AS "groupId", s."assistsMurabbiId" AS "assistsMurabbiId", u."isActive" AS "isActive", u."mustResetPwd" AS "mustResetPwd", u."passwordHash" AS "passwordHash" FROM "users" u JOIN "staff_meta" s ON s."userId" = u."id" ORDER BY u."email"'
      );
      const byRole = new Map(rows.map((row) => [row.role, row]));
      const cityHead = byRole.get("city_head");
      const parkLead = byRole.get("park_lead");
      const murabbi = byRole.get("murabbi");
      const muawin = byRole.get("muawin");
      expect(rows).toHaveLength(4);

      // City Head: pinned to the city only, no park, no group, no assistance.
      expect(cityHead).toMatchObject({ parkId: null, groupId: null, assistsMurabbiId: null, isActive: true, mustResetPwd: true });
      // Park Lead: park only.
      expect(parkLead?.parkId).toEqual(expect.any(String));
      expect(parkLead?.groupId).toBeNull();
      expect(parkLead?.assistsMurabbiId).toBeNull();
      // Murabbi: park plus its approved group.
      expect(murabbi?.parkId).toEqual(parkLead?.parkId);
      expect(murabbi?.groupId).toEqual(expect.any(String));
      expect(murabbi?.assistsMurabbiId).toBeNull();
      // Every account sits in the one approved city.
      for (const row of rows) expect(row.cityId).toEqual(cityHead?.cityId);
      // Muawin: park only, never a group, linked to the approved Murabbi.
      expect(muawin?.parkId).toEqual(parkLead?.parkId);
      expect(muawin?.groupId).toBeNull();
      expect(muawin?.assistsMurabbiId).toEqual(murabbi?.staffId);

      // Every stored hash is bcrypt and none equals a generated plaintext.
      for (const row of rows) {
        expect(row.passwordHash).toMatch(/^\$2/);
        for (const credential of sink.credentials) expect(row.passwordHash).not.toContain(credential.password);
      }

      const audit = await port.query<{ action: string; count: number; payload: string }>(
        'SELECT "action" AS "action", COUNT(*)::int AS "count", MIN("newValues") AS "payload" FROM "audit_log" WHERE "action" = $1 GROUP BY "action"',
        ["access_provision"]
      );
      expect(audit[0].count).toBe(4);
      expect(audit[0].payload).not.toContain("@");
      expect(audit[0].payload).not.toMatch(/password/i);
      expect(audit[0].payload).toContain("role");

      // The plan summary and target diagnostics carry aggregates only.
      const output = JSON.stringify({ result, summary: target });
      expect(output).not.toContain("postgresql://");
      expect(output).not.toContain("@example.invalid");
      for (const credential of sink.credentials) expect(output).not.toContain(credential.password);
    });
  });

  it("writes nothing when the protected handoff fails", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      const entries = roster(`row-1,it-handoff-fail@example.invalid,City Head,${cityCode},,,,`);
      await expect(
        provisionPostgresAccess({
          port,
          entries,
          handoffPath: handoffPath(),
          reason: "owner-approval-2026-09-23",
          writeHandoff: async () => {
            throw new Error("DPAPI encryption failed");
          },
        })
      ).rejects.toThrow(/handoff_failed_no_writes/);
      expect(await accountCounts(port)).toEqual({ users: 0, staff: 0, audit: 0 });
    });
  });

  it("rolls the whole batch back and removes the handoff when a write fails", async () => {
    const url = await freshDatabase();
    const sink: { credentials: { email: string; password: string }[] } = { credentials: [] };
    const file = handoffPath();
    await withPort(url, async (port) => {
      const entries = roster(
        `row-1,it-rollback-a@example.invalid,City Head,${cityCode},,,,`,
        `row-2,it-rollback-b@example.invalid,Park Lead,${cityCode},${parkA},,,`
      );
      const failing = flakyPort(port, (sql, occurrence) => sql.includes('INSERT INTO "users"') && occurrence === 2);
      await expect(
        provisionPostgresAccess({
          port: failing,
          entries,
          handoffPath: file,
          reason: "owner-approval-2026-09-23",
          writeHandoff: recordingHandoff(sink),
        })
      ).rejects.toThrow(/rolled_back/);

      expect(sink.credentials).toHaveLength(2);
      expect(await accountCounts(port)).toEqual({ users: 0, staff: 0, audit: 0 });
      expect(fs.existsSync(file)).toBe(false);
    });
  });

  it("denies a City Head without a city, with an unknown city, and refuses to write", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      const missing = roster("row-1,it-no-city@example.invalid,City Head,,,,,");
      const unknown = roster("row-1,it-bad-city@example.invalid,City Head,ZZZ,,,,");

      const missingPlan = await planPostgresAccess(port, missing);
      expect(missingPlan.plan.refusals.map((refusal) => refusal.code)).toContain("city_required");
      const unknownPlan = await planPostgresAccess(port, unknown);
      expect(unknownPlan.plan.refusals.map((refusal) => refusal.code)).toContain("city_not_found");

      await expect(
        provisionPostgresAccess({ port, entries: missing, handoffPath: handoffPath(), reason: "ref", writeHandoff: recordingHandoff({ credentials: [] }) })
      ).rejects.toThrow(/plan_refused/);
      expect(await accountCounts(port)).toEqual({ users: 0, staff: 0, audit: 0 });
    });
  });

  it("denies a cross-park group, a direct Muawin group and cross-park assistance", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      // A group name that exists in another park but not in this one is refused.
      expect(foreignGroup).not.toBe("");
      const crossPark = roster(`row-1,it-cross-group@example.invalid,Murabbi,${cityCode},${foreignPark},${foreignGroup},,`);
      expect((await planPostgresAccess(port, crossPark)).plan.refusals.map((refusal) => refusal.code)).toContain("group_not_found");

      const muawinGroup = roster(`row-1,it-muawin-group@example.invalid,Muawin,${cityCode},${parkA},${groupA},,`);
      expect((await planPostgresAccess(port, muawinGroup)).plan.refusals.map((refusal) => refusal.code)).toContain("group_not_allowed");

      const crossParkAssist = roster(
        `row-1,it-murabbi-b@example.invalid,Murabbi,${cityCode},${parkB},${groupB},,`,
        `row-2,it-muawin-cross@example.invalid,Muawin,${cityCode},${parkA},,row-1,`
      );
      expect((await planPostgresAccess(port, crossParkAssist)).plan.refusals.map((refusal) => refusal.code)).toContain(
        "assistance_target_invalid"
      );

      expect(await accountCounts(port)).toEqual({ users: 0, staff: 0, audit: 0 });
    });
  });

  it("fails closed on super_admin, Shabab and Guardian inputs without writing", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      const entries = roster(
        `row-1,it-owner@example.invalid,System Owner,${cityCode},,,,`,
        `row-2,it-shabab@example.invalid,Shabab,${cityCode},${parkA},,,`,
        `row-3,it-guardian@example.invalid,Guardian,${cityCode},,,,`
      );
      const { plan } = await planPostgresAccess(port, entries);
      expect(plan.entries).toEqual([]);
      expect(plan.refusals.map((refusal) => refusal.code)).toEqual(["system_owner_role", "non_staff_role", "non_staff_role"]);

      await expect(
        provisionPostgresAccess({ port, entries, handoffPath: handoffPath(), reason: "ref", writeHandoff: recordingHandoff({ credentials: [] }) })
      ).rejects.toThrow(/plan_refused/);
      expect(await accountCounts(port)).toEqual({ users: 0, staff: 0, audit: 0 });
    });
  });

  it("treats an exact rerun as already configured and refuses a conflicting rerun", async () => {
    const url = await freshDatabase();
    const sink: { credentials: { email: string; password: string }[] } = { credentials: [] };
    const rerunHandoff = handoffPath();
    await withPort(url, async (port) => {
      const entries = roster(`row-1,it-rerun@example.invalid,Park Lead,${cityCode},${parkA},,,`);
      const first = await provisionPostgresAccess({ port, entries, handoffPath: handoffPath(), reason: "ref", writeHandoff: recordingHandoff(sink) });
      expect(first).toMatchObject({ activated: 1, alreadyConfigured: 0 });

      const second = await provisionPostgresAccess({ port, entries, handoffPath: rerunHandoff, reason: "ref", writeHandoff: recordingHandoff(sink) });
      expect(second).toMatchObject({ activated: 0, alreadyConfigured: 1, writesPerformed: false });
      // A no-op rerun generates no credential and leaves no handoff behind.
      expect(fs.existsSync(rerunHandoff)).toBe(false);

      const conflict = roster(`row-1,it-rerun@example.invalid,Park Lead,${cityCode},${parkB},,,`);
      await expect(
        provisionPostgresAccess({ port, entries: conflict, handoffPath: handoffPath(), reason: "ref", writeHandoff: recordingHandoff(sink) })
      ).rejects.toThrow(/existing_account_conflict/);

      expect(await accountCounts(port)).toEqual({ users: 1, staff: 1, audit: 1 });
    });
  });

  it("reuses an already-configured account but refuses an inactive one", async () => {
    const url = await freshDatabase();
    const sink: { credentials: { email: string; password: string }[] } = { credentials: [] };
    await withPort(url, async (port) => {
      const entries = roster(`row-1,it-inactive@example.invalid,City Head,${cityCode},,,,`);
      await provisionPostgresAccess({ port, entries, handoffPath: handoffPath(), reason: "ref", writeHandoff: recordingHandoff(sink) });
      await port.execute('UPDATE "users" SET "isActive" = false WHERE "email" = $1', ["it-inactive@example.invalid"]);

      await expect(
        provisionPostgresAccess({ port, entries, handoffPath: handoffPath(), reason: "ref", writeHandoff: recordingHandoff(sink) })
      ).rejects.toThrow(new RegExp("existing_account_inactive|plan_refused"));
      expect(await accountCounts(port)).toEqual({ users: 1, staff: 1, audit: 1 });
    });
  });

  it("uses the refusal error type for provisioning guards", async () => {
    const url = await freshDatabase();
    await withPort(url, async (port) => {
      const entries = roster("row-1,it-error-type@example.invalid,City Head,,,,,");
      await expect(
        provisionPostgresAccess({ port, entries, handoffPath: handoffPath(), reason: "ref", writeHandoff: recordingHandoff({ credentials: [] }) })
      ).rejects.toThrow(AccessRefusedError);
    });
  });
});
