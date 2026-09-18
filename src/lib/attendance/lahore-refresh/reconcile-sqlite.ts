/**
 * SQLite side of the read-only Lahore Batch 4 reconciliation.
 *
 * Every query here is an aggregate or a hashed business key. Participant names
 * and phone numbers are digested immediately and never returned. The caller opens
 * the database read-only; this module never writes.
 */
import type { DatabaseSync } from "node:sqlite";
import { formatPKT } from "../../timezone";
import { sqliteScalar } from "../sqlite-support";
import { LAHORE_REFRESH } from "./constants";
import type { AttendanceStatus } from "./types";
import {
  ATTENDANCE_STATUSES,
  identityFingerprint,
  keyFingerprint,
  placementFingerprint,
  type PostImportEvidence,
  type ReconciliationSnapshot,
} from "./reconcile";

const KNOWN_STATUSES = new Set<string>(ATTENDANCE_STATUSES);

function tableExists(db: DatabaseSync, table: string): boolean {
  const row = db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name = ?").get(table) as {
    count: number;
  };
  return row.count > 0;
}

function columnExists(db: DatabaseSync, table: string, column: string): boolean {
  if (!tableExists(db, table)) return false;
  const info = db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all() as { name: string }[];
  return info.some((entry) => entry.name === column);
}

/** Aggregate row count for an optional table and optional `WHERE` clause. */
function countRows(db: DatabaseSync, table: string, where = "", params: (string | number)[] = []): number {
  if (!tableExists(db, table)) return 0;
  return sqliteScalar(db, `SELECT COUNT(*) AS count FROM "${table}"${where}`, ...params);
}

/** Stored SQLite DateTime (epoch ms) back to the Pakistan-time `YYYY-MM-DD`. */
function pktDate(value: unknown): string {
  return typeof value === "number" ? formatPKT(value, "yyyy-MM-dd") : "—";
}

function placeholderPattern(): string {
  return `%@${LAHORE_REFRESH.placeholderEmailDomain}`;
}

export function readSqliteReconciliationSnapshot(db: DatabaseSync): ReconciliationSnapshot {
  const statusTotals: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  if (tableExists(db, "attendance_records")) {
    for (const row of db
      .prepare('SELECT "status" AS status, COUNT(*) AS count FROM "attendance_records" GROUP BY "status"')
      .all() as { status: string; count: number }[]) {
      if (KNOWN_STATUSES.has(row.status)) statusTotals[row.status as AttendanceStatus] = row.count;
    }
  }

  const domain = placeholderPattern();
  const usersHaveActive = columnExists(db, "users", "isActive");
  const placeholders = countRows(db, "users", ' WHERE "email" LIKE ?', [domain]);
  const activePlaceholders = usersHaveActive ? countRows(db, "users", ' WHERE "email" LIKE ? AND "isActive" = 1', [domain]) : 0;

  const roles: Record<string, number> = {};
  if (tableExists(db, "staff_meta") && tableExists(db, "users")) {
    for (const row of db
      .prepare(
        'SELECT s."role" AS role, COUNT(*) AS count FROM "staff_meta" s JOIN "users" u ON u."id" = s."userId" WHERE u."email" LIKE ? GROUP BY s."role"'
      )
      .all(domain) as { role: string; count: number }[]) {
      roles[row.role] = row.count;
    }
  }

  const parkKeys = tableExists(db, "parks")
    ? (db.prepare('SELECT "name" AS name FROM "parks"').all() as { name: string }[]).map((row) => keyFingerprint(row.name))
    : [];

  const groupKeys = tableExists(db, "groups")
    ? (
        db
          .prepare('SELECT g."name" AS grp, p."name" AS park FROM "groups" g LEFT JOIN "parks" p ON p."id" = g."parkId"')
          .all() as { grp: string; park: string | null }[]
      ).map((row) => keyFingerprint(`${row.park ?? ""}|${row.grp}`))
    : [];

  const identityKeys = tableExists(db, "participants")
    ? (db.prepare('SELECT "name" AS name, "phone" AS phone FROM "participants"').all() as { name: string; phone: string | null }[]).map(
        (row) => identityFingerprint(row.name, row.phone)
      )
    : [];

  const placementKeys = tableExists(db, "participants")
    ? (
        db
          .prepare(
            'SELECT pa."name" AS name, pa."phone" AS phone, p."name" AS park, g."name" AS grp FROM "participants" pa LEFT JOIN "groups" g ON g."id" = pa."groupId" LEFT JOIN "parks" p ON p."id" = g."parkId"'
          )
          .all() as { name: string; phone: string | null; park: string | null; grp: string | null }[]
      ).map((row) => placementFingerprint(row.name, row.phone, row.park ?? "", row.grp ?? ""))
    : [];

  const eventRows = tableExists(db, "attendance_events")
    ? (db
        .prepare(
          'SELECT g."name" AS grp, p."name" AS park, e."eventDate" AS eventDate, COUNT(r."id") AS count FROM "attendance_events" e JOIN "groups" g ON g."id" = e."groupId" LEFT JOIN "parks" p ON p."id" = g."parkId" LEFT JOIN "attendance_records" r ON r."eventId" = e."id" GROUP BY e."id"'
        )
        .all() as { grp: string; park: string | null; eventDate: unknown; count: number }[])
    : [];
  const rawEventKey = (row: { grp: string; park: string | null; eventDate: unknown }): string =>
    `${row.park ?? ""}|${row.grp}|${pktDate(row.eventDate)}`;

  const calendarDateKeys = tableExists(db, "batch_class_dates")
    ? (db.prepare('SELECT "classDate" AS classDate FROM "batch_class_dates"').all() as { classDate: unknown }[]).map((row) =>
        keyFingerprint(pktDate(row.classDate))
      )
    : [];

  return {
    aggregates: {
      parks: countRows(db, "parks"),
      groups: countRows(db, "groups"),
      participants: countRows(db, "participants"),
      attendanceEvents: countRows(db, "attendance_events"),
      attendanceRecords: countRows(db, "attendance_records"),
      calendarDates: countRows(db, "batch_class_dates"),
    },
    statusTotals,
    lifecycle: {
      active: countRows(db, "participants", ' WHERE "state" = ?', ["active"]),
      dropout: countRows(db, "participants", ' WHERE "state" = ?', ["dropout"]),
      reactivated: columnExists(db, "participants", "reactivatedAt")
        ? countRows(db, "participants", ' WHERE "reactivatedAt" IS NOT NULL')
        : 0,
    },
    staff: {
      placeholders,
      inactivePlaceholders: usersHaveActive ? placeholders - activePlaceholders : placeholders,
      activePlaceholders,
      pendingAssignment: tableExists(db, "staff_meta")
        ? sqliteScalar(
            db,
            'SELECT COUNT(*) AS count FROM "staff_meta" s JOIN "users" u ON u."id" = s."userId" WHERE u."email" LIKE ? AND s."role" = ?',
            domain,
            LAHORE_REFRESH.pendingStaffRole
          )
        : 0,
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

export function readSqlitePostImportEvidence(db: DatabaseSync): PostImportEvidence {
  const auditActionCounts: Record<string, number> = {};
  if (tableExists(db, "audit_log") && columnExists(db, "audit_log", "action")) {
    for (const row of db
      .prepare('SELECT "action" AS action, COUNT(*) AS count FROM "audit_log" WHERE "action" IS NOT NULL GROUP BY "action"')
      .all() as { action: string; count: number }[]) {
      auditActionCounts[row.action] = row.count;
    }
  }

  const hasResetVersion = columnExists(db, "attendance_events", "resetVersion");
  const domain = placeholderPattern();
  const usersHaveActive = columnExists(db, "users", "isActive");
  const placeholderUsers = countRows(db, "users", ' WHERE "email" LIKE ?', [domain]);

  let superAdminActiveUsers = 0;
  let nonSuperAdminActiveUsers = 0;
  const activeStaffRoleCounts: Record<string, number> = {};
  if (tableExists(db, "users") && tableExists(db, "staff_meta") && usersHaveActive) {
    superAdminActiveUsers = sqliteScalar(
      db,
      'SELECT COUNT(*) AS count FROM "users" u JOIN "staff_meta" s ON s."userId" = u."id" WHERE u."isActive" = 1 AND s."role" = ?',
      "super_admin"
    );
    nonSuperAdminActiveUsers = sqliteScalar(
      db,
      'SELECT COUNT(*) AS count FROM "users" u LEFT JOIN "staff_meta" s ON s."userId" = u."id" WHERE u."isActive" = 1 AND (s."role" IS NULL OR s."role" <> ?)',
      "super_admin"
    );
    for (const row of db
      .prepare('SELECT s."role" AS role, COUNT(*) AS count FROM "staff_meta" s JOIN "users" u ON u."id" = s."userId" WHERE u."isActive" = 1 GROUP BY s."role"')
      .all() as { role: string; count: number }[]) {
      activeStaffRoleCounts[row.role] = row.count;
    }
  }

  return {
    auditActionCounts,
    resetEvents: hasResetVersion ? countRows(db, "attendance_events", ' WHERE "resetVersion" > 0') : 0,
    maxResetVersion: hasResetVersion
      ? sqliteScalar(db, 'SELECT COALESCE(MAX("resetVersion"), 0) AS count FROM "attendance_events"')
      : 0,
    resetVersionTotal: hasResetVersion
      ? sqliteScalar(db, 'SELECT COALESCE(SUM("resetVersion"), 0) AS count FROM "attendance_events"')
      : 0,
    openEvents: columnExists(db, "attendance_events", "isClosed") ? countRows(db, "attendance_events", ' WHERE "isClosed" = 0') : 0,
    eventsClosedByUser: columnExists(db, "attendance_events", "closedBy")
      ? countRows(db, "attendance_events", ' WHERE "closedBy" IS NOT NULL')
      : 0,
    recordsMarkedByUser: columnExists(db, "attendance_records", "markedBy")
      ? countRows(db, "attendance_records", ' WHERE "markedBy" IS NOT NULL')
      : 0,
    operationReceipts: countRows(db, "operation_receipts"),
    totalUsers: countRows(db, "users"),
    superAdminActiveUsers,
    nonSuperAdminActiveUsers,
    activeStaffRoleCounts,
    placeholderUsers,
    activePlaceholders: usersHaveActive ? countRows(db, "users", ' WHERE "email" LIKE ? AND "isActive" = 1', [domain]) : 0,
  };
}
