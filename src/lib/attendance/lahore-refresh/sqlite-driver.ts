import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import { LAHORE_REFRESH } from "./constants";
import { pktDayEndEpoch, pktDayStartEpoch } from "./pkt-date";
import { assertResetPlanInvariants, buildResetStatements, missingResetTargets, orderTablesForDelete, PRESERVED_TABLES } from "./reset-plan";
import {
  createSqliteFileBackup,
  listSqliteTables as listTables,
  openSqliteDatabase,
  restoreSqliteFileBackup,
  sqliteScalar as scalar,
  verifySqliteBackupFile,
} from "../sqlite-support";
import { assertAttendanceSchemaReady } from "../attendance-schema-reconcile";
import { verifyRefresh } from "./verify";
import type { BackupArtifact, ImportCounts, RefreshManifest, RefreshPorts, RefreshReader } from "./types";

/** A local SQLite refresh target. `backupDir` receives the verified pre-reset copy. */
export interface SqliteRefreshTarget {
  readonly path: string;
  readonly backupDir: string;
}

export function openRefreshDatabase(filePath: string, readOnly = false): DatabaseSync {
  return openSqliteDatabase(filePath, readOnly);
}

/** Column names the target actually has, so INSERTs tolerate schema drift. */
function tableColumnNames(db: DatabaseSync, table: string): Set<string> {
  return new Set((db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map((column) => column.name));
}

function insertRows(db: DatabaseSync, table: string, rows: readonly Record<string, string | number | null>[]): void {
  if (rows.length === 0) return;
  const available = tableColumnNames(db, table);
  const columns = Object.keys(rows[0]).filter((column) => available.has(column));
  const statement = db.prepare(
    `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(",")}) VALUES (${columns.map(() => "?").join(",")})`
  );
  for (const row of rows) statement.run(...columns.map((column) => row[column] ?? null));
}

/** Takes a full SQLite backup with the shared node:sqlite backup primitive. */
export async function createSqliteBackup(target: SqliteRefreshTarget): Promise<BackupArtifact> {
  return createSqliteFileBackup(target, "lahore-refresh");
}

/** A backup is only usable if it opens, passes integrity_check and holds the core tables. */
export async function verifySqliteBackup(artifact: BackupArtifact): Promise<void> {
  await verifySqliteBackupFile(artifact);
  const db = openRefreshDatabase(artifact.path, true);
  try {
    scalar(db, 'SELECT COUNT(*) AS count FROM "users"');
    scalar(db, 'SELECT COUNT(*) AS count FROM "participants"');
    scalar(db, 'SELECT COUNT(*) AS count FROM "_prisma_migrations"');
  } finally {
    db.close();
  }
}

export function restoreSqliteBackup(artifact: BackupArtifact, target: SqliteRefreshTarget): void {
  restoreSqliteFileBackup(artifact, target);
}

/** Real table names present in the target database. */
export function listSqliteTables(db: DatabaseSync): string[] {
  return listTables(db);
}

function readForeignKeyEdges(db: DatabaseSync, tables: readonly string[]): Map<string, Set<string>> {
  const known = new Set(tables);
  const edges = new Map<string, Set<string>>();
  for (const table of tables) {
    const parents = new Set<string>();
    for (const foreignKey of db.prepare(`PRAGMA foreign_key_list("${table}")`).all() as { table: string }[]) {
      if (foreignKey.table !== table && known.has(foreignKey.table)) parents.add(foreignKey.table);
    }
    edges.set(table, parents);
  }
  return edges;
}

/**
 * Dependency-ordered delete that keeps Super Admin identities and metadata.
 * It refuses to run if the target holds a clearable table the plan does not
 * cover, and it derives the child-first order from the target's own foreign-key
 * graph so schema drift cannot silently leave operational data behind.
 */
export function resetSqliteData(dbPath: string): void {
  assertResetPlanInvariants();
  const db = openRefreshDatabase(dbPath);
  try {
    const clearable = listSqliteTables(db).filter((table) => !PRESERVED_TABLES.includes(table));
    const missing = missingResetTargets(clearable);
    if (missing.length > 0) {
      throw new Error(`Refusing reset: tables missing from the plan: ${missing.join(", ")}`);
    }
    const { order, cycle } = orderTablesForDelete(clearable, readForeignKeyEdges(db, clearable));
    if (cycle.length > 0) {
      throw new Error(`Refusing reset: circular foreign keys among: ${cycle.join(", ")}`);
    }

    db.exec("PRAGMA foreign_keys = ON");
    db.exec("BEGIN");
    try {
      for (const statement of buildResetStatements(order)) db.exec(statement);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
}

async function hashDisabledPassword(): Promise<string> {
  return bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
}

/**
 * Writes the manifest into a freshly reset SQLite database. One active batch
 * anchors to the first park because the provider enforces a single active batch
 * per city, and each group carries its own `parkId` so per-park attendance
 * preparation still resolves each group to its own park scope.
 */
export async function importSqliteManifest(dbPath: string, manifest: RefreshManifest): Promise<ImportCounts> {
  const disabledPasswordHash = await hashDisabledPassword();
  const importedAt = Date.now();
  const cityId = crypto.randomUUID();
  const parkIds = new Map(manifest.parks.map((name) => [name, crypto.randomUUID()]));
  const anchorParkId = parkIds.get(manifest.parks[0]) ?? null;
  const batchId = crypto.randomUUID();
  const groupKey = (parkName: string, groupName: string) => `${parkName}|${groupName}`;
  const eventKey = (parkName: string, groupName: string, date: string) => `${parkName}|${groupName}|${date}`;
  const groupIds = new Map(manifest.groups.map((group) => [groupKey(group.parkName, group.name), crypto.randomUUID()]));
  const participantIds = new Map(manifest.participants.map((participant) => [participant.sourceRef, crypto.randomUUID()]));
  const eventIds = new Map(manifest.events.map((event) => [eventKey(event.parkName, event.groupName, event.date), crypto.randomUUID()]));
  const staffRows = manifest.staff.map((member) => ({ ...member, userId: crypto.randomUUID(), staffId: crypto.randomUUID() }));

  const db = openRefreshDatabase(dbPath);
  try {
    db.exec("BEGIN");
    try {
      insertRows(db, "cities", [{ id: cityId, name: manifest.city.name, code: manifest.city.code, isActive: 1, createdAt: importedAt, updatedAt: importedAt }]);
      insertRows(db, "parks", manifest.parks.map((name) => ({ id: parkIds.get(name)!, name, cityId, isActive: 1, createdAt: importedAt, updatedAt: importedAt })));
      insertRows(db, "batches", [{
        id: batchId,
        name: manifest.batch.name,
        parkId: anchorParkId,
        cityId,
        startDate: pktDayStartEpoch(manifest.batch.startDate),
        endDate: pktDayStartEpoch(manifest.batch.endDate),
        isActive: 1,
        createdAt: importedAt,
        updatedAt: importedAt,
      }]);
      insertRows(db, "batch_settings", [{
        id: crypto.randomUUID(),
        batchId,
        classWeekdays: LAHORE_REFRESH.classWeekdays,
        automaticDropoutEnabled: 0,
        warningConsecutiveWeeks: 2,
        dropoutConsecutiveWeeks: 3,
        warningAbsents: 3,
        dropoutAbsents: 6,
        createdAt: importedAt,
        updatedAt: importedAt,
      }]);
      insertRows(db, "groups", manifest.groups.map((group) => ({
        id: groupIds.get(groupKey(group.parkName, group.name))!,
        name: group.name,
        batchId,
        parkId: parkIds.get(group.parkName)!,
        isActive: 1,
        createdAt: importedAt,
        updatedAt: importedAt,
      })));
      insertRows(db, "participants", manifest.participants.map((participant) => ({
        id: participantIds.get(participant.sourceRef)!,
        name: participant.name,
        phone: participant.phone,
        age: participant.age,
        gradeClass: participant.gradeClass,
        state: participant.state,
        dropoutAt: participant.dropoutAt ? pktDayStartEpoch(participant.dropoutAt) : null,
        dropoutReason: participant.dropoutReason,
        dropoutSource: participant.dropoutSource,
        reactivatedAt: participant.reactivatedAt,
        joinedAt: pktDayStartEpoch(participant.joinedAt),
        groupId: groupIds.get(groupKey(participant.parkName, participant.groupName))!,
        createdAt: importedAt,
        updatedAt: importedAt,
      })));
      insertRows(db, "users", staffRows.map((member) => ({
        id: member.userId,
        email: member.email,
        passwordHash: disabledPasswordHash,
        name: member.name,
        phone: member.phone,
        mustResetPwd: 1,
        tokenVersion: 0,
        isActive: 0,
        createdAt: importedAt,
        updatedAt: importedAt,
      })));
      insertRows(db, "staff_meta", staffRows.map((member) => ({
        id: member.staffId,
        userId: member.userId,
        role: member.role,
        assignedCityId: cityId,
        assignedParkId: parkIds.get(member.parkName)!,
        assignedGroupId: null,
        isActive: 0,
        createdAt: importedAt,
        updatedAt: importedAt,
      })));
      insertRows(db, "attendance_events", manifest.events.map((event) => ({
        id: eventIds.get(eventKey(event.parkName, event.groupName, event.date))!,
        groupId: groupIds.get(groupKey(event.parkName, event.groupName))!,
        title: event.title,
        eventDate: pktDayStartEpoch(event.date),
        resetVersion: 0,
        isClosed: 1,
        closedAt: pktDayStartEpoch(event.date),
        closedBy: null,
        createdAt: importedAt,
        updatedAt: importedAt,
      })));
      insertRows(db, "attendance_records", manifest.events.flatMap((event) => event.records.map((record) => ({
        id: crypto.randomUUID(),
        eventId: eventIds.get(eventKey(event.parkName, event.groupName, event.date))!,
        participantId: participantIds.get(record.participantSourceRef)!,
        status: record.status,
        markedBy: null,
        markedAt: pktDayStartEpoch(event.date),
        editReason: "Imported from Lahore Batch 4 workbook",
        createdAt: importedAt,
        updatedAt: importedAt,
      }))));
      insertRows(db, "batch_class_dates", manifest.calendarDates.map((date) => ({
        id: crypto.randomUUID(),
        batchId,
        classDate: pktDayStartEpoch(date),
        createdAt: importedAt,
      })));
      insertRows(db, "audit_log", [{
        id: crypto.randomUUID(),
        userId: null,
        action: "import_lahore_batch_4",
        entityType: "batch",
        entityId: batchId,
        oldValues: null,
        newValues: JSON.stringify({
          participants: manifest.counts.participants,
          attendanceEvents: manifest.counts.attendanceEvents,
          attendanceRecords: manifest.counts.attendanceRecords,
          calendarDates: manifest.counts.calendarDates,
        }),
        reason: null,
        createdAt: importedAt,
      }]);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }

  return {
    parks: manifest.counts.parks,
    groups: manifest.counts.groups,
    participants: manifest.counts.participants,
    staffPlaceholders: manifest.counts.staffPlaceholders,
    attendanceEvents: manifest.counts.attendanceEvents,
    attendanceRecords: manifest.counts.attendanceRecords,
    calendarDates: manifest.counts.calendarDates,
  };
}

export function createSqliteRefreshReader(db: DatabaseSync, manifest: RefreshManifest): RefreshReader {
  return {
    countTable: async (table) => scalar(db, `SELECT COUNT(*) AS count FROM "${table}"`),
    countActiveUsersByRole: async () => {
      const superAdmin = scalar(db, 'SELECT COUNT(*) AS count FROM "users" u JOIN "staff_meta" s ON s."userId" = u."id" WHERE u."isActive" = 1 AND s."role" = ?', "super_admin");
      const other = scalar(db, 'SELECT COUNT(*) AS count FROM "users" u LEFT JOIN "staff_meta" s ON s."userId" = u."id" WHERE u."isActive" = 1 AND (s."role" IS NULL OR s."role" <> ?)', "super_admin");
      return { superAdmin, other };
    },
    countCitiesOtherThanLahore: async () => scalar(db, 'SELECT COUNT(*) AS count FROM "cities" WHERE "code" <> ?', manifest.city.code),
    countParksOutsideLahore: async () => scalar(db, 'SELECT COUNT(*) AS count FROM "parks" p JOIN "cities" c ON c."id" = p."cityId" WHERE c."code" <> ?', manifest.city.code),
    countParticipantsWithoutGroup: async () => scalar(db, 'SELECT COUNT(*) AS count FROM "participants" WHERE "groupId" IS NULL'),
    countGroupsWithoutBatch: async () => scalar(db, 'SELECT COUNT(*) AS count FROM "groups" g WHERE NOT EXISTS (SELECT 1 FROM "batches" b WHERE b."id" = g."batchId")'),
    countAttendanceRecordsAfter: async (date) => scalar(db, 'SELECT COUNT(*) AS count FROM "attendance_records" r JOIN "attendance_events" e ON e."id" = r."eventId" WHERE e."eventDate" > ?', pktDayEndEpoch(date)),
  };
}

export function buildSqliteRefreshPorts(target: SqliteRefreshTarget, loadManifest: () => Promise<RefreshManifest>): RefreshPorts {
  return {
    loadManifest,
    verifyTargetSchema: async (resolved) => {
      if (resolved.kind !== "sqlite") return;
      assertAttendanceSchemaReady(
        resolved.path,
        `node scripts/att01-database-compatibility.ts --database "${resolved.path}" --execute --backup-dir <dir>`
      );
    },
    createBackup: () => createSqliteBackup(target),
    verifyBackup: (artifact) => verifySqliteBackup(artifact),
    restoreBackup: async (artifact) => {
      restoreSqliteBackup(artifact, target);
    },
    resetData: async () => {
      resetSqliteData(target.path);
    },
    importManifest: async (_target, manifest) => importSqliteManifest(target.path, manifest),
    verifyRefresh: async (manifest) => {
      const db = openRefreshDatabase(target.path, true);
      try {
        return await verifyRefresh(createSqliteRefreshReader(db, manifest), manifest);
      } finally {
        db.close();
      }
    },
  };
}
