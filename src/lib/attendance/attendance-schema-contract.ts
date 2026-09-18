/**
 * ATT01 attendance database contract and additive-reconciliation planner.
 *
 * The authoritative contract is the current code and `prisma/schema.prisma`, not
 * the historical migrations. It covers the attendance objects the active ATT01
 * routes, offline sync and helpers actually read or write:
 *
 *   - attendance sessions and marks (`attendance_events`, `attendance_records`)
 *   - session reset/version handling (`attendance_events.resetVersion`)
 *   - weekly settings and the schedule calendar (`batch_settings`,
 *     `batch_class_dates`, `operational_off_dates`)
 *   - dropout/rejoin lifecycle (`participants.dropoutAt`, `dropoutReason`,
 *     `dropoutSource`, `reactivatedAt`)
 *   - staff roll-call (`park_staff_attendance_events`, `park_staff_attendance_records`)
 *
 * The planner is pure and only ever proposes additive work:
 *
 *   - create a table that is absent when an authoritative definition exists;
 *   - add a missing nullable column, or a missing NOT NULL column that carries a
 *     constant default;
 *   - create a missing index.
 *
 * It fails closed for anything that would need a table rebuild, a data
 * conversion, a constraint replacement or an ambiguous default. It never plans a
 * drop, rename, copy or rebuild, and it never plans to touch the preserved legacy
 * `staff_attendance_*` tables.
 */
import { CANONICAL_TABLE_DDL, LEGACY_STAFF_ATTENDANCE_TABLES } from "./park-staff-attendance-schema";

export interface RequiredColumn {
  readonly name: string;
  readonly type: string;
  readonly notNull: boolean;
  /** Constant SQL default. Required before a NOT NULL column can be added safely. */
  readonly defaultSql: string | null;
}

export interface RequiredIndex {
  readonly name: string;
  readonly unique: boolean;
  readonly columns: readonly string[];
}

export interface RequiredTable {
  readonly name: string;
  readonly columns: readonly RequiredColumn[];
  readonly foreignKeys: readonly { readonly column: string; readonly referencesTable: string }[];
  readonly indexes: readonly RequiredIndex[];
  /** Authoritative `CREATE TABLE` (from a retained migration) or null when none exists. */
  readonly createTableDdl: string | null;
  /**
   * False only for the canonical staff pair, whose accepted reconciliation fixed
   * a create-or-verify contract. A missing column there is a blocker for review
   * rather than an automatic add.
   */
  readonly allowAdditiveColumns: boolean;
  /** When false only the listed columns are in ATT01 scope for this shared table. */
  readonly fullColumnContract: boolean;
}

export interface AttendanceCatalogColumn {
  readonly name: string;
  readonly notNull: boolean;
}

export interface AttendanceSchemaCatalog {
  readonly tables: ReadonlyMap<string, { readonly columns: readonly AttendanceCatalogColumn[] }>;
  readonly indexes: ReadonlyMap<string, { readonly table: string; readonly unique: boolean }>;
  readonly foreignKeys: ReadonlyMap<string, readonly { readonly column: string; readonly referencesTable: string }[]>;
}

export type RequirementKind = "table" | "column" | "index" | "foreign-key";

export interface TableStatus {
  readonly table: string;
  readonly present: boolean;
  readonly shapeOk: boolean;
  readonly missingColumns: readonly string[];
  readonly missingIndexes: readonly string[];
  readonly missingForeignKeys: readonly string[];
  readonly plannedStatements: number;
}

export interface AttendanceSchemaPlan {
  readonly statuses: readonly TableStatus[];
  readonly createStatements: readonly string[];
  readonly blockers: readonly string[];
  readonly upToDate: boolean;
}

/**
 * Tables the Prisma SQLite schema declares in the attendance domain but that no
 * current code path references. Reported for visibility; never reconciled here.
 */
export const DECLARED_UNREFERENCED_TABLES: readonly string[] = [
  "attendance_roster_snapshots",
  "batch_off_weekdays",
  "batch_off_dates",
];

/** Tables a reconciliation must never modify. Preserved exactly as they are. */
export const PRESERVED_LEGACY_TABLES: readonly string[] = LEGACY_STAFF_ATTENDANCE_TABLES;

/** The retained migration is the single authoritative definition of the staff pair. */
function staffTableDdl(name: string): string {
  const ddl = CANONICAL_TABLE_DDL.find((entry) => entry.name === name);
  if (!ddl) throw new Error(`Missing authoritative DDL for ${name}`);
  return ddl.statement;
}

const STAFF_EVENT_COLUMNS: readonly RequiredColumn[] = [
  { name: "id", type: "TEXT", notNull: true, defaultSql: null },
  { name: "parkId", type: "TEXT", notNull: true, defaultSql: null },
  { name: "title", type: "TEXT", notNull: true, defaultSql: null },
  { name: "eventDate", type: "DATETIME", notNull: true, defaultSql: null },
  { name: "isClosed", type: "BOOLEAN", notNull: true, defaultSql: "false" },
  { name: "closedAt", type: "DATETIME", notNull: false, defaultSql: null },
  { name: "closedBy", type: "TEXT", notNull: false, defaultSql: null },
  { name: "createdAt", type: "DATETIME", notNull: true, defaultSql: "CURRENT_TIMESTAMP" },
  { name: "updatedAt", type: "DATETIME", notNull: true, defaultSql: null },
];

const STAFF_RECORD_COLUMNS: readonly RequiredColumn[] = [
  { name: "id", type: "TEXT", notNull: true, defaultSql: null },
  { name: "eventId", type: "TEXT", notNull: true, defaultSql: null },
  { name: "staffId", type: "TEXT", notNull: true, defaultSql: null },
  { name: "status", type: "TEXT", notNull: true, defaultSql: null },
  { name: "markedBy", type: "TEXT", notNull: false, defaultSql: null },
  { name: "markedAt", type: "DATETIME", notNull: true, defaultSql: "CURRENT_TIMESTAMP" },
  { name: "editReason", type: "TEXT", notNull: false, defaultSql: null },
  { name: "createdAt", type: "DATETIME", notNull: true, defaultSql: "CURRENT_TIMESTAMP" },
  { name: "updatedAt", type: "DATETIME", notNull: true, defaultSql: null },
];

/**
 * The complete ATT01 requirement set. `createTableDdl` is populated only where a
 * retained migration gives an authoritative definition; the base tables that
 * predate the migration history must already exist, so their absence is a
 * blocker rather than an invitation to invent DDL.
 */
export const REQUIRED_TABLES: readonly RequiredTable[] = [
  {
    name: "attendance_events",
    columns: [
      { name: "id", type: "TEXT", notNull: true, defaultSql: null },
      { name: "groupId", type: "TEXT", notNull: true, defaultSql: null },
      { name: "title", type: "TEXT", notNull: true, defaultSql: null },
      { name: "eventDate", type: "DATETIME", notNull: true, defaultSql: null },
      // Session reset generation: every queued mark older than this is invalid.
      { name: "resetVersion", type: "INTEGER", notNull: true, defaultSql: "0" },
      { name: "isClosed", type: "BOOLEAN", notNull: true, defaultSql: "false" },
      { name: "closedAt", type: "DATETIME", notNull: false, defaultSql: null },
      { name: "closedBy", type: "TEXT", notNull: false, defaultSql: null },
      { name: "createdAt", type: "DATETIME", notNull: true, defaultSql: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "DATETIME", notNull: true, defaultSql: null },
    ],
    foreignKeys: [{ column: "groupId", referencesTable: "groups" }],
    indexes: [
      { name: "attendance_events_groupId_eventDate_key", unique: true, columns: ["groupId", "eventDate"] },
      { name: "attendance_events_eventDate_idx", unique: false, columns: ["eventDate"] },
    ],
    createTableDdl: null,
    allowAdditiveColumns: true,
    fullColumnContract: true,
  },
  {
    name: "attendance_records",
    columns: [
      { name: "id", type: "TEXT", notNull: true, defaultSql: null },
      { name: "eventId", type: "TEXT", notNull: true, defaultSql: null },
      { name: "participantId", type: "TEXT", notNull: true, defaultSql: null },
      { name: "status", type: "TEXT", notNull: true, defaultSql: null },
      { name: "markedBy", type: "TEXT", notNull: false, defaultSql: null },
      { name: "markedAt", type: "DATETIME", notNull: true, defaultSql: "CURRENT_TIMESTAMP" },
      { name: "editReason", type: "TEXT", notNull: false, defaultSql: null },
      { name: "createdAt", type: "DATETIME", notNull: true, defaultSql: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "DATETIME", notNull: true, defaultSql: null },
    ],
    foreignKeys: [
      { column: "eventId", referencesTable: "attendance_events" },
      { column: "participantId", referencesTable: "participants" },
    ],
    indexes: [
      { name: "attendance_records_eventId_participantId_key", unique: true, columns: ["eventId", "participantId"] },
      { name: "attendance_records_eventId_idx", unique: false, columns: ["eventId"] },
      { name: "attendance_records_participantId_idx", unique: false, columns: ["participantId"] },
    ],
    createTableDdl: null,
    allowAdditiveColumns: true,
    fullColumnContract: true,
  },
  {
    name: "batch_settings",
    columns: [
      { name: "id", type: "TEXT", notNull: true, defaultSql: null },
      { name: "batchId", type: "TEXT", notNull: true, defaultSql: null },
      { name: "warningAbsents", type: "INTEGER", notNull: true, defaultSql: "3" },
      { name: "dropoutAbsents", type: "INTEGER", notNull: true, defaultSql: "6" },
      { name: "classWeekdays", type: "TEXT", notNull: true, defaultSql: "'[0,6]'" },
      { name: "automaticDropoutEnabled", type: "BOOLEAN", notNull: true, defaultSql: "true" },
      { name: "warningConsecutiveWeeks", type: "INTEGER", notNull: true, defaultSql: "2" },
      { name: "dropoutConsecutiveWeeks", type: "INTEGER", notNull: true, defaultSql: "3" },
      { name: "createdAt", type: "DATETIME", notNull: true, defaultSql: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "DATETIME", notNull: true, defaultSql: null },
    ],
    foreignKeys: [{ column: "batchId", referencesTable: "batches" }],
    indexes: [{ name: "batch_settings_batchId_key", unique: true, columns: ["batchId"] }],
    createTableDdl: null,
    allowAdditiveColumns: true,
    fullColumnContract: true,
  },
  {
    name: "batch_class_dates",
    columns: [
      { name: "id", type: "TEXT", notNull: true, defaultSql: null },
      { name: "batchId", type: "TEXT", notNull: true, defaultSql: null },
      { name: "classDate", type: "DATETIME", notNull: true, defaultSql: null },
      { name: "createdAt", type: "DATETIME", notNull: true, defaultSql: "CURRENT_TIMESTAMP" },
    ],
    foreignKeys: [{ column: "batchId", referencesTable: "batches" }],
    indexes: [
      { name: "batch_class_dates_batchId_classDate_key", unique: true, columns: ["batchId", "classDate"] },
      { name: "batch_class_dates_classDate_idx", unique: false, columns: ["classDate"] },
    ],
    createTableDdl: null,
    allowAdditiveColumns: true,
    fullColumnContract: true,
  },
  {
    name: "operational_off_dates",
    columns: [
      { name: "id", type: "TEXT", notNull: true, defaultSql: null },
      { name: "cityId", type: "TEXT", notNull: true, defaultSql: null },
      { name: "offDate", type: "DATETIME", notNull: true, defaultSql: null },
      { name: "label", type: "TEXT", notNull: true, defaultSql: null },
      { name: "createdAt", type: "DATETIME", notNull: true, defaultSql: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", type: "DATETIME", notNull: true, defaultSql: null },
    ],
    foreignKeys: [{ column: "cityId", referencesTable: "cities" }],
    indexes: [
      { name: "operational_off_dates_cityId_offDate_key", unique: true, columns: ["cityId", "offDate"] },
      { name: "operational_off_dates_offDate_idx", unique: false, columns: ["offDate"] },
    ],
    createTableDdl: null,
    allowAdditiveColumns: true,
    fullColumnContract: true,
  },
  {
    // Shared table: only the ATT01 dropout/rejoin lifecycle columns are in scope.
    name: "participants",
    columns: [
      { name: "dropoutAt", type: "DATETIME", notNull: false, defaultSql: null },
      { name: "dropoutReason", type: "TEXT", notNull: false, defaultSql: null },
      { name: "dropoutSource", type: "TEXT", notNull: false, defaultSql: null },
      { name: "reactivatedAt", type: "DATETIME", notNull: false, defaultSql: null },
    ],
    foreignKeys: [],
    indexes: [{ name: "participants_groupId_state_idx", unique: false, columns: ["groupId", "state"] }],
    createTableDdl: null,
    allowAdditiveColumns: true,
    fullColumnContract: false,
  },
  {
    name: "park_staff_attendance_events",
    columns: STAFF_EVENT_COLUMNS,
    foreignKeys: [{ column: "parkId", referencesTable: "parks" }],
    indexes: [
      { name: "park_staff_attendance_events_parkId_eventDate_key", unique: true, columns: ["parkId", "eventDate"] },
      { name: "park_staff_attendance_events_parkId_eventDate_idx", unique: false, columns: ["parkId", "eventDate"] },
      { name: "park_staff_attendance_events_eventDate_idx", unique: false, columns: ["eventDate"] },
    ],
    createTableDdl: staffTableDdl("park_staff_attendance_events"),
    allowAdditiveColumns: false,
    fullColumnContract: true,
  },
  {
    name: "park_staff_attendance_records",
    columns: STAFF_RECORD_COLUMNS,
    foreignKeys: [
      { column: "eventId", referencesTable: "park_staff_attendance_events" },
      { column: "staffId", referencesTable: "staff_meta" },
    ],
    indexes: [
      { name: "park_staff_attendance_records_eventId_staffId_key", unique: true, columns: ["eventId", "staffId"] },
      { name: "park_staff_attendance_records_eventId_idx", unique: false, columns: ["eventId"] },
      { name: "park_staff_attendance_records_staffId_idx", unique: false, columns: ["staffId"] },
    ],
    createTableDdl: staffTableDdl("park_staff_attendance_records"),
    allowAdditiveColumns: false,
    fullColumnContract: true,
  },
];

/** Tables the canonical pair and the shared tables reference. */
export const REQUIRED_SUPPORT_TABLES: readonly string[] = ["groups", "participants", "batches", "cities", "parks", "staff_meta"];

export function createIndexStatement(table: string, index: RequiredIndex): string {
  const columns = index.columns.map((column) => `"${column}"`).join(", ");
  return `CREATE ${index.unique ? "UNIQUE " : ""}INDEX "${index.name}" ON "${table}"(${columns})`;
}

/**
 * The only column addition this package considers safe: nullable, or NOT NULL with
 * a constant default. Anything else needs a rebuild or a data conversion.
 */
export function additiveColumnStatement(table: string, column: RequiredColumn): string | null {
  if (!column.notNull) return `ALTER TABLE "${table}" ADD COLUMN "${column.name}" ${column.type}`;
  if (column.defaultSql !== null) {
    return `ALTER TABLE "${table}" ADD COLUMN "${column.name}" ${column.type} NOT NULL DEFAULT ${column.defaultSql}`;
  }
  return null;
}

export function planAttendanceSchema(catalog: AttendanceSchemaCatalog): AttendanceSchemaPlan {
  const blockers: string[] = [];
  const createStatements: string[] = [];
  const statuses: TableStatus[] = [];

  const missingSupport = REQUIRED_SUPPORT_TABLES.filter((table) => !catalog.tables.has(table));
  for (const table of missingSupport) blockers.push(`missing support table: ${table}`);

  for (const table of REQUIRED_TABLES) {
    const existing = catalog.tables.get(table.name);
    if (!existing) {
      if (table.createTableDdl === null) {
        blockers.push(`required table ${table.name} is absent and no authoritative definition is available in this package`);
        statuses.push({
          table: table.name,
          present: false,
          shapeOk: false,
          missingColumns: table.columns.map((column) => column.name),
          missingIndexes: table.indexes.map((index) => index.name),
          missingForeignKeys: table.foreignKeys.map((foreignKey) => foreignKey.column),
          plannedStatements: 0,
        });
        continue;
      }
      const statements = [table.createTableDdl, ...table.indexes.map((index) => createIndexStatement(table.name, index))];
      createStatements.push(...statements);
      statuses.push({
        table: table.name,
        present: false,
        shapeOk: true,
        missingColumns: [],
        missingIndexes: table.indexes.map((index) => index.name),
        missingForeignKeys: [],
        plannedStatements: statements.length,
      });
      continue;
    }

    const actualColumns = new Map(existing.columns.map((column) => [column.name, column]));
    const missingColumns: string[] = [];
    const tableStatements: string[] = [];

    for (const column of table.columns) {
      const actual = actualColumns.get(column.name);
      if (!actual) {
        missingColumns.push(column.name);
        const statement = table.allowAdditiveColumns ? additiveColumnStatement(table.name, column) : null;
        if (statement === null) {
          blockers.push(`existing table ${table.name} is missing column ${column.name}, which cannot be added without a table rebuild or an unambiguous default`);
        } else {
          tableStatements.push(statement);
        }
        continue;
      }
      if (column.notNull && !actual.notNull) {
        blockers.push(`existing column ${table.name}.${column.name} is nullable where the contract requires NOT NULL (table rebuild required)`);
      }
    }

    const actualForeignKeys = catalog.foreignKeys.get(table.name) ?? [];
    const missingForeignKeys = table.foreignKeys
      .filter((expected) => !actualForeignKeys.some((actual) => actual.column === expected.column && actual.referencesTable === expected.referencesTable))
      .map((expected) => expected.column);
    for (const column of missingForeignKeys) {
      blockers.push(`existing table ${table.name} is missing the foreign key on ${column} (SQLite cannot add it without a table rebuild)`);
    }

    const missingIndexes = table.indexes.filter((index) => !catalog.indexes.has(index.name)).map((index) => index.name);
    for (const index of table.indexes) {
      const actual = catalog.indexes.get(index.name);
      if (actual && (actual.table !== table.name || actual.unique !== index.unique)) {
        blockers.push(`existing index ${index.name} does not match the contract (wrong table or uniqueness)`);
      }
    }
    for (const name of missingIndexes) {
      const index = table.indexes.find((candidate) => candidate.name === name);
      if (index) tableStatements.push(createIndexStatement(table.name, index));
    }

    createStatements.push(...tableStatements);
    statuses.push({
      table: table.name,
      present: true,
      shapeOk: missingColumns.length === 0 && missingForeignKeys.length === 0,
      missingColumns,
      missingIndexes,
      missingForeignKeys,
      plannedStatements: tableStatements.length,
    });
  }

  return { statuses, createStatements, blockers, upToDate: blockers.length === 0 && createStatements.length === 0 };
}

/** Fail-closed self-check: no planned statement may reference a preserved table. */
export function assertPlanPreservesLegacyTables(plan: AttendanceSchemaPlan): void {
  for (const statement of plan.createStatements) {
    for (const legacy of PRESERVED_LEGACY_TABLES) {
      if (statement.includes(`"${legacy}"`)) throw new Error(`Attendance plan must not reference preserved table: ${legacy}`);
    }
  }
}

export interface AttendanceSchemaPreflight {
  readonly mode: "read-only";
  readonly requiredTables: number;
  readonly presentTables: number;
  readonly requiredColumns: number;
  readonly missingColumns: readonly string[];
  readonly requiredIndexes: number;
  readonly missingIndexes: readonly string[];
  readonly missingForeignKeys: readonly string[];
  readonly missingSupportTables: readonly string[];
  readonly preservedLegacyTables: readonly { readonly table: string; readonly present: boolean }[];
  readonly declaredUnreferencedTables: readonly { readonly table: string; readonly present: boolean }[];
  readonly blocked: boolean;
  readonly blockers: readonly string[];
  readonly upToDate: boolean;
  readonly plannedStatements: number;
}

/** Aggregate and schema-identifier output only; never row values or personal data. */
export function summarizeAttendanceSchemaPreflight(
  catalog: AttendanceSchemaCatalog,
  plan: AttendanceSchemaPlan
): AttendanceSchemaPreflight {
  const requiredColumns = REQUIRED_TABLES.reduce((total, table) => total + table.columns.length, 0);
  const missingColumns = plan.statuses.flatMap((status) => status.missingColumns.map((column) => `${status.table}.${column}`));
  const requiredIndexes = REQUIRED_TABLES.reduce((total, table) => total + table.indexes.length, 0);
  return {
    mode: "read-only",
    requiredTables: REQUIRED_TABLES.length,
    presentTables: plan.statuses.filter((status) => status.present).length,
    requiredColumns,
    missingColumns,
    requiredIndexes,
    missingIndexes: plan.statuses.flatMap((status) => status.missingIndexes),
    missingForeignKeys: plan.statuses.flatMap((status) => status.missingForeignKeys.map((column) => `${status.table}.${column}`)),
    missingSupportTables: REQUIRED_SUPPORT_TABLES.filter((table) => !catalog.tables.has(table)),
    preservedLegacyTables: PRESERVED_LEGACY_TABLES.map((table) => ({ table, present: catalog.tables.has(table) })),
    declaredUnreferencedTables: DECLARED_UNREFERENCED_TABLES.map((table) => ({ table, present: catalog.tables.has(table) })),
    blocked: plan.blockers.length > 0,
    blockers: plan.blockers,
    upToDate: plan.upToDate,
    plannedStatements: plan.createStatements.length,
  };
}
