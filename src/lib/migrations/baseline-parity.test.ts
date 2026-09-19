import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COLLISION_CHECKS, COLLISION_CHECKS_BY_MIGRATION } from "./production-preflight";
import {
  BaselineInputError,
  REQUIRED_ATT01_MIGRATIONS,
  missingRequiredMigrations,
  parseForeignKeyStatements,
  requireBaselineTexts,
} from "./baseline-parity";

const SQLITE_SCHEMA = resolve(process.cwd(), "prisma/schema.prisma");
const POSTGRES_SCHEMA = resolve(process.cwd(), "prisma/postgres/schema.prisma");
const SQLITE_MIGRATIONS = resolve(process.cwd(), "prisma/migrations");
const POSTGRES_MIGRATIONS = resolve(process.cwd(), "prisma/postgres/migrations");

const MUAWIN_MIGRATION = "20260916080000_add_muawin_assistance";
const MUAWIN_FOREIGN_KEY = "staff_meta_assistsMurabbiId_fkey";

const read = (path: string): string => readFileSync(path, "utf8");
/** Collapses formatting differences so the same model can be compared across providers. */
const normalize = (text: string): string => text.replace(/\s+/g, " ");

function migrationFolders(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("2026"))
    .map((entry) => entry.name);
}

function migrationSql(root: string, name: string): string {
  return read(resolve(root, name, "migration.sql"));
}

describe("Muawin assistance model parity", () => {
  it("declares the same relation, back-relation and index in both schema providers", () => {
    const sqlite = normalize(read(SQLITE_SCHEMA));
    const postgres = normalize(read(POSTGRES_SCHEMA));

    const expectations = [
      "assistsMurabbiId String?",
      'assistsMurabbi StaffMeta? @relation("MuawinAssistance", fields: [assistsMurabbiId], references: [id], onDelete: SetNull)',
      'muawinAssistants StaffMeta[] @relation("MuawinAssistance")',
      "@@index([assistsMurabbiId])",
    ];
    for (const expectation of expectations) {
      expect(sqlite).toContain(expectation);
      expect(postgres).toContain(expectation);
    }
  });

  it("keeps the required migration in both chains with an identical folder name", () => {
    expect(missingRequiredMigrations(migrationFolders(SQLITE_MIGRATIONS))).toEqual([]);
    expect(missingRequiredMigrations(migrationFolders(POSTGRES_MIGRATIONS))).toEqual([]);
  });

  it("adds the guarded column and index in SQLite and the matching foreign key in PostgreSQL", () => {
    const sqlite = migrationSql(SQLITE_MIGRATIONS, MUAWIN_MIGRATION);
    const postgres = migrationSql(POSTGRES_MIGRATIONS, MUAWIN_MIGRATION);

    expect(sqlite).toContain('ADD COLUMN "assistsMurabbiId" TEXT');
    expect(sqlite).toContain('CREATE INDEX "staff_meta_assistsMurabbiId_idx"');

    const statements = parseForeignKeyStatements(postgres);
    expect(statements).toContainEqual({
      table: "staff_meta",
      constraint: MUAWIN_FOREIGN_KEY,
      realigned: false,
    });
    expect(postgres).toContain("ON DELETE SET NULL");
    expect(postgres).toContain('CREATE INDEX IF NOT EXISTS "staff_meta_assistsMurabbiId_idx"');
  });
});

describe("foreign-key statement detection", () => {
  it("reports a missing foreign key as absent rather than inferring one", () => {
    expect(parseForeignKeyStatements('ALTER TABLE "staff_meta" ADD COLUMN "assistsMurabbiId" TEXT;')).toEqual([]);
  });

  it("detects a mismatched constraint name", () => {
    const mismatched = 'ALTER TABLE "staff_meta" ADD CONSTRAINT "staff_meta_assistsMurabbiId_wrong" FOREIGN KEY ("assistsMurabbiId") REFERENCES "staff_meta"("id");';
    const names = parseForeignKeyStatements(mismatched).map((statement) => statement.constraint);
    expect(names).toEqual(["staff_meta_assistsMurabbiId_wrong"]);
    expect(names).not.toContain(MUAWIN_FOREIGN_KEY);
  });

  it("marks a drop-then-re-add realignment so it is not treated as an unguarded collision", () => {
    const realigned =
      'ALTER TABLE "staff_meta" DROP CONSTRAINT "staff_meta_assistsMurabbiId_fkey";\n' +
      'ALTER TABLE "staff_meta" ADD CONSTRAINT "staff_meta_assistsMurabbiId_fkey" FOREIGN KEY ("assistsMurabbiId") REFERENCES "staff_meta"("id");';
    expect(parseForeignKeyStatements(realigned)).toEqual([
      { table: "staff_meta", constraint: MUAWIN_FOREIGN_KEY, realigned: true },
    ]);
  });

  it("covers every unguarded foreign key in the modelled sequence with a collision check", () => {
    const declared = new Set(
      COLLISION_CHECKS.filter((check) => check.kind === "constraint").map((check) => check.name)
    );
    const uncovered: string[] = [];
    for (const group of COLLISION_CHECKS_BY_MIGRATION) {
      const sql = migrationSql(POSTGRES_MIGRATIONS, group.migration);
      for (const statement of parseForeignKeyStatements(sql)) {
        if (!statement.realigned && !declared.has(statement.constraint)) {
          uncovered.push(`${group.migration}:${statement.constraint}`);
        }
      }
    }
    expect(uncovered).toEqual([]);
    expect(declared.has(MUAWIN_FOREIGN_KEY)).toBe(true);
  });
});

describe("migration chain comparison", () => {
  it("reports a required migration missing from a chain", () => {
    expect(missingRequiredMigrations(["20260101000000_unrelated"])).toEqual([...REQUIRED_ATT01_MIGRATIONS]);
    expect(missingRequiredMigrations([...REQUIRED_ATT01_MIGRATIONS])).toEqual([]);
  });

  it("fails safely when an expected baseline input is absent or empty", () => {
    expect(() =>
      requireBaselineTexts(["prisma/postgres/schema.prisma"], () => {
        throw new Error("ENOENT");
      })
    ).toThrow(BaselineInputError);
    expect(() =>
      requireBaselineTexts(["prisma/postgres/schema.prisma"], () => {
        throw new Error("ENOENT");
      })
    ).toThrow(/missing or unreadable/);
    expect(() => requireBaselineTexts(["prisma/postgres/schema.prisma"], () => "   \n")).toThrow(/is empty/);
  });

  it("returns the baseline text when every input is present", () => {
    const texts = requireBaselineTexts([SQLITE_SCHEMA, POSTGRES_SCHEMA], read);
    expect(Object.keys(texts)).toHaveLength(2);
    expect(texts[POSTGRES_SCHEMA]).toContain("muawinAssistants");
  });
});
