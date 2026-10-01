/**
 * Read-only production migration readiness preflight for M01.
 *
 * The caller supplies the query interface and owns the connection, credentials
 * and authorisation. This module opens no connection, reads no environment file
 * and performs no write. It issues only explicit, parameter-free SELECT
 * statements with an explicit `AS "count"` alias, and returns aggregate counts,
 * schema-presence flags and a readiness verdict, never row values, names or
 * personal data.
 *
 * The preflight models the nine remaining staged PostgreSQL migrations in
 * order, after the applied login-throttle migration:
 *
 *   1. 20260827090000_add_team_document_links
 *   2. 20260907114612_add_evaluations_lessons_planner
 *   3. 20260909020000_operation_receipts
 *   4. 20260909030000_restore_modeled_tables
 *   5. 20260909040000_active_city_batch
 *   6. 20260909050000_align_modeled_constraints
 *   7. 20260909060000_align_modeled_indexes
 *   8. 20260909070000_attendance_reset_version
 *   9. 20260916080000_add_muawin_assistance
 *
 * Readiness is a pre-deployment verdict. Pre-first-migration prerequisites are
 * probed first; a missing prerequisite produces a named blocker. Objects the
 * pending sequence creates unconditionally are collision checks: a clean
 * baseline has them all absent, and any present one blocks as a partial state.
 * A check whose source is created earlier in the same sequence is skipped
 * pre-deployment instead of failing, so absence never blocks readiness.
 */

/** Minimal query surface the preflight needs from a caller-supplied client. */
export interface MigrationPreflightRunner {
  query(sql: string): Promise<readonly unknown[]>;
}

/** One aggregate readiness check and whether its source artifacts were present. */
export interface AggregateCheck {
  readonly name: string;
  readonly checked: boolean;
  readonly count: number;
}

export interface SchemaArtifactStatus {
  readonly name: string;
  readonly present: boolean;
}

/** An object a pending migration creates unconditionally; present collides. */
export interface CollisionCheck {
  readonly name: string;
  readonly kind: "table" | "index" | "function" | "trigger" | "column" | "constraint";
  readonly sql: string;
}

/** The unconditional objects contributed by one pending migration. */
export interface CollisionGroup {
  readonly migration: string;
  readonly checks: readonly CollisionCheck[];
}

export interface MigrationReadinessReport {
  ready: boolean;
  guards: AggregateCheck[];
  foreignKeys: AggregateCheck[];
  profileKey: AggregateCheck[];
  prerequisites: SchemaArtifactStatus[];
  postDeploymentTargets: SchemaArtifactStatus[];
  collisions: SchemaArtifactStatus[];
  blockers: string[];
}

interface SchemaArtifact {
  readonly name: string;
  readonly sql: string;
}

interface ConditionalCheckDefinition {
  readonly name: string;
  /** Artifact names that must be present before the query is issued. */
  readonly requires: readonly string[];
  readonly singular: string;
  readonly plural: string;
  readonly sql: string;
}

const COUNT_FIELD = "count";

/**
 * Presence probes are built only from the compile-time identifiers declared in
 * this file, never from caller input, so every statement stays a parameter-free
 * SELECT with an explicit `AS "count"` alias.
 */
function tableArtifact(tableName: string): SchemaArtifact {
  return {
    name: tableName,
    sql: `SELECT COUNT(*) AS "count" FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = '${tableName}'`,
  };
}

function columnArtifact(tableName: string, columnName: string): SchemaArtifact {
  return {
    name: `${tableName}.${columnName}`,
    sql: `SELECT COUNT(*) AS "count" FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = '${tableName}' AND column_name = '${columnName}'`,
  };
}

function indexArtifact(indexName: string): SchemaArtifact {
  return {
    name: indexName,
    sql: `SELECT COUNT(*) AS "count" FROM pg_indexes WHERE schemaname = current_schema() AND indexname = '${indexName}'`,
  };
}

function functionArtifact(functionName: string): SchemaArtifact {
  return {
    name: functionName,
    sql: `SELECT COUNT(*) AS "count" FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = current_schema() AND p.proname = '${functionName}'`,
  };
}

function triggerArtifact(triggerName: string): SchemaArtifact {
  return {
    name: triggerName,
    sql: `SELECT COUNT(*) AS "count" FROM information_schema.triggers WHERE trigger_schema = current_schema() AND trigger_name = '${triggerName}'`,
  };
}

function constraintArtifact(constraintName: string): SchemaArtifact {
  return {
    name: constraintName,
    sql: `SELECT COUNT(*) AS "count" FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = current_schema() AND c.conname = '${constraintName}'`,
  };
}

/**
 * Constraints 20260909050000 drops before re-adding. If either is already gone
 * the migration aborts, so absence is a pre-deployment blocker.
 */
export const REQUIRED_EXISTING_CONSTRAINTS: readonly SchemaArtifact[] = [
  constraintArtifact("participants_groupId_fkey"),
  constraintArtifact("admission_applications_convertedParticipantId_fkey"),
];

/**
 * Schema that must already exist before the first of the eight remaining
 * migrations runs. Artifacts created earlier in the sequence are collision
 * checks instead, because a clean baseline has them absent.
 */
export const PRE_DEPLOYMENT_PREREQUISITES: readonly SchemaArtifact[] = [
  tableArtifact("attendance_events"),
  tableArtifact("admission_applications"),
  columnArtifact("admission_applications", "convertedParticipantId"),
  tableArtifact("batch_settings"),
  columnArtifact("batch_settings", "automaticDropoutEnabled"),
  tableArtifact("batches"),
  columnArtifact("batches", "cityId"),
  columnArtifact("batches", "parkId"),
  columnArtifact("batches", "isActive"),
  tableArtifact("cities"),
  tableArtifact("collaboration_teams"),
  tableArtifact("event_registrations"),
  columnArtifact("event_registrations", "feeStatus"),
  columnArtifact("event_registrations", "participantId"),
  tableArtifact("groups"),
  tableArtifact("park_staff_attendance_records"),
  columnArtifact("park_staff_attendance_records", "markedAt"),
  tableArtifact("parks"),
  columnArtifact("parks", "cityId"),
  tableArtifact("participants"),
  columnArtifact("participants", "groupId"),
  tableArtifact("staff_meta"),
  tableArtifact("student_extended_profiles"),
  columnArtifact("student_extended_profiles", "id"),
  ...REQUIRED_EXISTING_CONSTRAINTS,
];

/**
 * Tables created by the pending sequence that the running application already
 * reads. Absence is a post-deployment verification signal only and never blocks
 * a pre-deployment readiness verdict.
 */
export const POST_DEPLOYMENT_TARGETS: readonly SchemaArtifact[] = [
  tableArtifact("login_attempt_windows"),
  tableArtifact("operation_receipts"),
];

/** Guards 20260909040000_active_city_batch: a batch city must match its park city. */
export const BATCH_PARK_CITY_CONFLICTS_SQL =
  'SELECT COUNT(*) AS "count" FROM "batches" b LEFT JOIN "parks" p ON p."id" = b."parkId" WHERE p."cityId" IS NULL OR (b."cityId" IS NOT NULL AND b."cityId" <> p."cityId")';

/** Guards the 20260909040000 batches_one_active_city partial unique index. */
export const CITIES_WITH_MULTIPLE_ACTIVE_BATCHES_SQL =
  'SELECT COUNT(*) AS "count" FROM (SELECT "cityId" FROM "batches" WHERE "isActive" = true GROUP BY "cityId" HAVING COUNT(*) > 1) AS "duplicated_city_batches"';

/** Guards the 20260909030000 student_extended_profiles primary-key addition. */
export const STUDENT_PROFILE_NULL_ID_SQL =
  'SELECT COUNT(*) AS "count" FROM "student_extended_profiles" WHERE "id" IS NULL';

/** Counts duplicated profile ids that would reject the primary-key addition. */
export const STUDENT_PROFILE_DUPLICATE_ID_SQL =
  'SELECT COUNT(*) AS "count" FROM (SELECT "id" FROM "student_extended_profiles" GROUP BY "id" HAVING COUNT(*) > 1) AS "duplicated_profile_ids"';

/** Guards the 20260909050000 participants_groupId_fkey addition. */
export const PARTICIPANT_GROUP_ORPHAN_SQL =
  'SELECT COUNT(*) AS "count" FROM "participants" p WHERE p."groupId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "groups" g WHERE g."id" = p."groupId")';

/** Guards the 20260909050000 admission_applications_convertedParticipantId_fkey addition. */
export const ADMISSION_CONVERTED_PARTICIPANT_ORPHAN_SQL =
  'SELECT COUNT(*) AS "count" FROM "admission_applications" a WHERE a."convertedParticipantId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "participants" p WHERE p."id" = a."convertedParticipantId")';

/** Guards the 20260909050000 park_lessons_parkId_fkey addition. */
export const PARK_LESSON_MISSING_PARK_SQL =
  'SELECT COUNT(*) AS "count" FROM "park_lessons" l WHERE NOT EXISTS (SELECT 1 FROM "parks" p WHERE p."id" = l."parkId")';

/** Guards the 20260909050000 park_routine_slots_parkId_fkey addition. */
export const PARK_ROUTINE_SLOT_MISSING_PARK_SQL =
  'SELECT COUNT(*) AS "count" FROM "park_routine_slots" s WHERE NOT EXISTS (SELECT 1 FROM "parks" p WHERE p."id" = s."parkId")';

export const GUARD_CHECKS: readonly ConditionalCheckDefinition[] = [
  {
    name: "batchParkCityConflicts",
    requires: ["batches", "batches.cityId", "batches.parkId", "parks", "parks.cityId"],
    singular: "batch conflicts with its park city",
    plural: "batches conflict with their park cities",
    sql: BATCH_PARK_CITY_CONFLICTS_SQL,
  },
  {
    name: "citiesWithMultipleActiveBatches",
    requires: ["batches", "batches.cityId", "batches.isActive"],
    singular: "city has more than one active batch",
    plural: "cities have more than one active batch",
    sql: CITIES_WITH_MULTIPLE_ACTIVE_BATCHES_SQL,
  },
];

/**
 * Foreign-key additions in 20260909050000 and the schema they read. The two
 * park tables are created by 20260907114612 earlier in the same sequence, so
 * their checks are skipped until that table exists.
 */
export const FOREIGN_KEY_CHECKS: readonly ConditionalCheckDefinition[] = [
  {
    name: "participants_groupId_fkey",
    requires: ["participants", "participants.groupId", "groups"],
    singular: "participant has a group id that has no matching group",
    plural: "participants have a group id that has no matching group",
    sql: PARTICIPANT_GROUP_ORPHAN_SQL,
  },
  {
    name: "admission_applications_convertedParticipantId_fkey",
    requires: [
      "admission_applications",
      "admission_applications.convertedParticipantId",
      "participants",
    ],
    singular: "admission application references a converted participant that does not exist",
    plural: "admission applications reference a converted participant that does not exist",
    sql: ADMISSION_CONVERTED_PARTICIPANT_ORPHAN_SQL,
  },
  {
    name: "park_lessons_parkId_fkey",
    requires: ["park_lessons", "parks"],
    singular: "park lesson references a park that does not exist",
    plural: "park lessons reference a park that does not exist",
    sql: PARK_LESSON_MISSING_PARK_SQL,
  },
  {
    name: "park_routine_slots_parkId_fkey",
    requires: ["park_routine_slots", "parks"],
    singular: "park routine slot references a park that does not exist",
    plural: "park routine slots reference a park that does not exist",
    sql: PARK_ROUTINE_SLOT_MISSING_PARK_SQL,
  },
];

export const PROFILE_KEY_CHECKS: readonly ConditionalCheckDefinition[] = [
  {
    name: "student_extended_profiles.nullIds",
    requires: ["student_extended_profiles", "student_extended_profiles.id"],
    singular: "student_extended_profiles row has a null id",
    plural: "student_extended_profiles rows have a null id",
    sql: STUDENT_PROFILE_NULL_ID_SQL,
  },
  {
    name: "student_extended_profiles.duplicatedIds",
    requires: ["student_extended_profiles", "student_extended_profiles.id"],
    singular: "duplicated student_extended_profiles id would reject the primary-key addition",
    plural: "duplicated student_extended_profiles ids would reject the primary-key addition",
    sql: STUDENT_PROFILE_DUPLICATE_ID_SQL,
  },
];

function tableCollision(tableName: string): CollisionCheck {
  return { name: tableName, kind: "table", sql: tableArtifact(tableName).sql };
}

function indexCollision(indexName: string): CollisionCheck {
  return { name: indexName, kind: "index", sql: indexArtifact(indexName).sql };
}

function functionCollision(functionName: string): CollisionCheck {
  return { name: functionName, kind: "function", sql: functionArtifact(functionName).sql };
}

function triggerCollision(triggerName: string): CollisionCheck {
  return { name: triggerName, kind: "trigger", sql: triggerArtifact(triggerName).sql };
}

function columnCollision(tableName: string, columnName: string): CollisionCheck {
  const artifact = columnArtifact(tableName, columnName);
  return { name: artifact.name, kind: "column", sql: artifact.sql };
}

function constraintCollision(constraintName: string): CollisionCheck {
  return { name: constraintName, kind: "constraint", sql: constraintArtifact(constraintName).sql };
}

/**
 * Every unconditional object created by the remaining sequence, grouped by the
 * migration that creates it and listed in migration order. Derived from the
 * migration SQL and verified by the migration-parity tests.
 */
export const COLLISION_CHECKS_BY_MIGRATION: readonly CollisionGroup[] = [
  {
    migration: "20260827090000_add_team_document_links",
    checks: [
      tableCollision("team_document_links"),
      indexCollision("team_document_links_teamId_createdAt_idx"),
      indexCollision("team_document_links_createdByStaffMetaId_idx"),
      tableCollision("external_link_policies"),
    ],
  },
  {
    migration: "20260907114612_add_evaluations_lessons_planner",
    checks: [
      tableCollision("student_evaluations"),
      indexCollision("student_evaluations_participantId_month_year_key"),
      indexCollision("student_evaluations_parkId_month_year_idx"),
      tableCollision("park_lessons"),
      indexCollision("park_lessons_parkId_lessonDate_idx"),
      tableCollision("park_routine_slots"),
      indexCollision("park_routine_slots_parkId_idx"),
    ],
  },
  {
    migration: "20260909020000_operation_receipts",
    checks: [tableCollision("operation_receipts")],
  },
  {
    migration: "20260909030000_restore_modeled_tables",
    checks: [
      tableCollision("fee_donations"),
      tableCollision("financial_adjustments"),
      tableCollision("procurement_items"),
      tableCollision("park_stocks"),
      tableCollision("stock_requests"),
      tableCollision("purchase_orders"),
      tableCollision("stock_transfers"),
      tableCollision("stock_audit_logs"),
      tableCollision("team_chat_messages"),
      tableCollision("point_transactions"),
      tableCollision("badges"),
      tableCollision("student_badges"),
      tableCollision("digital_resources"),
      tableCollision("knowledge_articles"),
      indexCollision("fee_donations_receiptNo_key"),
      indexCollision("fee_donations_cityId_createdAt_idx"),
      indexCollision("fee_donations_parkId_createdAt_idx"),
      indexCollision("financial_adjustments_cityId_createdAt_idx"),
      indexCollision("financial_adjustments_parkId_createdAt_idx"),
      indexCollision("procurement_items_sku_key"),
      indexCollision("park_stocks_parkId_idx"),
      indexCollision("park_stocks_itemId_idx"),
      indexCollision("park_stocks_parkId_itemId_key"),
      indexCollision("stock_requests_parkId_status_idx"),
      indexCollision("stock_requests_itemId_idx"),
      indexCollision("purchase_orders_poNumber_key"),
      indexCollision("purchase_orders_cityId_createdAt_idx"),
      indexCollision("purchase_orders_parkId_createdAt_idx"),
      indexCollision("stock_transfers_fromParkId_createdAt_idx"),
      indexCollision("stock_transfers_toParkId_createdAt_idx"),
      indexCollision("stock_audit_logs_parkId_createdAt_idx"),
      indexCollision("team_chat_messages_teamId_createdAt_idx"),
      indexCollision("team_chat_messages_authorId_idx"),
      indexCollision("point_transactions_studentId_createdAt_idx"),
      indexCollision("point_transactions_category_idx"),
      indexCollision("badges_code_key"),
      indexCollision("student_badges_studentId_idx"),
      indexCollision("student_badges_badgeId_idx"),
      indexCollision("student_badges_studentId_badgeId_key"),
      indexCollision("digital_resources_category_idx"),
      indexCollision("digital_resources_targetCityId_idx"),
      indexCollision("knowledge_articles_slug_key"),
      indexCollision("knowledge_articles_category_isPublished_idx"),
      constraintCollision("student_extended_profiles_pkey"),
      // Unguarded foreign keys this migration adds to tables it creates; a
      // pre-existing constraint of the same name blocks the migration.
      constraintCollision("fee_donations_cityId_fkey"),
      constraintCollision("fee_donations_parkId_fkey"),
      constraintCollision("financial_adjustments_cityId_fkey"),
      constraintCollision("financial_adjustments_parkId_fkey"),
      constraintCollision("park_stocks_parkId_fkey"),
      constraintCollision("park_stocks_itemId_fkey"),
      constraintCollision("stock_requests_parkId_fkey"),
      constraintCollision("stock_requests_itemId_fkey"),
      constraintCollision("purchase_orders_cityId_fkey"),
      constraintCollision("purchase_orders_parkId_fkey"),
      constraintCollision("purchase_orders_itemId_fkey"),
      constraintCollision("stock_transfers_fromParkId_fkey"),
      constraintCollision("stock_transfers_toParkId_fkey"),
      constraintCollision("stock_transfers_itemId_fkey"),
      constraintCollision("stock_audit_logs_parkId_fkey"),
      constraintCollision("stock_audit_logs_itemId_fkey"),
      constraintCollision("team_chat_messages_teamId_fkey"),
      constraintCollision("team_chat_messages_authorId_fkey"),
      constraintCollision("point_transactions_studentId_fkey"),
      constraintCollision("student_badges_studentId_fkey"),
      constraintCollision("student_badges_badgeId_fkey"),
      constraintCollision("digital_resources_targetCityId_fkey"),
    ],
  },
  {
    migration: "20260909040000_active_city_batch",
    checks: [
      indexCollision("batches_one_active_city"),
      functionCollision("shabab_normalize_batch_city"),
      functionCollision("shabab_preserve_batch_city"),
      triggerCollision("batches_normalize_city"),
      triggerCollision("parks_preserve_batch_city"),
    ],
  },
  {
    migration: "20260909050000_align_modeled_constraints",
    checks: [
      columnCollision("event_registrations", "feeAmount"),
      columnCollision("event_registrations", "hasConsent"),
      columnCollision("event_registrations", "hasMedical"),
      columnCollision("event_registrations", "checkedInAt"),
      // Added without a preceding DROP to tables created earlier in the
      // sequence, so a pre-existing constraint blocks this migration.
      constraintCollision("park_lessons_parkId_fkey"),
      constraintCollision("park_routine_slots_parkId_fkey"),
    ],
  },
  {
    migration: "20260909060000_align_modeled_indexes",
    checks: [
      indexCollision("event_registrations_participantId_idx"),
      indexCollision("park_staff_attendance_records_markedAt_idx"),
    ],
  },
  {
    migration: "20260909070000_attendance_reset_version",
    checks: [columnCollision("attendance_events", "resetVersion")],
  },
  {
    // The column and index this migration adds are guarded with IF NOT EXISTS,
    // so they are not collision targets. Its one unguarded statement is the
    // self-referential Muawin assistance foreign key, which is modelled here so
    // a pre-existing constraint of the same name blocks the migration instead of
    // silently reaching it. This is the ATT01 requirement that the Muawin
    // assistance foreign key be covered explicitly.
    migration: "20260916080000_add_muawin_assistance",
    checks: [constraintCollision("staff_meta_assistsMurabbiId_fkey")],
  },
];

export const COLLISION_CHECKS: readonly CollisionCheck[] = COLLISION_CHECKS_BY_MIGRATION.flatMap(
  (group) => group.checks
);

export async function runMigrationReadinessPreflight(
  runner: MigrationPreflightRunner
): Promise<MigrationReadinessReport> {
  const prerequisites = await collectArtifactStatus(runner, PRE_DEPLOYMENT_PREREQUISITES);
  const present = new Map(prerequisites.map((artifact) => [artifact.name, artifact.present]));

  const collisions: SchemaArtifactStatus[] = [];
  const collidingChecks: CollisionCheck[] = [];
  for (const check of COLLISION_CHECKS) {
    const isPresent = (await readCount(runner, check.sql)) > 0;
    collisions.push({ name: check.name, present: isPresent });
    // An object created earlier in the sequence satisfies later dependencies.
    present.set(check.name, isPresent);
    if (isPresent) {
      collidingChecks.push(check);
    }
  }

  const guards = await collectConditionalChecks(runner, GUARD_CHECKS, present);
  const foreignKeys = await collectConditionalChecks(runner, FOREIGN_KEY_CHECKS, present);
  const profileKey = await collectConditionalChecks(runner, PROFILE_KEY_CHECKS, present);

  const postDeploymentTargets = await collectArtifactStatus(runner, POST_DEPLOYMENT_TARGETS);

  const blockers = collectBlockers({
    guards,
    foreignKeys,
    profileKey,
    prerequisites,
    collisions: collidingChecks,
  });

  return {
    ready: blockers.length === 0,
    guards,
    foreignKeys,
    profileKey,
    prerequisites,
    postDeploymentTargets,
    collisions,
    blockers,
  };
}

async function collectConditionalChecks(
  runner: MigrationPreflightRunner,
  definitions: readonly ConditionalCheckDefinition[],
  present: ReadonlyMap<string, boolean>
): Promise<AggregateCheck[]> {
  const checks: AggregateCheck[] = [];
  for (const definition of definitions) {
    const checked = definition.requires.every((name) => present.get(name) === true);
    checks.push({
      name: definition.name,
      checked,
      count: checked ? await readCount(runner, definition.sql) : 0,
    });
  }
  return checks;
}

async function collectArtifactStatus(
  runner: MigrationPreflightRunner,
  artifacts: readonly SchemaArtifact[]
): Promise<SchemaArtifactStatus[]> {
  const statuses: SchemaArtifactStatus[] = [];
  for (const artifact of artifacts) {
    statuses.push({ name: artifact.name, present: (await readCount(runner, artifact.sql)) > 0 });
  }
  return statuses;
}

function collisionWording(check: CollisionCheck): string {
  return `target ${check.kind} already exists: ${check.name}`;
}

function collectBlockers(input: {
  guards: readonly AggregateCheck[];
  foreignKeys: readonly AggregateCheck[];
  profileKey: readonly AggregateCheck[];
  prerequisites: readonly SchemaArtifactStatus[];
  collisions: readonly CollisionCheck[];
}): string[] {
  const { guards, foreignKeys, profileKey, prerequisites, collisions } = input;
  const blockers: string[] = [];

  for (const definition of GUARD_CHECKS) {
    pushCountBlocker(blockers, guards, definition);
  }
  for (const definition of FOREIGN_KEY_CHECKS) {
    pushCountBlocker(blockers, foreignKeys, definition);
  }
  for (const definition of PROFILE_KEY_CHECKS) {
    pushCountBlocker(blockers, profileKey, definition);
  }
  for (const artifact of prerequisites) {
    if (!artifact.present) {
      blockers.push(`missing pre-deployment prerequisite: ${artifact.name}`);
    }
  }
  for (const check of collisions) {
    blockers.push(collisionWording(check));
  }

  return blockers;
}

function pushCountBlocker(
  blockers: string[],
  checks: readonly AggregateCheck[],
  definition: ConditionalCheckDefinition
): void {
  const check = checks.find((candidate) => candidate.name === definition.name);
  if (check?.checked && check.count > 0) {
    blockers.push(countPhrase(check.count, definition.singular, definition.plural));
  }
}

function countPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

async function readCount(runner: MigrationPreflightRunner, sql: string): Promise<number> {
  const rows = await runner.query(sql);
  const row = rows[0];

  if (
    row === null ||
    row === undefined ||
    typeof row !== "object" ||
    !Object.prototype.hasOwnProperty.call(row, COUNT_FIELD)
  ) {
    throw new Error(`Preflight query returned no usable "${COUNT_FIELD}" field: ${sql}`);
  }

  return toCount((row as Record<string, unknown>)[COUNT_FIELD], sql);
}

function toCount(value: unknown, sql: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "bigint"
        ? Number(value)
        : typeof value === "string" && value.trim() !== ""
          ? Number(value)
          : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Preflight query returned a non-count value: ${sql}`);
  }

  return parsed;
}
