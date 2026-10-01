import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMigrationSql } from "../migrations/sqlite-migration-catalog";
import {
  CANONICAL_INDEXES,
  CANONICAL_TABLE_DDL,
  CANONICAL_TABLES,
  LEGACY_STAFF_ATTENDANCE_TABLES,
  assertPlanPreservesLegacyTables,
  planStaffAttendanceReconciliation,
  summarizeStaffAttendancePreflight,
  type StaffAttendanceCatalog,
} from "./park-staff-attendance-schema";

const MIGRATION = "20260810193000_add_park_staff_attendance";

function normalize(value: string | null): string | null {
  return value === null ? null : value.trim().replace(/^'(.*)'$/, "$1").replace(/\s+/g, " ").toUpperCase();
}

interface TableInput {
  readonly columns: readonly { name: string; notNull?: boolean; defaultValue?: string | null }[];
  readonly foreignKeys?: readonly { column: string; referencesTable: string }[];
}

function catalogOf(input: {
  tables?: Record<string, TableInput>;
  indexes?: Record<string, { table: string; unique: boolean }>;
}): StaffAttendanceCatalog {
  const tables = new Map<string, { columns: { name: string; notNull: boolean; defaultValue: string | null }[] }>();
  const foreignKeys = new Map<string, { column: string; referencesTable: string; onDelete: string }[]>();
  for (const [name, table] of Object.entries(input.tables ?? {})) {
    tables.set(name, {
      columns: table.columns.map((column) => ({
        name: column.name,
        notNull: column.notNull ?? false,
        defaultValue: column.defaultValue ?? null,
      })),
    });
    foreignKeys.set(
      name,
      (table.foreignKeys ?? []).map((foreignKey) => ({ column: foreignKey.column, referencesTable: foreignKey.referencesTable, onDelete: "CASCADE" }))
    );
  }
  return { tables, indexes: new Map(Object.entries(input.indexes ?? {})), foreignKeys };
}

/** The canonical tables and indexes as a catalog, i.e. the already-reconciled state. */
function fullyReconciledCatalog(): StaffAttendanceCatalog {
  return catalogOf({
    tables: {
      ...Object.fromEntries(CANONICAL_TABLES.map((table) => [table.name, { columns: table.columns, foreignKeys: table.foreignKeys }])),
      parks: { columns: [{ name: "id", notNull: true }] },
      staff_meta: { columns: [{ name: "id", notNull: true }] },
      staff_attendance_events: { columns: [{ name: "id", notNull: true }] },
      staff_attendance_records: { columns: [{ name: "id", notNull: true }] },
    },
    indexes: Object.fromEntries(CANONICAL_INDEXES.map((index) => [index.name, { table: index.table, unique: index.unique }])),
  });
}

describe("canonical staff-attendance contract", () => {
  it("matches the retained migration that defines it", () => {
    const file = path.resolve(process.cwd(), "prisma", "migrations", MIGRATION, "migration.sql");
    expect(fs.existsSync(file)).toBe(true);
    const parsed = parseMigrationSql(MIGRATION, fs.readFileSync(file, "utf8"));

    expect(parsed.tables.map((table) => table.name).sort()).toEqual(CANONICAL_TABLES.map((table) => table.name).sort());
    for (const table of parsed.tables) {
      const expected = CANONICAL_TABLES.find((candidate) => candidate.name === table.name);
      expect(expected, `${table.name} is not in the canonical contract`).toBeDefined();
      expect(table.columns.map((column) => column.name)).toEqual(expected?.columns.map((column) => column.name));
      for (const column of table.columns) {
        const expectedColumn = expected?.columns.find((candidate) => candidate.name === column.name);
        expect(column.notNull, `${table.name}.${column.name} nullability`).toBe(expectedColumn?.notNull);
        expect(normalize(column.defaultValue), `${table.name}.${column.name} default`).toBe(normalize(expectedColumn?.defaultValue ?? null));
      }
    }

    expect(parsed.indexes.map((index) => index.name).sort()).toEqual(CANONICAL_INDEXES.map((index) => index.name).sort());
    for (const index of parsed.indexes) {
      const expected = CANONICAL_INDEXES.find((candidate) => candidate.name === index.name);
      expect(index.table).toBe(expected?.table);
      expect(index.unique).toBe(expected?.unique);
    }
  });

  it("keeps the executable DDL aligned with the declared foreign keys", () => {
    const records = CANONICAL_TABLE_DDL.find((ddl) => ddl.name === "park_staff_attendance_records");
    const events = CANONICAL_TABLE_DDL.find((ddl) => ddl.name === "park_staff_attendance_events");
    expect(records?.statement).toContain('FOREIGN KEY ("staffId") REFERENCES "staff_meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE');
    expect(records?.statement).toContain(
      'FOREIGN KEY ("eventId") REFERENCES "park_staff_attendance_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    expect(events?.statement).toContain('FOREIGN KEY ("parkId") REFERENCES "parks" ("id") ON DELETE CASCADE ON UPDATE CASCADE');
  });
});

describe("staff-attendance reconciliation planning", () => {
  it("creates both tables and every index when the canonical pair is absent", () => {
    const plan = planStaffAttendanceReconciliation(
      catalogOf({
        tables: {
          parks: { columns: [{ name: "id", notNull: true }] },
          staff_meta: { columns: [{ name: "id", notNull: true }] },
          staff_attendance_events: { columns: [{ name: "id", notNull: true }] },
          staff_attendance_records: { columns: [{ name: "id", notNull: true }] },
        },
      })
    );

    expect(plan.blockers).toEqual([]);
    expect(plan.createStatements).toHaveLength(CANONICAL_TABLES.length + CANONICAL_INDEXES.length);
    expect(plan.statuses.every((status) => !status.present)).toBe(true);
    expect(plan.upToDate).toBe(false);
    expect(plan.legacyTables).toEqual([
      { table: "staff_attendance_events", present: true },
      { table: "staff_attendance_records", present: true },
    ]);
  });

  it("plans nothing when the canonical pair is already complete", () => {
    const plan = planStaffAttendanceReconciliation(fullyReconciledCatalog());
    expect(plan.createStatements).toEqual([]);
    expect(plan.blockers).toEqual([]);
    expect(plan.upToDate).toBe(true);
    expect(plan.statuses.every((status) => status.present && status.shapeOk)).toBe(true);
  });

  it("adds only the missing index when a canonical table is complete", () => {
    const complete = fullyReconciledCatalog();
    const withoutIndex = new Map(complete.indexes);
    withoutIndex.delete("park_staff_attendance_records_staffId_idx");
    const plan = planStaffAttendanceReconciliation({ ...complete, indexes: withoutIndex });

    expect(plan.blockers).toEqual([]);
    expect(plan.createStatements).toEqual([
      'CREATE INDEX "park_staff_attendance_records_staffId_idx" ON "park_staff_attendance_records"("staffId")',
    ]);
    expect(plan.upToDate).toBe(false);
  });

  it("refuses to alter an existing canonical table with a missing column", () => {
    const complete = fullyReconciledCatalog();
    const events = complete.tables.get("park_staff_attendance_events");
    const tables = new Map(complete.tables);
    tables.set("park_staff_attendance_events", { columns: (events?.columns ?? []).filter((column) => column.name !== "closedBy") });
    const plan = planStaffAttendanceReconciliation({ ...complete, tables });

    expect(plan.blockers).toContain("existing table park_staff_attendance_events is missing column: closedBy");
    expect(plan.createStatements.filter((statement) => statement.includes('"park_staff_attendance_events"'))).toEqual([]);
    expect(plan.upToDate).toBe(false);
  });

  it("refuses a column whose nullability or default drifted", () => {
    const complete = fullyReconciledCatalog();
    const records = complete.tables.get("park_staff_attendance_records");
    const tables = new Map(complete.tables);
    tables.set("park_staff_attendance_records", {
      columns: (records?.columns ?? []).map((column) => (column.name === "editReason" ? { ...column, notNull: true } : column)),
    });
    const plan = planStaffAttendanceReconciliation({ ...complete, tables });
    expect(plan.blockers).toContain("existing table park_staff_attendance_records has a mismatched column: editReason");
  });

  it("refuses an existing canonical table without its foreign keys", () => {
    const complete = fullyReconciledCatalog();
    const foreignKeys = new Map(complete.foreignKeys);
    foreignKeys.set("park_staff_attendance_records", [{ column: "eventId", referencesTable: "park_staff_attendance_events", onDelete: "CASCADE" }]);
    const plan = planStaffAttendanceReconciliation({ ...complete, foreignKeys });
    expect(plan.blockers).toContain("existing table park_staff_attendance_records is missing a foreign key on: staffId");
  });

  it("refuses an index that exists with the wrong shape", () => {
    const complete = fullyReconciledCatalog();
    const indexes = new Map(complete.indexes);
    indexes.set("park_staff_attendance_events_eventDate_idx", { table: "parks", unique: true });
    const plan = planStaffAttendanceReconciliation({ ...complete, indexes });
    expect(plan.blockers).toContain("existing index park_staff_attendance_events_eventDate_idx does not match the canonical definition");
  });

  it("refuses to run without the tables the canonical pair references", () => {
    const plan = planStaffAttendanceReconciliation(catalogOf({ tables: { parks: { columns: [{ name: "id", notNull: true }] } } }));
    expect(plan.missingPrerequisites).toEqual(["staff_meta"]);
    expect(plan.blockers).toContain("missing prerequisite table: staff_meta");
  });

  it("lets a legacy-only database remain acceptable and never plans to touch it", () => {
    const plan = planStaffAttendanceReconciliation(
      catalogOf({
        tables: {
          parks: { columns: [{ name: "id", notNull: true }] },
          staff_meta: { columns: [{ name: "id", notNull: true }] },
          staff_attendance_events: { columns: [{ name: "id", notNull: true }] },
          staff_attendance_records: { columns: [{ name: "id", notNull: true }] },
        },
      })
    );
    expect(plan.blockers).toEqual([]);
    expect(() => assertPlanPreservesLegacyTables(plan)).not.toThrow();
    for (const legacy of LEGACY_STAFF_ATTENDANCE_TABLES) {
      expect(plan.createStatements.some((statement) => statement.includes(`"${legacy}"`))).toBe(false);
    }
  });

  it("fails closed if a statement ever references a legacy table", () => {
    expect(() =>
      assertPlanPreservesLegacyTables({
        statuses: [],
        legacyTables: [],
        missingPrerequisites: [],
        createStatements: ['DROP TABLE "staff_attendance_records"'],
        blockers: [],
        upToDate: false,
      })
    ).toThrow(/legacy table/);
  });

  it("summarizes the preflight with counts and schema identifiers only", () => {
    const absent = summarizeStaffAttendancePreflight(
      catalogOf({
        tables: {
          parks: { columns: [{ name: "id", notNull: true }] },
          staff_meta: { columns: [{ name: "id", notNull: true }] },
        },
      }),
      planStaffAttendanceReconciliation(
        catalogOf({
          tables: {
            parks: { columns: [{ name: "id", notNull: true }] },
            staff_meta: { columns: [{ name: "id", notNull: true }] },
          },
        })
      )
    );
    expect(absent).toMatchObject({
      mode: "read-only",
      canonicalTablesPresent: 0,
      canonicalTablesExpected: 2,
      canonicalIndexesPresent: 0,
      canonicalIndexesExpected: 6,
      blocked: false,
      upToDate: false,
      plannedStatements: 8,
    });

    const complete = fullyReconciledCatalog();
    const done = summarizeStaffAttendancePreflight(complete, planStaffAttendanceReconciliation(complete));
    expect(done).toMatchObject({ canonicalTablesPresent: 2, canonicalIndexesPresent: 6, upToDate: true, plannedStatements: 0 });
  });
});
