/**
 * PostgreSQL side of the read-only Lahore Batch 4 reconciliation.
 *
 * Every query here is an aggregate or a hashed business key, mirroring the SQLite
 * reader so both providers produce the same {@link ReconciliationSnapshot} shape
 * and the same shared comparison rules apply. Participant names and phone numbers
 * are digested immediately and never returned, and the caller opens the port
 * read-only in practice — nothing in this module writes.
 *
 * Dates are read as epoch milliseconds with `EXTRACT(EPOCH ...)`, which assumes UTC
 * for a `timestamp without time zone`. That is exactly the instant the attendance
 * API stored, so `formatPKT` derives the same Pakistan-time day the SQLite path
 * derives. A raw `timestamp` column is never selected directly: the driver coerces
 * it to a local-time `Date`, which shifts the derived day.
 */
import { formatPKT } from "../../timezone";
import { LAHORE_REFRESH } from "./constants";
import type { PostgresQueryPort } from "./postgres-port";
import {
  ATTENDANCE_STATUSES,
  buildReconciliationReport,
  identityFingerprint,
  keyFingerprint,
  manifestSnapshot,
  placementFingerprint,
  type PostImportEvidence,
  type ReconciliationReport,
  type ReconciliationSnapshot,
} from "./reconcile";
import type { AttendanceStatus, RefreshManifest } from "./types";

const KNOWN_STATUSES = new Set<string>(ATTENDANCE_STATUSES);

/** A stored `timestamp(3)` back to the Pakistan-time `YYYY-MM-DD`. */
function pktDate(value: unknown): string {
  const ms = Number(value);
  return Number.isFinite(ms) ? formatPKT(Math.round(ms), "yyyy-MM-dd") : "—";
}

/** Counts rows of a single quoted table with an optional `WHERE` clause. */
async function countTable(
  port: PostgresQueryPort,
  table: string,
  where = "",
  params: readonly unknown[] = []
): Promise<number> {
  const rows = await port.query<{ count: number }>(`SELECT COUNT(*)::int AS "count" FROM "${table}"${where}`, params);
  return Number(rows[0]?.count ?? 0);
}

/** Counts rows of a caller-supplied `FROM` clause (already quoted/joined). */
async function countFrom(
  port: PostgresQueryPort,
  from: string,
  where = "",
  params: readonly unknown[] = []
): Promise<number> {
  const rows = await port.query<{ count: number }>(`SELECT COUNT(*)::int AS "count" FROM ${from}${where}`, params);
  return Number(rows[0]?.count ?? 0);
}

interface EventRow {
  readonly grp: string;
  readonly park: string | null;
  readonly epochms: unknown;
  readonly count: number;
}

/** Reads the PostgreSQL snapshot the shared comparison consumes. */
export async function readPostgresReconciliationSnapshot(port: PostgresQueryPort): Promise<ReconciliationSnapshot> {
  const statusTotals: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const row of await port.query<{ status: string; count: number }>(
    'SELECT "status", COUNT(*)::int AS "count" FROM "attendance_records" GROUP BY "status"'
  )) {
    if (KNOWN_STATUSES.has(String(row.status))) statusTotals[row.status as AttendanceStatus] = Number(row.count);
  }

  const domain = `%@${LAHORE_REFRESH.placeholderEmailDomain}`;
  const placeholders = await countTable(port, "users", ' WHERE "email" LIKE $1', [domain]);
  const activePlaceholders = await countTable(port, "users", ' WHERE "email" LIKE $1 AND "isActive" = true', [domain]);

  const roles: Record<string, number> = {};
  for (const row of await port.query<{ role: string; count: number }>(
    'SELECT s."role" AS "role", COUNT(*)::int AS "count" FROM "staff_meta" s JOIN "users" u ON u."id" = s."userId" WHERE u."email" LIKE $1 GROUP BY s."role"',
    [domain]
  )) {
    roles[String(row.role)] = Number(row.count);
  }

  const parkKeys = (await port.query<{ name: string }>('SELECT "name" FROM "parks"')).map((row) =>
    keyFingerprint(String(row.name))
  );
  const groupKeys = (
    await port.query<{ grp: string; park: string | null }>(
      'SELECT g."name" AS "grp", p."name" AS "park" FROM "groups" g LEFT JOIN "parks" p ON p."id" = g."parkId"'
    )
  ).map((row) => keyFingerprint(`${row.park ?? ""}|${row.grp}`));
  const identityKeys = (
    await port.query<{ name: string; phone: string | null }>('SELECT "name", "phone" FROM "participants"')
  ).map((row) => identityFingerprint(String(row.name), row.phone));
  const placementKeys = (
    await port.query<{ name: string; phone: string | null; park: string | null; grp: string | null }>(
      'SELECT pa."name" AS "name", pa."phone" AS "phone", p."name" AS "park", g."name" AS "grp" FROM "participants" pa LEFT JOIN "groups" g ON g."id" = pa."groupId" LEFT JOIN "parks" p ON p."id" = g."parkId"'
    )
  ).map((row) => placementFingerprint(String(row.name), row.phone, row.park ?? "", row.grp ?? ""));

  const eventRows = await port.query<EventRow>(
    'SELECT g."name" AS "grp", p."name" AS "park", (EXTRACT(EPOCH FROM e."eventDate") * 1000)::double precision AS "epochms", COUNT(r."id")::int AS "count" FROM "attendance_events" e JOIN "groups" g ON g."id" = e."groupId" LEFT JOIN "parks" p ON p."id" = g."parkId" LEFT JOIN "attendance_records" r ON r."eventId" = e."id" GROUP BY e."id", e."eventDate", g."name", p."name"'
  );
  const rawEventKey = (row: EventRow): string => `${row.park ?? ""}|${row.grp}|${pktDate(row.epochms)}`;

  const calendarDateKeys = (
    await port.query<{ epochms: unknown }>(
      'SELECT (EXTRACT(EPOCH FROM "classDate") * 1000)::double precision AS "epochms" FROM "batch_class_dates"'
    )
  ).map((row) => keyFingerprint(pktDate(row.epochms)));

  return {
    aggregates: {
      parks: await countTable(port, "parks"),
      groups: await countTable(port, "groups"),
      participants: await countTable(port, "participants"),
      attendanceEvents: await countTable(port, "attendance_events"),
      attendanceRecords: await countTable(port, "attendance_records"),
      calendarDates: await countTable(port, "batch_class_dates"),
    },
    statusTotals,
    lifecycle: {
      active: await countTable(port, "participants", ' WHERE "state" = $1', ["active"]),
      dropout: await countTable(port, "participants", ' WHERE "state" = $1', ["dropout"]),
      reactivated: await countTable(port, "participants", ' WHERE "reactivatedAt" IS NOT NULL'),
    },
    staff: {
      placeholders,
      inactivePlaceholders: placeholders - activePlaceholders,
      activePlaceholders,
      pendingAssignment: await countFrom(
        port,
        'staff_meta s JOIN users u ON u."id" = s."userId"',
        ' WHERE u."email" LIKE $1 AND s."role" = $2',
        [domain, LAHORE_REFRESH.pendingStaffRole]
      ),
      roles,
    },
    parkKeys,
    groupKeys,
    identityKeys,
    placementKeys,
    eventKeys: eventRows.map((row) => keyFingerprint(rawEventKey(row))),
    calendarDateKeys,
    eventRecordCountKeys: eventRows.map((row) => keyFingerprint(`${rawEventKey(row)}|${row.count}`)),
  };
}

/** Aggregate-only evidence of activity after the import. No rows or identities. */
export async function readPostgresPostImportEvidence(port: PostgresQueryPort): Promise<PostImportEvidence> {
  const auditActionCounts: Record<string, number> = {};
  for (const row of await port.query<{ action: string; count: number }>(
    'SELECT "action", COUNT(*)::int AS "count" FROM "audit_log" WHERE "action" IS NOT NULL GROUP BY "action"'
  )) {
    auditActionCounts[String(row.action)] = Number(row.count);
  }

  const resetAggregate = await port.query<{ max: number; total: number }>(
    'SELECT COALESCE(MAX("resetVersion"), 0)::int AS "max", COALESCE(SUM("resetVersion"), 0)::int AS "total" FROM "attendance_events"'
  );

  const activeStaffRoleCounts: Record<string, number> = {};
  for (const row of await port.query<{ role: string; count: number }>(
    'SELECT s."role" AS "role", COUNT(*)::int AS "count" FROM "staff_meta" s JOIN "users" u ON u."id" = s."userId" WHERE u."isActive" = true GROUP BY s."role"'
  )) {
    activeStaffRoleCounts[String(row.role)] = Number(row.count);
  }

  return {
    auditActionCounts,
    resetEvents: await countTable(port, "attendance_events", ' WHERE "resetVersion" > 0'),
    maxResetVersion: Number(resetAggregate[0]?.max ?? 0),
    resetVersionTotal: Number(resetAggregate[0]?.total ?? 0),
    openEvents: await countTable(port, "attendance_events", ' WHERE "isClosed" = false'),
    eventsClosedByUser: await countTable(port, "attendance_events", ' WHERE "closedBy" IS NOT NULL'),
    recordsMarkedByUser: await countTable(port, "attendance_records", ' WHERE "markedBy" IS NOT NULL'),
    operationReceipts: await countTable(port, "operation_receipts"),
    totalUsers: await countTable(port, "users"),
    superAdminActiveUsers: await countFrom(
      port,
      'users u JOIN staff_meta s ON s."userId" = u."id"',
      ' WHERE u."isActive" = true AND s."role" = $1',
      ["super_admin"]
    ),
    nonSuperAdminActiveUsers: await countFrom(
      port,
      'users u LEFT JOIN staff_meta s ON s."userId" = u."id"',
      ' WHERE u."isActive" = true AND (s."role" IS NULL OR s."role" <> $1)',
      ["super_admin"]
    ),
    placeholderUsers: await countTable(port, "users", ' WHERE "email" LIKE $1', [`%@${LAHORE_REFRESH.placeholderEmailDomain}`]),
    activePlaceholders: await countTable(port, "users", ' WHERE "email" LIKE $1 AND "isActive" = true', [
      `%@${LAHORE_REFRESH.placeholderEmailDomain}`,
    ]),
    activeStaffRoleCounts,
  };
}

/**
 * Compares the approved workbook manifest against the PostgreSQL snapshot. The
 * staff category is excluded because the PostgreSQL import intentionally creates
 * no user or staff row; every other category is compared with the shared rules.
 */
export function buildPostgresReconciliationReport(
  manifest: RefreshManifest,
  database: ReconciliationSnapshot,
  evidence: PostImportEvidence
): ReconciliationReport {
  return buildReconciliationReport(manifestSnapshot(manifest), database, evidence, { staffIsRelevant: false });
}

/** A concise, non-personal human report. Key sets appear only as digests and counts. */
export function formatReconciliationSummary(report: ReconciliationReport): string {
  const lines: string[] = [];
  lines.push(`workbook <-> postgres: ${report.ok ? "EQUAL" : "MISMATCH"}`);
  lines.push(
    `requiredTotals: ${report.requiredTotals.map((total) => `${total.name}=${total.reported}/${total.required}${total.ok ? "" : "!"}`).join(" ")}`
  );
  lines.push(`aggregates: ${JSON.stringify(report.aggregates.database)}`);
  lines.push(`statusTotals: ${JSON.stringify(report.statusTotals.database)}`);
  lines.push(`lifecycle: ${JSON.stringify(report.lifecycle.database)}`);
  for (const key of report.keys) {
    lines.push(
      `  ${key.name}: workbook=${key.workbookHash} database=${key.databaseHash} matched=${key.matched} wbOnly=${key.workbookOnly} dbOnly=${key.databaseOnly}`
    );
  }
  for (const mismatch of report.mismatches) lines.push(`  mismatch ${mismatch.category}: ${mismatch.detail}`);
  return lines.join("\n");
}
