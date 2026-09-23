/**
 * PostgreSQL production Team Access provisioning writer.
 *
 * It adapts the reviewed guarded access-plan contract in `production-access.ts`
 * to a real PostgreSQL target: the role/scope policy, refusal codes and
 * idempotency rules all come from `buildAccessPlan`, and the handoff-first
 * ordering comes from `applyAccessPlan`. Nothing about roles, scope or
 * capability is re-implemented here.
 *
 * Safety properties:
 * - the connection comes from the operator at run time and is never echoed;
 * - the target must be PostgreSQL, carry the committed 32-migration ledger, hold
 *   the required Team Access objects, and already contain the approved ATT01
 *   import totals — an unknown or non-ATT01 target is refused;
 * - an existing account may be reused only when it is already configured exactly
 *   and is active; anything else is a refusal, never a silent re-role or re-scope;
 * - passwords exist only in memory and inside the DPAPI handoff;
 * - the protected handoff is written before the first activation, and a handoff
 *   failure leaves zero database writes;
 * - every user/staff/audit write happens in one transaction.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import {
  inspectPostgresTarget,
  type PostgresTargetDiagnostics,
} from "../attendance/lahore-refresh/postgres-target";
import { toPgTimestamp } from "../attendance/lahore-refresh/postgres-import";
import { type PostgresQueryPort, PostgresRefusedError } from "../attendance/lahore-refresh/postgres-port";
import { APPROVED_TOTALS } from "../attendance/lahore-refresh/reconcile";
import { writeDpapiHandoff, type ProtectedHandoffWriter } from "../attendance/team-access/provision";
import {
  AccessRefusedError,
  applyAccessPlan,
  buildAccessPlan,
  summarizeAccessPlan,
  type AccessDryRunSummary,
  type AccessLookupPort,
  type AccessPlan,
  type AccessPlanEntry,
  type ExistingAccount,
} from "./production-access";
import type { RosterEntry } from "./production-access-roster";

/**
 * A `users` row can legitimately have at most one staff record. More than one
 * match is a conflict, and this sentinel role can never equal a real role, so the
 * shared plan reports `existing_account_conflict` without any extra policy here.
 */
const DUPLICATE_ACCOUNT_ROLE = "__duplicate_account__";

export interface ProvisioningTargetDiagnostics {
  readonly provider: "postgresql";
  readonly serverMajor: number | null;
  readonly ledgerApplied: number;
  readonly schemaBlockers: readonly string[];
  readonly cities: number;
  readonly aggregates: Readonly<Record<keyof typeof APPROVED_TOTALS, number>>;
  readonly importTotalsMatch: boolean;
  readonly blockers: readonly string[];
}

async function scalar(port: PostgresQueryPort, sql: string): Promise<number> {
  const rows = await port.query<{ count: number }>(sql);
  return Number(rows[0]?.count ?? 0);
}

/**
 * Read-only provisioning readiness. It reuses the attendance migration-ledger and
 * schema guard and then additionally requires the approved ATT01 import totals, so
 * an unrelated, unknown or un-imported target can never be provisioned.
 */
export async function inspectProvisioningTarget(
  port: PostgresQueryPort,
  expectedMigrations: readonly string[]
): Promise<ProvisioningTargetDiagnostics> {
  const target: PostgresTargetDiagnostics = await inspectPostgresTarget(port, expectedMigrations);
  // A provisioned target is expected to hold the imported dataset, so emptiness
  // is not a blocker here; ledger and schema blockers still are.
  const schemaBlockers = target.blockers.filter((blocker) => !blocker.startsWith("target_not_empty:"));

  const aggregates = {
    parks: await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "parks"'),
    groups: await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "groups"'),
    participants: await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "participants"'),
    attendanceEvents: await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "attendance_events"'),
    attendanceRecords: await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "attendance_records"'),
    calendarDates: await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "batch_class_dates"'),
  };
  const cities = await scalar(port, 'SELECT COUNT(*)::int AS "count" FROM "cities"');

  const importTotalsMatch =
    cities === 1 && (Object.keys(APPROVED_TOTALS) as (keyof typeof APPROVED_TOTALS)[]).every(
      (key) => aggregates[key] === APPROVED_TOTALS[key]
    );

  const blockers = [...schemaBlockers, ...(importTotalsMatch ? [] : ["import_totals_mismatch"])];

  return {
    provider: "postgresql",
    serverMajor: target.serverMajor,
    ledgerApplied: target.ledger.applied,
    schemaBlockers,
    cities,
    aggregates,
    importTotalsMatch,
    blockers,
  };
}

export function assertProvisioningTargetReady(diagnostics: ProvisioningTargetDiagnostics): void {
  if (diagnostics.blockers.length > 0) {
    throw new AccessRefusedError(`Refusing the ATT01 PostgreSQL provisioning: ${diagnostics.blockers.join(", ")}`);
  }
}

/**
 * The read-only lookup port the shared plan resolves scope against. A duplicate
 * account row is reported as a conflict rather than guessed at.
 */
export function createPostgresAccessLookup(port: PostgresQueryPort): AccessLookupPort {
  async function first<T>(sql: string, params: readonly unknown[]): Promise<T | null> {
    const rows = await port.query<T>(sql, params);
    return rows[0] ?? null;
  }

  return {
    findCity: async (code: string) => {
      const row = await first<{ id: string; isActive: boolean }>('SELECT "id", "isActive" FROM "cities" WHERE "code" = $1', [code]);
      return row ? { id: String(row.id), isActive: row.isActive === true } : null;
    },
    findPark: async (cityId: string, name: string) => {
      const row = await first<{ id: string; isActive: boolean }>(
        'SELECT "id", "isActive" FROM "parks" WHERE "cityId" = $1 AND "name" = $2',
        [cityId, name]
      );
      return row ? { id: String(row.id), isActive: row.isActive === true } : null;
    },
    findGroup: async (parkId: string, code: string) => {
      const row = await first<{ id: string; isActive: boolean }>(
        'SELECT "id", "isActive" FROM "groups" WHERE "parkId" = $1 AND "name" = $2',
        [parkId, code]
      );
      return row ? { id: String(row.id), isActive: row.isActive === true } : null;
    },
    findAccount: async (email: string): Promise<ExistingAccount | null> => {
      const rows = await port.query<{
        userId: string;
        role: string | null;
        isActive: boolean;
        assignedCityId: string | null;
        assignedParkId: string | null;
        assignedGroupId: string | null;
      }>(
        'SELECT u."id" AS "userId", s."role" AS "role", (u."isActive" AND COALESCE(s."isActive", false)) AS "isActive", s."assignedCityId" AS "assignedCityId", s."assignedParkId" AS "assignedParkId", s."assignedGroupId" AS "assignedGroupId" FROM "users" u LEFT JOIN "staff_meta" s ON s."userId" = u."id" WHERE lower(u."email") = $1',
        [email]
      );
      if (rows.length === 0) return null;
      if (rows.length > 1) {
        return {
          userId: String(rows[0].userId),
          role: DUPLICATE_ACCOUNT_ROLE,
          isActive: false,
          assignedCityId: null,
          assignedParkId: null,
          assignedGroupId: null,
        };
      }
      const row = rows[0];
      return {
        userId: String(row.userId),
        role: row.role === null || row.role === undefined ? "" : String(row.role),
        isActive: row.isActive === true,
        assignedCityId: row.assignedCityId === null ? null : String(row.assignedCityId),
        assignedParkId: row.assignedParkId === null ? null : String(row.assignedParkId),
        assignedGroupId: row.assignedGroupId === null ? null : String(row.assignedGroupId),
      };
    },
  };
}

/** Builds the plan and its aggregate-only dry-run projection. Performs no write. */
export async function planPostgresAccess(
  port: PostgresQueryPort,
  entries: readonly RosterEntry[]
): Promise<{ readonly plan: AccessPlan; readonly summary: AccessDryRunSummary }> {
  const plan = await buildAccessPlan(entries, createPostgresAccessLookup(port));
  return { plan, summary: summarizeAccessPlan(plan) };
}

/**
 * An `already-configured` account is reusable only while it is active. The shared
 * plan compares role and scope but not activity, so an inactive match is refused
 * here rather than silently left unusable.
 */
async function assertExistingAccountsActive(port: PostgresQueryPort, entries: readonly AccessPlanEntry[]): Promise<void> {
  for (const entry of entries) {
    const rows = await port.query<{ isActive: boolean }>(
      'SELECT (u."isActive" AND COALESCE(s."isActive", false)) AS "isActive" FROM "users" u LEFT JOIN "staff_meta" s ON s."userId" = u."id" WHERE lower(u."email") = $1',
      [entry.email]
    );
    if (rows.length !== 1 || rows[0].isActive !== true) {
      throw new AccessRefusedError("existing_account_inactive");
    }
  }
}

/** Inserts one user + staff row + its audit record. Assistance is linked afterwards. */
async function insertProvisionedAccount(
  port: PostgresQueryPort,
  entry: AccessPlanEntry,
  passwordHash: string,
  name: string | null,
  reason: string
): Promise<string> {
  const userId = crypto.randomUUID();
  const staffId = crypto.randomUUID();
  const stamp = toPgTimestamp(new Date());

  await port.execute(
    'INSERT INTO "users" ("id","email","passwordHash","name","mustResetPwd","tokenVersion","isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [userId, entry.email, passwordHash, name, true, 0, true, stamp, stamp]
  );
  await port.execute(
    'INSERT INTO "staff_meta" ("id","userId","role","assignedCityId","assignedParkId","assignedGroupId","assistsMurabbiId","isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [staffId, userId, entry.role, entry.cityId, entry.parkId, entry.groupId, null, true, stamp, stamp]
  );
  // Audit carries scope ids and booleans only: no email, name, phone or credential.
  await port.execute(
    'INSERT INTO "audit_log" ("id","userId","action","entityType","entityId","oldValues","newValues","reason","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [
      crypto.randomUUID(),
      null,
      "access_provision",
      "user",
      userId,
      null,
      JSON.stringify({
        role: entry.role,
        assignedCityId: entry.cityId,
        assignedParkId: entry.parkId,
        assignedGroupId: entry.groupId,
        hasAssistance: entry.assistsRef !== null,
      }),
      reason,
      stamp,
    ]
  );
  return staffId;
}

/**
 * Links each Muawin to its assistance target inside the same transaction, after
 * every account row exists. The target is re-verified against the database: it
 * must be an active Murabbi, or an active Park Lead teaching a group in the same
 * park. Self and cross-park assistance are refused.
 */
async function linkMuawinAssistance(
  port: PostgresQueryPort,
  plan: AccessPlan,
  emailByRef: ReadonlyMap<string, string>,
  staffIdByRef: ReadonlyMap<string, string>
): Promise<void> {
  for (const entry of plan.entries) {
    if (entry.role !== "muawin" || !entry.assistsRef) continue;
    const targetEmail = emailByRef.get(entry.assistsRef);
    if (!targetEmail) throw new AccessRefusedError("assistance_target_unresolved");

    const rows = await port.query<{
      id: string;
      role: string;
      isActive: boolean;
      assignedGroupId: string | null;
      groupParkId: string | null;
    }>(
      'SELECT s."id" AS "id", s."role" AS "role", (u."isActive" AND s."isActive") AS "isActive", s."assignedGroupId" AS "assignedGroupId", g."parkId" AS "groupParkId" FROM "staff_meta" s JOIN "users" u ON u."id" = s."userId" LEFT JOIN "groups" g ON g."id" = s."assignedGroupId" WHERE lower(u."email") = $1',
      [targetEmail.toLowerCase()]
    );
    const target = rows.length === 1 ? rows[0] : null;
    const eligible =
      target !== null &&
      target.isActive === true &&
      (target.role === "murabbi" || (target.role === "park_lead" && target.assignedGroupId !== null && target.groupParkId === entry.parkId));
    if (!eligible) throw new AccessRefusedError("assistance_target_invalid");

    const muawinStaffId = staffIdByRef.get(entry.ref);
    if (!muawinStaffId) throw new AccessRefusedError("assistance_source_unresolved");
    await port.execute('UPDATE "staff_meta" SET "assistsMurabbiId" = $1, "updatedAt" = $2 WHERE "id" = $3', [
      target.id,
      toPgTimestamp(new Date()),
      muawinStaffId,
    ]);
  }
}

/** A database failure must never surface a driver message, which can echo a key value. */
function toSafeProvisioningError(error: unknown): Error {
  if (error instanceof AccessRefusedError || error instanceof PostgresRefusedError) return error;
  return new AccessRefusedError("provisioning_failed_and_rolled_back");
}

export interface PostgresAccessProvisionInput {
  readonly port: PostgresQueryPort;
  readonly entries: readonly RosterEntry[];
  readonly handoffPath: string;
  /** Owner approval reference recorded on every audit row. */
  readonly reason: string;
  /** Test seam. Production uses the DPAPI CurrentUser writer. */
  readonly writeHandoff?: ProtectedHandoffWriter;
}

export interface PostgresAccessProvisionResult {
  readonly mode: "execute";
  readonly writesPerformed: boolean;
  readonly activated: number;
  readonly alreadyConfigured: number;
}

/**
 * Runs the whole provisioning batch: protected handoff first, then every
 * user/staff/audit write and the assistance links in one transaction. A failure
 * rolls the transaction back and removes the orphan handoff file.
 */
export async function provisionPostgresAccess(input: PostgresAccessProvisionInput): Promise<PostgresAccessProvisionResult> {
  const { plan } = await planPostgresAccess(input.port, input.entries);
  if (plan.refusals.length > 0) {
    const codes = [...new Set(plan.refusals.map((refusal) => refusal.code))].sort();
    throw new AccessRefusedError(`plan_refused:${codes.join("+")}`);
  }

  const alreadyConfigured = plan.entries.filter((entry) => entry.outcome === "already-configured");
  await assertExistingAccountsActive(input.port, alreadyConfigured);

  const emailByRef = new Map(input.entries.map((entry) => [entry.ref, entry.email]));
  const nameByRef = new Map(input.entries.map((entry) => [entry.ref, entry.name]));
  const staffIdByRef = new Map<string, string>();
  const writeHandoff = input.writeHandoff ?? writeDpapiHandoff;
  let handoffWritten = false;

  try {
    await input.port.transaction(async (tx) => {
      await applyAccessPlan(plan, {
        writeProtectedHandoff: async (credentials) => {
          // Marked before the call so even a partially written artifact is removed
          // if the handoff fails; no activation can have run at this point.
          handoffWritten = true;
          try {
            await writeHandoff(input.handoffPath, credentials);
          } catch {
            throw new AccessRefusedError("handoff_failed_no_writes");
          }
        },
        applyActivation: async (entry, passwordHash) => {
          staffIdByRef.set(entry.ref, await insertProvisionedAccount(tx, entry, passwordHash, nameByRef.get(entry.ref) ?? null, input.reason));
        },
      });
      await linkMuawinAssistance(tx, plan, emailByRef, staffIdByRef);
    });
  } catch (error) {
    // An orphan handoff describes accounts that do not exist; remove it.
    if (handoffWritten) {
      try {
        fs.rmSync(input.handoffPath, { force: true });
      } catch {
        // The refusal below is the signal the operator acts on.
      }
    }
    throw toSafeProvisioningError(error);
  }

  const activated = plan.entries.filter((entry) => entry.outcome === "create-active").length;
  return { mode: "execute", writesPerformed: activated > 0, activated, alreadyConfigured: alreadyConfigured.length };
}
