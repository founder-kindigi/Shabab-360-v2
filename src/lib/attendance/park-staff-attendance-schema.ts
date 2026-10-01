/**
 * Canonical `park_staff_attendance_*` contract for the local SQLite database.
 *
 * The application and `prisma/schema.prisma` use `park_staff_attendance_events`
 * and `park_staff_attendance_records`, while a refreshed local database can still
 * carry the empty legacy `staff_attendance_*` pair. This module holds the
 * canonical shape, taken verbatim from migration
 * `20260810193000_add_park_staff_attendance`, and decides what has to be created.
 *
 * It is pure: it never opens a connection and never writes. The legacy tables
 * are reported only; nothing here plans to copy, drop, rename or alter them,
 * because their lineage is unresolved and they hold no rows.
 *
 * Reports carry schema object identifiers and counts only — never row values,
 * personal names, emails or passwords.
 */

export interface CanonicalColumn {
  readonly name: string;
  readonly notNull: boolean;
  readonly defaultValue: string | null;
}

export interface CanonicalTable {
  readonly name: string;
  readonly columns: readonly CanonicalColumn[];
  readonly foreignKeys: readonly { readonly column: string; readonly referencesTable: string }[];
}

export interface CanonicalIndex {
  readonly name: string;
  readonly table: string;
  readonly unique: boolean;
  readonly columns: readonly string[];
}

/** The two tables the current application and Prisma schema expect. */
export const CANONICAL_TABLES: readonly CanonicalTable[] = [
  {
    name: "park_staff_attendance_events",
    columns: [
      { name: "id", notNull: true, defaultValue: null },
      { name: "parkId", notNull: true, defaultValue: null },
      { name: "title", notNull: true, defaultValue: null },
      { name: "eventDate", notNull: true, defaultValue: null },
      { name: "isClosed", notNull: true, defaultValue: "false" },
      { name: "closedAt", notNull: false, defaultValue: null },
      { name: "closedBy", notNull: false, defaultValue: null },
      { name: "createdAt", notNull: true, defaultValue: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", notNull: true, defaultValue: null },
    ],
    foreignKeys: [{ column: "parkId", referencesTable: "parks" }],
  },
  {
    name: "park_staff_attendance_records",
    columns: [
      { name: "id", notNull: true, defaultValue: null },
      { name: "eventId", notNull: true, defaultValue: null },
      { name: "staffId", notNull: true, defaultValue: null },
      { name: "status", notNull: true, defaultValue: null },
      { name: "markedBy", notNull: false, defaultValue: null },
      { name: "markedAt", notNull: true, defaultValue: "CURRENT_TIMESTAMP" },
      { name: "editReason", notNull: false, defaultValue: null },
      { name: "createdAt", notNull: true, defaultValue: "CURRENT_TIMESTAMP" },
      { name: "updatedAt", notNull: true, defaultValue: null },
    ],
    foreignKeys: [
      { column: "eventId", referencesTable: "park_staff_attendance_events" },
      { column: "staffId", referencesTable: "staff_meta" },
    ],
  },
];

export const CANONICAL_INDEXES: readonly CanonicalIndex[] = [
  { name: "park_staff_attendance_events_parkId_eventDate_key", table: "park_staff_attendance_events", unique: true, columns: ["parkId", "eventDate"] },
  { name: "park_staff_attendance_events_parkId_eventDate_idx", table: "park_staff_attendance_events", unique: false, columns: ["parkId", "eventDate"] },
  { name: "park_staff_attendance_events_eventDate_idx", table: "park_staff_attendance_events", unique: false, columns: ["eventDate"] },
  { name: "park_staff_attendance_records_eventId_staffId_key", table: "park_staff_attendance_records", unique: true, columns: ["eventId", "staffId"] },
  { name: "park_staff_attendance_records_eventId_idx", table: "park_staff_attendance_records", unique: false, columns: ["eventId"] },
  { name: "park_staff_attendance_records_staffId_idx", table: "park_staff_attendance_records", unique: false, columns: ["staffId"] },
];

/** Legacy tables to preserve exactly as they are. Never copied, dropped or altered. */
export const LEGACY_STAFF_ATTENDANCE_TABLES: readonly string[] = ["staff_attendance_events", "staff_attendance_records"];

/** Tables that must already exist; the canonical tables reference them. */
export const REQUIRED_EXISTING_TABLES: readonly string[] = ["parks", "staff_meta"];

/** DDL for one canonical table, exactly as the retained migration declares it. */
export const CANONICAL_TABLE_DDL: readonly { readonly name: string; readonly statement: string }[] = [
  {
    name: "park_staff_attendance_events",
    statement: `CREATE TABLE "park_staff_attendance_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" DATETIME,
    "closedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "park_staff_attendance_events_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "parks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  },
  {
    name: "park_staff_attendance_records",
    statement: `CREATE TABLE "park_staff_attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedBy" TEXT,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "park_staff_attendance_records_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "park_staff_attendance_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "park_staff_attendance_records_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  },
];

export const CANONICAL_INDEX_DDL: readonly { readonly name: string; readonly table: string; readonly statement: string }[] = [
  { name: "park_staff_attendance_events_parkId_eventDate_key", table: "park_staff_attendance_events", statement: `CREATE UNIQUE INDEX "park_staff_attendance_events_parkId_eventDate_key" ON "park_staff_attendance_events"("parkId", "eventDate")` },
  { name: "park_staff_attendance_events_parkId_eventDate_idx", table: "park_staff_attendance_events", statement: `CREATE INDEX "park_staff_attendance_events_parkId_eventDate_idx" ON "park_staff_attendance_events"("parkId", "eventDate")` },
  { name: "park_staff_attendance_events_eventDate_idx", table: "park_staff_attendance_events", statement: `CREATE INDEX "park_staff_attendance_events_eventDate_idx" ON "park_staff_attendance_events"("eventDate")` },
  { name: "park_staff_attendance_records_eventId_staffId_key", table: "park_staff_attendance_records", statement: `CREATE UNIQUE INDEX "park_staff_attendance_records_eventId_staffId_key" ON "park_staff_attendance_records"("eventId", "staffId")` },
  { name: "park_staff_attendance_records_eventId_idx", table: "park_staff_attendance_records", statement: `CREATE INDEX "park_staff_attendance_records_eventId_idx" ON "park_staff_attendance_records"("eventId")` },
  { name: "park_staff_attendance_records_staffId_idx", table: "park_staff_attendance_records", statement: `CREATE INDEX "park_staff_attendance_records_staffId_idx" ON "park_staff_attendance_records"("staffId")` },
];

export interface CatalogColumnState {
  readonly name: string;
  readonly notNull: boolean;
  readonly defaultValue: string | null;
}

export interface CatalogForeignKeyState {
  readonly column: string;
  readonly referencesTable: string;
  readonly onDelete: string;
}

/** A read-only snapshot of the parts of the schema catalog this contract needs. */
export interface StaffAttendanceCatalog {
  readonly tables: ReadonlyMap<string, { readonly columns: readonly CatalogColumnState[] }>;
  readonly indexes: ReadonlyMap<string, { readonly table: string; readonly unique: boolean }>;
  readonly foreignKeys: ReadonlyMap<string, readonly CatalogForeignKeyState[]>;
}

export interface CanonicalTableStatus {
  readonly table: string;
  readonly present: boolean;
  readonly shapeOk: boolean;
  readonly missingColumns: readonly string[];
  readonly mismatchedColumns: readonly string[];
  readonly missingForeignKeys: readonly string[];
  readonly missingIndexes: readonly string[];
}

export interface ReconciliationPlan {
  readonly statuses: readonly CanonicalTableStatus[];
  readonly legacyTables: readonly { readonly table: string; readonly present: boolean }[];
  readonly missingPrerequisites: readonly string[];
  readonly createStatements: readonly string[];
  readonly blockers: readonly string[];
  readonly upToDate: boolean;
}

function normalizeDefault(value: string | null): string | null {
  return value === null ? null : value.trim().replace(/^'(.*)'$/, "$1").replace(/\s+/g, " ").toUpperCase();
}

/**
 * Existing canonical tables are never altered: a shape mismatch is a blocker for
 * review, because silently widening or rewriting them could lose staff data.
 * Missing tables and missing indexes on a correctly shaped table are safe to add.
 */
export function planStaffAttendanceReconciliation(catalog: StaffAttendanceCatalog): ReconciliationPlan {
  const missingPrerequisites = REQUIRED_EXISTING_TABLES.filter((table) => !catalog.tables.has(table));
  const blockers: string[] = missingPrerequisites.map((table) => `missing prerequisite table: ${table}`);

  const statuses: CanonicalTableStatus[] = [];
  const createStatements: string[] = [];

  for (const table of CANONICAL_TABLES) {
    const existing = catalog.tables.get(table.name);
    const indexes = CANONICAL_INDEXES.filter((index) => index.table === table.name);
    const missingIndexes = indexes.filter((index) => !catalog.indexes.has(index.name)).map((index) => index.name);

    if (!existing) {
      statuses.push({
        table: table.name,
        present: false,
        shapeOk: false,
        missingColumns: table.columns.map((column) => column.name),
        mismatchedColumns: [],
        missingForeignKeys: table.foreignKeys.map((foreignKey) => foreignKey.column),
        missingIndexes,
      });
      createStatements.push(...CANONICAL_TABLE_DDL.filter((ddl) => ddl.name === table.name).map((ddl) => ddl.statement));
      createStatements.push(...CANONICAL_INDEX_DDL.filter((ddl) => ddl.table === table.name).map((ddl) => ddl.statement));
      continue;
    }

    const actualColumns = new Map(existing.columns.map((column) => [column.name, column]));
    const missingColumns = table.columns.filter((column) => !actualColumns.has(column.name)).map((column) => column.name);
    const mismatchedColumns = table.columns
      .filter((column) => actualColumns.has(column.name))
      .filter((column) => {
        const actual = actualColumns.get(column.name);
        if (!actual) return false;
        return actual.notNull !== column.notNull || normalizeDefault(actual.defaultValue) !== normalizeDefault(column.defaultValue);
      })
      .map((column) => column.name);

    const actualForeignKeys = catalog.foreignKeys.get(table.name) ?? [];
    const missingForeignKeys = table.foreignKeys
      .filter((expected) => !actualForeignKeys.some((actual) => actual.column === expected.column && actual.referencesTable === expected.referencesTable))
      .map((expected) => expected.column);

    const shapeOk = missingColumns.length === 0 && mismatchedColumns.length === 0 && missingForeignKeys.length === 0;
    statuses.push({ table: table.name, present: true, shapeOk, missingColumns, mismatchedColumns, missingForeignKeys, missingIndexes });

    if (!shapeOk) {
      for (const column of missingColumns) blockers.push(`existing table ${table.name} is missing column: ${column}`);
      for (const column of mismatchedColumns) blockers.push(`existing table ${table.name} has a mismatched column: ${column}`);
      for (const column of missingForeignKeys) blockers.push(`existing table ${table.name} is missing a foreign key on: ${column}`);
      continue;
    }

    createStatements.push(...CANONICAL_INDEX_DDL.filter((ddl) => missingIndexes.includes(ddl.name)).map((ddl) => ddl.statement));
  }

  for (const table of CANONICAL_TABLES) {
    for (const index of CANONICAL_INDEXES.filter((candidate) => candidate.table === table.name)) {
      const existing = catalog.indexes.get(index.name);
      if (existing && (existing.table !== index.table || existing.unique !== index.unique)) {
        blockers.push(`existing index ${index.name} does not match the canonical definition`);
      }
    }
  }

  const legacyTables = LEGACY_STAFF_ATTENDANCE_TABLES.map((table) => ({ table, present: catalog.tables.has(table) }));

  return {
    statuses,
    legacyTables,
    missingPrerequisites,
    createStatements,
    blockers,
    upToDate: blockers.length === 0 && createStatements.length === 0,
  };
}

/** Fail-closed self-check: the plan may never touch the legacy family. */
export function assertPlanPreservesLegacyTables(plan: ReconciliationPlan): void {
  for (const statement of plan.createStatements) {
    for (const legacy of LEGACY_STAFF_ATTENDANCE_TABLES) {
      if (statement.includes(`"${legacy}"`)) throw new Error(`Reconciliation plan must not reference legacy table: ${legacy}`);
    }
  }
}

export interface StaffAttendancePreflight {
  readonly mode: "read-only";
  readonly canonicalTablesPresent: number;
  readonly canonicalTablesExpected: number;
  readonly canonicalIndexesPresent: number;
  readonly canonicalIndexesExpected: number;
  readonly missingTables: readonly string[];
  readonly missingIndexes: readonly string[];
  readonly legacyTables: readonly { readonly table: string; readonly present: boolean }[];
  readonly blocked: boolean;
  readonly blockers: readonly string[];
  readonly upToDate: boolean;
  readonly plannedStatements: number;
}

/** Aggregate-only summary. It carries schema identifiers and counts, never data. */
export function summarizeStaffAttendancePreflight(catalog: StaffAttendanceCatalog, plan: ReconciliationPlan): StaffAttendancePreflight {
  const missingTables = plan.statuses.filter((status) => !status.present).map((status) => status.table);
  const missingIndexes = plan.statuses.flatMap((status) => (status.shapeOk || !status.present ? status.missingIndexes : []));
  return {
    mode: "read-only",
    canonicalTablesPresent: CANONICAL_TABLES.length - missingTables.length,
    canonicalTablesExpected: CANONICAL_TABLES.length,
    canonicalIndexesPresent: CANONICAL_INDEXES.length - missingIndexes.length,
    canonicalIndexesExpected: CANONICAL_INDEXES.length,
    missingTables,
    missingIndexes,
    legacyTables: plan.legacyTables,
    blocked: plan.blockers.length > 0,
    blockers: plan.blockers,
    upToDate: plan.upToDate,
    plannedStatements: plan.createStatements.length,
  };
}
