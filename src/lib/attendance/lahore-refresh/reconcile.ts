/**
 * Read-only Lahore Batch 4 workbook-to-database reconciliation.
 *
 * The approved workbook is the expected side; the local SQLite file is the
 * actual side. This module makes no database call and writes nothing: callers
 * supply already-aggregated, already-hashed snapshots, so the comparison is pure
 * and testable with synthetic fixtures.
 *
 * Privacy: business keys are compared as non-reversible truncated SHA-256
 * digests. Participant names and phone numbers never leave the digest step, and
 * no report carries raw identities, rows or credentials.
 */
import { createHash } from "node:crypto";
import { LAHORE_REFRESH } from "./constants";
import type { AttendanceStatus, RefreshManifest } from "./types";

/** Owner-reviewed Lahore Batch 4 aggregate targets. */
export const APPROVED_TOTALS = Object.freeze({
  parks: LAHORE_REFRESH.expectedParks,
  groups: LAHORE_REFRESH.expectedGroups,
  participants: 339,
  attendanceEvents: 460,
  attendanceRecords: 6210,
  calendarDates: 74,
} as const);

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ["present", "absent", "late", "excused"];

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\s+/g, "");
}

/** Non-reversible participant identity digest: name and phone only, no placement. */
export function identityFingerprint(name: string, phone: string | null | undefined): string {
  return digest(`${normalizeName(name)}|${normalizePhone(phone)}`);
}

/** Non-reversible identity plus park/group placement digest. */
export function placementFingerprint(
  name: string,
  phone: string | null | undefined,
  park: string,
  group: string
): string {
  return digest(`${normalizeName(name)}|${normalizePhone(phone)}|${park}|${group}`);
}

/** Non-reversible digest of an arbitrary business key such as `park|group|date`. */
export function keyFingerprint(value: string): string {
  return digest(value);
}

/** Deterministic digest over a sorted key set, so equal sets yield equal hashes. */
export function fingerprintSet(values: readonly string[]): string {
  return digest([...values].sort().join("\n"));
}

export interface ReconciliationAggregates {
  readonly parks: number;
  readonly groups: number;
  readonly participants: number;
  readonly attendanceEvents: number;
  readonly attendanceRecords: number;
  readonly calendarDates: number;
}

export interface ReconciliationLifecycle {
  readonly active: number;
  readonly dropout: number;
  readonly reactivated: number;
}

export interface ReconciliationStaff {
  readonly placeholders: number;
  readonly inactivePlaceholders: number;
  readonly activePlaceholders: number;
  readonly pendingAssignment: number;
  readonly roles: Readonly<Record<string, number>>;
}

export interface ReconciliationSnapshot {
  readonly aggregates: ReconciliationAggregates;
  readonly statusTotals: Readonly<Record<AttendanceStatus, number>>;
  readonly lifecycle: ReconciliationLifecycle;
  readonly staff: ReconciliationStaff;
  readonly parkKeys: readonly string[];
  readonly groupKeys: readonly string[];
  readonly identityKeys: readonly string[];
  readonly placementKeys: readonly string[];
  readonly eventKeys: readonly string[];
  readonly calendarDateKeys: readonly string[];
  readonly eventRecordCountKeys: readonly string[];
}

/** The workbook-side snapshot, derived from the parsed manifest and its counts. */
export function manifestSnapshot(manifest: RefreshManifest): ReconciliationSnapshot {
  const participants = manifest.participants;
  const roles: Record<string, number> = {};
  for (const member of manifest.staff) roles[member.role] = (roles[member.role] ?? 0) + 1;

  return {
    aggregates: {
      parks: manifest.counts.parks,
      groups: manifest.counts.groups,
      participants: manifest.counts.participants,
      attendanceEvents: manifest.counts.attendanceEvents,
      attendanceRecords: manifest.counts.attendanceRecords,
      calendarDates: manifest.counts.calendarDates,
    },
    statusTotals: {
      present: manifest.counts.statusTotals.present,
      absent: manifest.counts.statusTotals.absent,
      late: manifest.counts.statusTotals.late,
      excused: manifest.counts.statusTotals.excused,
    },
    lifecycle: {
      active: participants.filter((participant) => participant.state === "active").length,
      dropout: participants.filter((participant) => participant.state === "dropout").length,
      reactivated: participants.filter((participant) => participant.reactivatedAt !== null).length,
    },
    staff: {
      placeholders: manifest.staff.length,
      inactivePlaceholders: manifest.staff.filter((member) => !member.isActive).length,
      activePlaceholders: manifest.staff.filter((member) => member.isActive).length,
      pendingAssignment: manifest.staff.filter((member) => member.role === LAHORE_REFRESH.pendingStaffRole).length,
      roles,
    },
    parkKeys: manifest.parks.map(keyFingerprint),
    groupKeys: manifest.groups.map((group) => keyFingerprint(`${group.parkName}|${group.name}`)),
    identityKeys: participants.map((participant) => identityFingerprint(participant.name, participant.phone)),
    placementKeys: participants.map((participant) =>
      placementFingerprint(participant.name, participant.phone, participant.parkName, participant.groupName)
    ),
    eventKeys: manifest.events.map((event) => keyFingerprint(`${event.parkName}|${event.groupName}|${event.date}`)),
    calendarDateKeys: manifest.calendarDates.map(keyFingerprint),
    eventRecordCountKeys: manifest.events.map((event) =>
      keyFingerprint(`${event.parkName}|${event.groupName}|${event.date}|${event.records.length}`)
    ),
  };
}

export interface KeySetComparison {
  readonly name: string;
  readonly workbookCount: number;
  readonly databaseCount: number;
  readonly workbookHash: string;
  readonly databaseHash: string;
  readonly matched: number;
  readonly workbookOnly: number;
  readonly databaseOnly: number;
  readonly workbookDuplicates: number;
  readonly databaseDuplicates: number;
  readonly equal: boolean;
}

function multiset(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

/** Multiset comparison of two hashed key sets; only counts and hashes are returned. */
export function compareKeySets(name: string, workbookKeys: readonly string[], databaseKeys: readonly string[]): KeySetComparison {
  const workbook = multiset(workbookKeys);
  const database = multiset(databaseKeys);
  let matched = 0;
  for (const [key, count] of workbook) matched += Math.min(count, database.get(key) ?? 0);

  return {
    name,
    workbookCount: workbookKeys.length,
    databaseCount: databaseKeys.length,
    workbookHash: fingerprintSet(workbookKeys),
    databaseHash: fingerprintSet(databaseKeys),
    matched,
    workbookOnly: workbookKeys.length - matched,
    databaseOnly: databaseKeys.length - matched,
    workbookDuplicates: workbookKeys.length - workbook.size,
    databaseDuplicates: databaseKeys.length - database.size,
    equal: workbookKeys.length === matched && databaseKeys.length === matched,
  };
}

export type MismatchCategory =
  | "aggregate_totals"
  | "park_set"
  | "group_set"
  | "participant_identity"
  | "participant_placement"
  | "participant_duplicate"
  | "event_set"
  | "event_record_counts"
  | "status_totals"
  | "calendar_dates"
  | "lifecycle_state"
  | "staff_state";

export interface Mismatch {
  readonly category: MismatchCategory;
  readonly detail: string;
  readonly expected?: number | string;
  readonly actual?: number | string;
}

export interface RequiredTotalCheck {
  readonly name: keyof ReconciliationAggregates;
  readonly required: number;
  readonly reported: number;
  readonly ok: boolean;
}

export interface MetricComparison<T> {
  readonly workbook: T;
  readonly database: T;
  readonly equal: boolean;
}

export interface ReconciliationComparison {
  readonly ok: boolean;
  readonly requiredTotals: readonly RequiredTotalCheck[];
  readonly aggregates: MetricComparison<ReconciliationAggregates>;
  readonly keys: readonly KeySetComparison[];
  readonly statusTotals: MetricComparison<Record<AttendanceStatus, number>>;
  readonly lifecycle: MetricComparison<ReconciliationLifecycle>;
  readonly staff: MetricComparison<ReconciliationStaff>;
  readonly mismatches: readonly Mismatch[];
}

function equalRecords(a: Record<string, number>, b: Record<string, number>): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function compareAggregates(
  workbook: ReconciliationAggregates,
  database: ReconciliationAggregates
): MetricComparison<ReconciliationAggregates> {
  return { workbook, database, equal: JSON.stringify(workbook) === JSON.stringify(database) };
}

/** Compares the workbook snapshot against the database snapshot, category by category. */
export function compareSnapshots(workbook: ReconciliationSnapshot, database: ReconciliationSnapshot): ReconciliationComparison {
  const mismatches: Mismatch[] = [];

  const aggregates = compareAggregates(workbook.aggregates, database.aggregates);
  for (const name of Object.keys(APPROVED_TOTALS) as (keyof ReconciliationAggregates)[]) {
    if (workbook.aggregates[name] !== database.aggregates[name]) {
      mismatches.push({
        category: "aggregate_totals",
        detail: `${name} differs between the workbook and the database`,
        expected: workbook.aggregates[name],
        actual: database.aggregates[name],
      });
    }
  }

  const keys: KeySetComparison[] = [
    compareKeySets("parks", workbook.parkKeys, database.parkKeys),
    compareKeySets("groups", workbook.groupKeys, database.groupKeys),
    compareKeySets("participant_identity", workbook.identityKeys, database.identityKeys),
    compareKeySets("participant_placement", workbook.placementKeys, database.placementKeys),
    compareKeySets("attendance_events", workbook.eventKeys, database.eventKeys),
    compareKeySets("calendar_dates", workbook.calendarDateKeys, database.calendarDateKeys),
    compareKeySets("event_record_counts", workbook.eventRecordCountKeys, database.eventRecordCountKeys),
  ];

  const keyCategory: Record<string, MismatchCategory> = {
    parks: "park_set",
    groups: "group_set",
    participant_identity: "participant_identity",
    participant_placement: "participant_placement",
    attendance_events: "event_set",
    calendar_dates: "calendar_dates",
    event_record_counts: "event_record_counts",
  };

  for (const comparison of keys) {
    if (comparison.equal) continue;
    mismatches.push({
      category: keyCategory[comparison.name] ?? "aggregate_totals",
      detail: `${comparison.name}: ${comparison.workbookOnly} workbook-only, ${comparison.databaseOnly} database-only, ${comparison.matched} matched`,
      expected: comparison.workbookCount,
      actual: comparison.databaseCount,
    });
    if (comparison.databaseDuplicates > 0 || comparison.workbookDuplicates > 0) {
      mismatches.push({
        category: "participant_duplicate",
        detail: `${comparison.name}: ${comparison.workbookDuplicates} workbook duplicate(s), ${comparison.databaseDuplicates} database duplicate(s)`,
        expected: comparison.workbookDuplicates,
        actual: comparison.databaseDuplicates,
      });
    }
  }

  const statusTotals: MetricComparison<Record<AttendanceStatus, number>> = {
    workbook: { ...workbook.statusTotals },
    database: { ...database.statusTotals },
    equal: equalRecords(workbook.statusTotals, database.statusTotals),
  };
  if (!statusTotals.equal) {
    mismatches.push({ category: "status_totals", detail: "attendance record status totals differ" });
  }

  const lifecycle: MetricComparison<ReconciliationLifecycle> = {
    workbook: workbook.lifecycle,
    database: database.lifecycle,
    equal: JSON.stringify(workbook.lifecycle) === JSON.stringify(database.lifecycle),
  };
  if (!lifecycle.equal) {
    mismatches.push({
      category: "lifecycle_state",
      detail: "active/dropout/reactivation state totals differ",
      expected: `active=${workbook.lifecycle.active}, dropout=${workbook.lifecycle.dropout}, reactivated=${workbook.lifecycle.reactivated}`,
      actual: `active=${database.lifecycle.active}, dropout=${database.lifecycle.dropout}, reactivated=${database.lifecycle.reactivated}`,
    });
  }

  const staff: MetricComparison<ReconciliationStaff> = {
    workbook: workbook.staff,
    database: database.staff,
    equal: JSON.stringify(workbook.staff) === JSON.stringify(database.staff),
  };
  if (!staff.equal) {
    mismatches.push({ category: "staff_state", detail: "staff placeholder/provisioning totals differ" });
  }

  const ok =
    aggregates.equal &&
    keys.every((comparison) => comparison.equal) &&
    statusTotals.equal &&
    lifecycle.equal &&
    staff.equal;

  return {
    ok,
    requiredTotals: (Object.keys(APPROVED_TOTALS) as (keyof ReconciliationAggregates)[]).map((name) => ({
      name,
      required: APPROVED_TOTALS[name],
      reported: workbook.aggregates[name],
      ok: APPROVED_TOTALS[name] === workbook.aggregates[name],
    })),
    aggregates,
    keys,
    statusTotals,
    lifecycle,
    staff,
    mismatches,
  };
}

/** Aggregate-only evidence of activity after the import. No rows or identities. */
export interface PostImportEvidence {
  readonly auditActionCounts: Readonly<Record<string, number>>;
  readonly resetEvents: number;
  readonly maxResetVersion: number;
  readonly resetVersionTotal: number;
  readonly openEvents: number;
  readonly eventsClosedByUser: number;
  readonly recordsMarkedByUser: number;
  readonly operationReceipts: number;
  readonly totalUsers: number;
  readonly superAdminActiveUsers: number;
  readonly nonSuperAdminActiveUsers: number;
  readonly activeStaffRoleCounts: Readonly<Record<string, number>>;
  readonly placeholderUsers: number;
  readonly activePlaceholders: number;
}

export interface PostImportClassification {
  readonly detected: boolean;
  readonly affectsReconciliation: boolean;
  readonly categories: readonly string[];
  readonly notes: readonly string[];
}

/**
 * Classifies post-import activity instead of overwriting or absorbing it. A reset
 * or an operator mark changes the database from the workbook import, so it is
 * reported as an expected, attributable divergence.
 */
export function classifyPostImport(
  evidence: PostImportEvidence,
  workbook: ReconciliationSnapshot,
  database: ReconciliationSnapshot
): PostImportClassification {
  const categories: string[] = [];
  const notes: string[] = [];

  const resetEvents = evidence.resetEvents + (evidence.auditActionCounts["attendance_reset"] ?? 0);
  if (resetEvents > 0) {
    categories.push("attendance_reset");
    notes.push(
      `session reset evidence: ${evidence.resetEvents} event(s) with resetVersion > 0 (max ${evidence.maxResetVersion}, total ${evidence.resetVersionTotal})`
    );
  }
  if (evidence.recordsMarkedByUser > 0) {
    categories.push("operator_marks");
    notes.push(`${evidence.recordsMarkedByUser} attendance record(s) were written by a user rather than the import`);
  }
  if (evidence.eventsClosedByUser > 0 || evidence.openEvents > 0) {
    categories.push("session_lifecycle_change");
    notes.push(`${evidence.eventsClosedByUser} session(s) closed by a user; ${evidence.openEvents} session(s) currently open`);
  }
  if (evidence.operationReceipts > 0) {
    categories.push("queued_operation_receipts");
    notes.push(`${evidence.operationReceipts} durable offline operation receipt(s) present`);
  }
  if (evidence.nonSuperAdminActiveUsers > 0) {
    categories.push("account_activation");
    notes.push(`${evidence.nonSuperAdminActiveUsers} non-Super-Admin account(s) are active`);
  }

  const recordShortfall = workbook.aggregates.attendanceRecords - database.aggregates.attendanceRecords;
  if (recordShortfall !== 0) {
    notes.push(
      recordShortfall > 0
        ? `${recordShortfall} attendance record(s) fewer than the workbook import (expected after a reset)`
        : `${-recordShortfall} attendance record(s) more than the workbook import`
    );
  }
  const participantDelta = database.aggregates.participants - workbook.aggregates.participants;
  if (participantDelta !== 0) {
    notes.push(
      participantDelta > 0
        ? `${participantDelta} participant(s) exist only in the database (not explained by workbook import)`
        : `${-participantDelta} workbook participant(s) are missing from the database`
    );
  }

  const affectsReconciliation =
    resetEvents > 0 || evidence.recordsMarkedByUser > 0 || evidence.nonSuperAdminActiveUsers > 0;

  return { detected: categories.length > 0, affectsReconciliation, categories, notes };
}

export interface ReconciliationReport extends ReconciliationComparison {
  readonly postImport: {
    readonly evidence: PostImportEvidence;
    readonly classification: PostImportClassification;
  };
}

export function buildReconciliationReport(
  workbook: ReconciliationSnapshot,
  database: ReconciliationSnapshot,
  evidence: PostImportEvidence
): ReconciliationReport {
  return {
    ...compareSnapshots(workbook, database),
    postImport: { evidence, classification: classifyPostImport(evidence, workbook, database) },
  };
}
