import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ADMISSION_CONVERTED_PARTICIPANT_ORPHAN_SQL,
  BATCH_PARK_CITY_CONFLICTS_SQL,
  COLLISION_CHECKS,
  COLLISION_CHECKS_BY_MIGRATION,
  FOREIGN_KEY_CHECKS,
  GUARD_CHECKS,
  PARK_LESSON_MISSING_PARK_SQL,
  PARK_ROUTINE_SLOT_MISSING_PARK_SQL,
  PARTICIPANT_GROUP_ORPHAN_SQL,
  POST_DEPLOYMENT_TARGETS,
  PRE_DEPLOYMENT_PREREQUISITES,
  PROFILE_KEY_CHECKS,
  REQUIRED_EXISTING_CONSTRAINTS,
  STUDENT_PROFILE_DUPLICATE_ID_SQL,
  STUDENT_PROFILE_NULL_ID_SQL,
  runMigrationReadinessPreflight,
  type MigrationPreflightRunner,
} from "./production-preflight";

const PREREQUISITE_SQL = new Set(PRE_DEPLOYMENT_PREREQUISITES.map((artifact) => artifact.sql));
const COLLISION_SQL = new Set(COLLISION_CHECKS.map((check) => check.sql));
const PREREQUISITE_NAMES = new Set(PRE_DEPLOYMENT_PREREQUISITES.map((artifact) => artifact.name));
const COLLISION_NAMES = new Set(COLLISION_CHECKS.map((check) => check.name));
const COLLISION_TABLES = new Set(
  COLLISION_CHECKS.filter((check) => check.kind === "table").map((check) => check.name)
);
const ALL_CHECKS = [...GUARD_CHECKS, ...FOREIGN_KEY_CHECKS, ...PROFILE_KEY_CHECKS];

/** Models the clean pre-deployment baseline: prerequisites present, nothing created yet. */
const defaultResolver = (sql: string): unknown => (PREREQUISITE_SQL.has(sql) ? 1 : 0);

function syntheticRunner(
  resolveValue: (sql: string) => unknown = defaultResolver
): { runner: MigrationPreflightRunner; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    runner: {
      async query(sql: string) {
        calls.push(sql);
        return [{ count: resolveValue(sql) }];
      },
    },
  };
}

function artifactSql(
  artifacts: readonly { readonly name: string; readonly sql: string }[],
  name: string
): string {
  const artifact = artifacts.find((candidate) => candidate.name === name);
  if (!artifact) throw new Error(`Unknown synthetic artifact: ${name}`);
  return artifact.sql;
}

function collisionSql(name: string): string {
  return artifactSql(COLLISION_CHECKS, name);
}

function readMigration(name: string): string {
  return readFileSync(resolve(process.cwd(), `prisma/postgres/migrations/${name}/migration.sql`), "utf8");
}

function sequenceSql(): string {
  return COLLISION_CHECKS_BY_MIGRATION.map((group) => readMigration(group.migration)).join("\n");
}

/**
 * Unconditional objects declared by a migration file, as `kind:name` keys.
 *
 * A foreign key counts as unconditional only when the file adds it without a
 * preceding `DROP CONSTRAINT` of the same name: a drop-then-add pair is an
 * intentional constraint realignment whose pre-state is a prerequisite, not a
 * collision. This mirrors the collision model's contract rather than the
 * primary-key-only shortcut it previously used.
 */
function unconditionalObjects(sql: string): string[] {
  const found: string[] = [];
  for (const match of sql.matchAll(/CREATE TABLE "([^"]+)"/g)) found.push(`table:${match[1]}`);
  for (const match of sql.matchAll(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/g)) found.push(`index:${match[1]}`);
  for (const match of sql.matchAll(/CREATE FUNCTION "([^"]+)"/g)) found.push(`function:${match[1]}`);
  for (const match of sql.matchAll(/CREATE TRIGGER "([^"]+)"/g)) found.push(`trigger:${match[1]}`);
  for (const match of sql.matchAll(/ALTER TABLE "([^"]+)" ADD COLUMN "([^"]+)"/g))
    found.push(`column:${match[1]}.${match[2]}`);
  for (const match of sql.matchAll(/ALTER TABLE "[^"]+" ADD CONSTRAINT "([^"]+)" PRIMARY KEY/g))
    found.push(`constraint:${match[1]}`);
  for (const match of sql.matchAll(/ALTER TABLE "[^"]+"\s+ADD CONSTRAINT "([^"]+)"\s+FOREIGN KEY/g)) {
    const constraint = match[1];
    const realigned =
      sql.includes(`DROP CONSTRAINT "${constraint}"`) || sql.includes(`DROP CONSTRAINT IF EXISTS "${constraint}"`);
    if (!realigned) found.push(`constraint:${constraint}`);
  }
  return found.sort();
}

function quotedList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim().replace(/"/g, ""))
    .filter((entry) => entry.length > 0);
}

describe("production migration readiness preflight", () => {
  it("reports ready on a clean nine-migration baseline with every target absent", async () => {
    const { runner, calls } = syntheticRunner();

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.ready).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(COLLISION_CHECKS_BY_MIGRATION).toHaveLength(9);
    expect(report.prerequisites).toHaveLength(PRE_DEPLOYMENT_PREREQUISITES.length);
    expect(report.prerequisites.every((artifact) => artifact.present)).toBe(true);
    expect(report.guards.every((check) => check.checked && check.count === 0)).toBe(true);
    expect(report.profileKey.every((check) => check.checked && check.count === 0)).toBe(true);
    expect(report.collisions).toHaveLength(COLLISION_CHECKS.length);
    expect(report.collisions.every((artifact) => artifact.present === false)).toBe(true);
    expect(report.postDeploymentTargets.every((artifact) => artifact.present === false)).toBe(true);

    const expectedQueries =
      PRE_DEPLOYMENT_PREREQUISITES.length +
      COLLISION_CHECKS.length +
      GUARD_CHECKS.length +
      report.foreignKeys.filter((check) => check.checked).length +
      PROFILE_KEY_CHECKS.length +
      POST_DEPLOYMENT_TARGETS.length;
    expect(calls).toHaveLength(expectedQueries);
  });

  it("skips and never queries tables created earlier in the same sequence", async () => {
    const { runner, calls } = syntheticRunner();

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.ready).toBe(true);
    expect(
      report.foreignKeys.filter((check) => !check.checked).map((check) => check.name)
    ).toEqual(["park_lessons_parkId_fkey", "park_routine_slots_parkId_fkey"]);
    expect(report.blockers).not.toContain("missing pre-deployment prerequisite: park_lessons");
    expect(report.blockers).not.toContain("missing pre-deployment prerequisite: park_routine_slots");
    expect(calls).not.toContain(PARK_LESSON_MISSING_PARK_SQL);
    expect(calls).not.toContain(PARK_ROUTINE_SLOT_MISSING_PARK_SQL);
  });

  it("blocks a present sequence-created table as a partial state and then runs its check", async () => {
    const parkLessons = collisionSql("park_lessons");
    const parkSlots = collisionSql("park_routine_slots");
    const { runner, calls } = syntheticRunner((sql) => {
      if (sql === parkLessons || sql === parkSlots) return 1;
      if (sql === PARK_LESSON_MISSING_PARK_SQL) return 2;
      return defaultResolver(sql);
    });

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.ready).toBe(false);
    expect(report.blockers).toContain("target table already exists: park_lessons");
    expect(report.blockers).toContain("target table already exists: park_routine_slots");
    expect(report.blockers).toContain("2 park lessons reference a park that does not exist");
    expect(calls).toContain(PARK_LESSON_MISSING_PARK_SQL);
    expect(report.foreignKeys.find((check) => check.name === "park_lessons_parkId_fkey")).toEqual({
      name: "park_lessons_parkId_fkey",
      checked: true,
      count: 2,
    });
  });

  it("blocks a missing old constraint that 20260909050000 drops", async () => {
    for (const constraint of REQUIRED_EXISTING_CONSTRAINTS) {
      const { runner } = syntheticRunner((sql) =>
        sql === constraint.sql ? 0 : defaultResolver(sql)
      );

      const report = await runMigrationReadinessPreflight(runner);

      expect(report.ready).toBe(false);
      expect(report.blockers).toContain(
        `missing pre-deployment prerequisite: ${constraint.name}`
      );
    }
  });

  it("reports both old constraints present without blocking", async () => {
    const { runner } = syntheticRunner();

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.blockers).toEqual([]);
    for (const constraint of REQUIRED_EXISTING_CONSTRAINTS) {
      expect(report.prerequisites.find((artifact) => artifact.name === constraint.name)).toEqual({
        name: constraint.name,
        present: true,
      });
    }
  });

  it("blocks an existing student_extended_profiles_pkey and clears it when absent", async () => {
    const absentRunner = syntheticRunner();
    const absentReport = await runMigrationReadinessPreflight(absentRunner.runner);

    expect(absentReport.ready).toBe(true);
    expect(absentReport.blockers).not.toContain(
      "target constraint already exists: student_extended_profiles_pkey"
    );
    expect(
      absentReport.collisions.find((artifact) => artifact.name === "student_extended_profiles_pkey")
    ).toEqual({ name: "student_extended_profiles_pkey", present: false });
    expect(absentRunner.calls).toContain(collisionSql("student_extended_profiles_pkey"));

    const pkeySql = collisionSql("student_extended_profiles_pkey");
    const { runner } = syntheticRunner((sql) => (sql === pkeySql ? 1 : defaultResolver(sql)));
    const presentReport = await runMigrationReadinessPreflight(runner);

    expect(presentReport.ready).toBe(false);
    expect(presentReport.blockers).toEqual([
      "target constraint already exists: student_extended_profiles_pkey",
    ]);
  });

  it("probes prerequisites and collisions before dependent checks", async () => {
    const groupsSql = artifactSql(PRE_DEPLOYMENT_PREREQUISITES, "groups");
    const parkLessons = collisionSql("park_lessons");
    const { runner, calls } = syntheticRunner((sql) =>
      sql === groupsSql ? 0 : sql === parkLessons ? 1 : defaultResolver(sql)
    );

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.ready).toBe(false);
    expect(report.blockers).toContain("missing pre-deployment prerequisite: groups");
    expect(report.blockers).toContain("target table already exists: park_lessons");
    expect(calls).not.toContain(PARTICIPANT_GROUP_ORPHAN_SQL);
    expect(calls).toContain(PARK_LESSON_MISSING_PARK_SQL);
    expect(calls.indexOf(groupsSql)).toBeLessThan(calls.indexOf(BATCH_PARK_CITY_CONFLICTS_SQL));
    expect(calls.indexOf(parkLessons)).toBeLessThan(calls.indexOf(PARK_LESSON_MISSING_PARK_SQL));
  });

  it("skips the batch and park dependent guards when their source is absent", async () => {
    const batchesSql = artifactSql(PRE_DEPLOYMENT_PREREQUISITES, "batches");
    const { runner, calls } = syntheticRunner((sql) => (sql === batchesSql ? 0 : defaultResolver(sql)));

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.guards.filter((check) => check.checked).map((check) => check.name)).toEqual([]);
    expect(report.blockers).toContain("missing pre-deployment prerequisite: batches");
    expect(calls).not.toContain(BATCH_PARK_CITY_CONFLICTS_SQL);
  });

  it("skips the profile-key checks when their table is absent", async () => {
    const profileSql = artifactSql(PRE_DEPLOYMENT_PREREQUISITES, "student_extended_profiles");
    const { runner, calls } = syntheticRunner((sql) => (sql === profileSql ? 0 : defaultResolver(sql)));

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.profileKey.every((check) => check.checked === false)).toBe(true);
    expect(report.blockers).toContain(
      "missing pre-deployment prerequisite: student_extended_profiles"
    );
    expect(calls).not.toContain(STUDENT_PROFILE_NULL_ID_SQL);
    expect(calls).not.toContain(STUDENT_PROFILE_DUPLICATE_ID_SQL);
  });

  it("blocks each collision class with its own wording", async () => {
    const cases: readonly (readonly [string, string])[] = [
      ["team_document_links", "target table already exists: team_document_links"],
      [
        "student_evaluations_participantId_month_year_key",
        "target index already exists: student_evaluations_participantId_month_year_key",
      ],
      [
        "shabab_normalize_batch_city",
        "target function already exists: shabab_normalize_batch_city",
      ],
      ["batches_normalize_city", "target trigger already exists: batches_normalize_city"],
      [
        "attendance_events.resetVersion",
        "target column already exists: attendance_events.resetVersion",
      ],
      [
        "student_extended_profiles_pkey",
        "target constraint already exists: student_extended_profiles_pkey",
      ],
    ];

    for (const [name, message] of cases) {
      const sql = collisionSql(name);
      const { runner } = syntheticRunner((candidate) =>
        candidate === sql ? 1 : defaultResolver(candidate)
      );

      const report = await runMigrationReadinessPreflight(runner);

      expect(report.ready).toBe(false);
      expect(report.blockers).toContain(message);
    }
  });

  it("blocks every unconditional object when the whole sequence already exists", async () => {
    const { runner } = syntheticRunner((sql) => (COLLISION_SQL.has(sql) ? 1 : defaultResolver(sql)));

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.ready).toBe(false);
    expect(report.collisions.filter((artifact) => artifact.present)).toHaveLength(
      COLLISION_CHECKS.length
    );
    expect(report.blockers).toHaveLength(COLLISION_CHECKS.length);
    expect(report.blockers).toContain("target table already exists: external_link_policies");
    expect(report.blockers).toContain("target index already exists: knowledge_articles_slug_key");
  });

  it("blocks a missing prerequisite for every guarded source independently", async () => {
    const missing = PRE_DEPLOYMENT_PREREQUISITES.filter((artifact) =>
      ALL_CHECKS.some((check) => check.requires.includes(artifact.name))
    );
    const { runner } = syntheticRunner((sql) =>
      missing.some((artifact) => artifact.sql === sql) ? 0 : defaultResolver(sql)
    );

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.ready).toBe(false);
    for (const artifact of missing) {
      expect(report.blockers).toContain(`missing pre-deployment prerequisite: ${artifact.name}`);
    }
    expect(report.guards.every((check) => check.checked === false)).toBe(true);
  });

  it("blocks the guard counts with aggregate-only wording", async () => {
    const { runner } = syntheticRunner((sql) => {
      if (sql === BATCH_PARK_CITY_CONFLICTS_SQL) return 4;
      return defaultResolver(sql);
    });

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.ready).toBe(false);
    expect(report.blockers).toEqual(["4 batches conflict with their park cities"]);
  });

  it("uses singular wording when a single count blocks", async () => {
    const { runner } = syntheticRunner((sql) => {
      if (sql === BATCH_PARK_CITY_CONFLICTS_SQL) return 1;
      if (sql === PROFILE_KEY_CHECKS[0].sql) return 1;
      if (sql === PROFILE_KEY_CHECKS[1].sql) return 1;
      return defaultResolver(sql);
    });

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.blockers).toContain("1 batch conflicts with its park city");
    expect(report.blockers).toContain("1 student_extended_profiles row has a null id");
    expect(report.blockers).toContain(
      "1 duplicated student_extended_profiles id would reject the primary-key addition"
    );
  });

  it("blocks every foreign-key precondition with a distinct blocker", async () => {
    const { runner } = syntheticRunner((sql) => {
      if (sql === collisionSql("park_lessons") || sql === collisionSql("park_routine_slots")) return 1;
      if (sql === PARTICIPANT_GROUP_ORPHAN_SQL) return 1;
      if (sql === ADMISSION_CONVERTED_PARTICIPANT_ORPHAN_SQL) return 2;
      if (sql === PARK_LESSON_MISSING_PARK_SQL) return 3;
      if (sql === PARK_ROUTINE_SLOT_MISSING_PARK_SQL) return 4;
      return defaultResolver(sql);
    });

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.ready).toBe(false);
    expect(report.blockers).toContain("1 participant has a group id that has no matching group");
    expect(report.blockers).toContain(
      "2 admission applications reference a converted participant that does not exist"
    );
    expect(report.blockers).toContain("3 park lessons reference a park that does not exist");
    expect(report.blockers).toContain("4 park routine slots reference a park that does not exist");
    expect(report.foreignKeys.every((check) => check.checked)).toBe(true);
  });

  it("accepts bigint and numeric-string counts from the driver", async () => {
    const { runner } = syntheticRunner((sql) => {
      if (sql === BATCH_PARK_CITY_CONFLICTS_SQL) return BigInt(12);
      return defaultResolver(sql);
    });

    const report = await runMigrationReadinessPreflight(runner);

    expect(report.guards.find((check) => check.name === "batchParkCityConflicts")?.count).toBe(12);
  });

  it("fails closed when the count alias is absent from the row", async () => {
    const unaliasedRunner: MigrationPreflightRunner = {
      async query() {
        return [{ rows: 12 }];
      },
    };

    await expect(runMigrationReadinessPreflight(unaliasedRunner)).rejects.toThrow(
      'returned no usable "count" field'
    );
  });

  it("fails closed when a query returns no count row", async () => {
    const emptyRunner: MigrationPreflightRunner = {
      async query() {
        return [];
      },
    };

    await expect(runMigrationReadinessPreflight(emptyRunner)).rejects.toThrow(
      'returned no usable "count" field'
    );
  });

  it("fails closed when the count alias holds a non-count value", async () => {
    const brokenRunner: MigrationPreflightRunner = {
      async query() {
        return [{ count: { unexpected: true } }];
      },
    };

    await expect(runMigrationReadinessPreflight(brokenRunner)).rejects.toThrow(
      "returned a non-count value"
    );
  });

  it("issues only explicit, parameter-free, read-only queries with a count alias", async () => {
    const { runner, calls } = syntheticRunner();

    const report = await runMigrationReadinessPreflight(runner);

    expect(calls).toHaveLength(
      PRE_DEPLOYMENT_PREREQUISITES.length +
        COLLISION_CHECKS.length +
        GUARD_CHECKS.length +
        report.foreignKeys.filter((check) => check.checked).length +
        PROFILE_KEY_CHECKS.length +
        POST_DEPLOYMENT_TARGETS.length
    );
    for (const sql of calls) {
      expect(sql.startsWith("SELECT ")).toBe(true);
      expect(sql).toContain('AS "count"');
      expect(sql).not.toContain(";");
      expect(sql).not.toContain("$1");
      expect(sql).not.toContain("?");
      expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT)\b/i);
    }
  });

  it("returns only aggregate counts and presence flags, never row values", async () => {
    const { runner } = syntheticRunner((sql) =>
      sql === BATCH_PARK_CITY_CONFLICTS_SQL ? 12 : defaultResolver(sql)
    );

    const report = await runMigrationReadinessPreflight(runner);
    const serialized = JSON.stringify(report);

    expect(Object.keys(report).sort()).toEqual([
      "blockers",
      "collisions",
      "foreignKeys",
      "guards",
      "postDeploymentTargets",
      "prerequisites",
      "profileKey",
      "ready",
    ]);
    expect(serialized).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+/);
    expect(serialized).not.toMatch(/\+?\d{7,}/);
  });

  it("covers every unconditional object in every migration, in sequence order", () => {
    expect(COLLISION_CHECKS_BY_MIGRATION.map((group) => group.migration)).toEqual([
      "20260827090000_add_team_document_links",
      "20260907114612_add_evaluations_lessons_planner",
      "20260909020000_operation_receipts",
      "20260909030000_restore_modeled_tables",
      "20260909040000_active_city_batch",
      "20260909050000_align_modeled_constraints",
      "20260909060000_align_modeled_indexes",
      "20260909070000_attendance_reset_version",
      "20260916080000_add_muawin_assistance",
    ]);

    for (const group of COLLISION_CHECKS_BY_MIGRATION) {
      const declared = group.checks.map((check) => `${check.kind}:${check.name}`).sort();
      expect(declared).toEqual(unconditionalObjects(readMigration(group.migration)));
    }
    expect(new Set(COLLISION_CHECKS.map((check) => `${check.kind}:${check.name}`)).size).toBe(
      COLLISION_CHECKS.length
    );
  });

  it("treats every table referenced by the sequence as a prerequisite or a collision target", () => {
    const sql = sequenceSql();
    const referenced = new Set<string>();
    for (const pattern of [
      /ALTER TABLE "([^"]+)"/g,
      /UPDATE "([^"]+)"/g,
      /FROM "([^"]+)"/g,
      /REFERENCES "([^"]+)"/g,
      /CREATE (?:UNIQUE )?INDEX "[^"]+" ON "([^"]+)"/g,
    ]) {
      for (const match of sql.matchAll(pattern)) referenced.add(match[1]);
    }

    const unlisted = [...referenced].filter(
      (table) => !COLLISION_TABLES.has(table) && !PREREQUISITE_NAMES.has(table)
    );
    expect(unlisted).toEqual([]);
  });

  it("treats every column used by index, alteration and constraint operations as a prerequisite", () => {
    const sql = sequenceSql();
    const unlisted: string[] = [];

    const checkColumn = (table: string, columns: string) => {
      if (COLLISION_TABLES.has(table)) return;
      for (const column of quotedList(columns)) {
        if (!PREREQUISITE_NAMES.has(`${table}.${column}`)) unlisted.push(`${table}.${column}`);
      }
    };

    for (const match of sql.matchAll(/CREATE (?:UNIQUE )?INDEX "[^"]+" ON "([^"]+)"\(([^)]+)\)/g)) {
      checkColumn(match[1], match[2]);
    }
    for (const match of sql.matchAll(/ALTER TABLE "([^"]+)" ALTER COLUMN "([^"]+)"/g)) {
      checkColumn(match[1], `"${match[2]}"`);
    }
    for (const match of sql.matchAll(
      /ALTER TABLE "([^"]+)" ADD CONSTRAINT "[^"]+" PRIMARY KEY \(([^)]+)\)/g
    )) {
      checkColumn(match[1], match[2]);
    }
    for (const match of sql.matchAll(
      /ALTER TABLE "([^"]+)" ADD CONSTRAINT "[^"]+" FOREIGN KEY \(([^)]+)\)/g
    )) {
      checkColumn(match[1], match[2]);
    }

    expect(unlisted).toEqual([]);
  });

  it("declares every required artifact, keeps the categories disjoint, and mirrors the guards", () => {
    for (const definition of ALL_CHECKS) {
      for (const name of definition.requires) {
        expect(PREREQUISITE_NAMES.has(name) || COLLISION_NAMES.has(name)).toBe(true);
      }
    }
    expect([...PREREQUISITE_NAMES].filter((name) => COLLISION_NAMES.has(name))).toEqual([]);

    const constraints = readMigration("20260909050000_align_modeled_constraints");
    for (const check of FOREIGN_KEY_CHECKS) {
      expect(constraints).toContain(`ADD CONSTRAINT "${check.name}" FOREIGN KEY`);
    }
    for (const constraint of REQUIRED_EXISTING_CONSTRAINTS) {
      expect(constraints).toContain(`DROP CONSTRAINT "${constraint.name}"`);
    }

    const conflicts = readMigration("20260909040000_active_city_batch");
    expect(conflicts).toContain(
      'WHERE p."cityId" IS NULL OR (b."cityId" IS NOT NULL AND b."cityId" <> p."cityId")'
    );
    expect(BATCH_PARK_CITY_CONFLICTS_SQL).toContain(
      'WHERE p."cityId" IS NULL OR (b."cityId" IS NOT NULL AND b."cityId" <> p."cityId")'
    );
    // U01 revised this migration: a participant may stay unassigned, so the group
    // key must remain nullable and clear on group deletion.
    expect(constraints).not.toContain('ALTER COLUMN "groupId" SET NOT NULL');
    expect(constraints).toContain(
      'ADD CONSTRAINT "participants_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL'
    );
    expect(PARTICIPANT_GROUP_ORPHAN_SQL).toContain('FROM "participants" p');
    expect(ADMISSION_CONVERTED_PARTICIPANT_ORPHAN_SQL).toContain('FROM "admission_applications" a');
    expect(PARK_LESSON_MISSING_PARK_SQL).toContain('FROM "park_lessons" l');
    expect(PARK_ROUTINE_SLOT_MISSING_PARK_SQL).toContain('FROM "park_routine_slots" s');

    const profiles = readMigration("20260909030000_restore_modeled_tables");
    expect(profiles).toContain('ADD CONSTRAINT "student_extended_profiles_pkey" PRIMARY KEY ("id")');
    expect(STUDENT_PROFILE_NULL_ID_SQL).toContain('FROM "student_extended_profiles" WHERE "id" IS NULL');
    expect(STUDENT_PROFILE_DUPLICATE_ID_SQL).toContain(
      'SELECT "id" FROM "student_extended_profiles" GROUP BY "id" HAVING COUNT(*) > 1'
    );

    expect(readMigration("20260909060000_align_modeled_indexes")).toContain(
      'ON "event_registrations"("participantId")'
    );
    expect(readMigration("20260909070000_attendance_reset_version")).toContain(
      'ADD COLUMN "resetVersion"'
    );
  });
});
