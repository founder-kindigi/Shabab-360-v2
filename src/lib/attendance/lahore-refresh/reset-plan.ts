/**
 * Application-data reset plan.
 *
 * The old staging reset truncated every table, including `users`, which deletes
 * the Super Admin logins. This plan instead clears children before parents and
 * keeps Super Admin identities, their StaffMeta roles, the access-override
 * configuration and all Prisma migration metadata.
 *
 * Two staff-attendance table families can exist side by side in a local database:
 * the canonical `park_staff_attendance_*` pair the application and Prisma schema
 * use today, and the older empty `staff_attendance_*` pair whose lineage is
 * unresolved. Both are cleared here when present, and neither is created or
 * dropped by the reset. The delete order is derived from the target's own
 * foreign-key graph at run time by {@link orderTablesForDelete}, so the plan only
 * has to declare the allowlist and the per-table predicate.
 */
export type ResetPredicate = "all" | "except-super-admin";

export interface ResetStep {
  readonly table: string;
  readonly predicate: ResetPredicate;
}

export const SUPER_ADMIN_ROLE = "super_admin";

/** Tables a refresh never clears. Everything else must be listed below. */
export const PRESERVED_TABLES: readonly string[] = [
  "_prisma_migrations",
  "role_capability_overrides",
  "user_capability_overrides",
];

/** Every clearable application table, in child-first order. */
export const RESET_STEPS: readonly ResetStep[] = [
  { table: "audit_log", predicate: "all" },
  { table: "operation_receipts", predicate: "all" },
  { table: "staff_team_memberships", predicate: "all" },
  { table: "content_plan_resources", predicate: "all" },
  { table: "activity_plan_items", predicate: "all" },
  { table: "student_extended_profiles", predicate: "all" },
  { table: "guardian_children", predicate: "all" },
  { table: "attendance_records", predicate: "all" },
  { table: "payments", predicate: "all" },
  { table: "receipt_sequences", predicate: "all" },
  { table: "fee_donations", predicate: "all" },
  { table: "financial_adjustments", predicate: "all" },
  { table: "park_stocks", predicate: "all" },
  { table: "stock_requests", predicate: "all" },
  { table: "purchase_orders", predicate: "all" },
  { table: "stock_transfers", predicate: "all" },
  { table: "stock_audit_logs", predicate: "all" },
  { table: "admission_interviews", predicate: "all" },
  { table: "announcements", predicate: "all" },
  { table: "notifications", predicate: "all" },
  { table: "report_presets", predicate: "all" },
  { table: "event_team_memberships", predicate: "all" },
  { table: "event_planner_items", predicate: "all" },
  { table: "calling_poc_assignments", predicate: "all" },
  { table: "calling_template_uses", predicate: "all" },
  { table: "call_interactions", predicate: "all" },
  { table: "mashwara_attendees", predicate: "all" },
  { table: "mashwara_decisions", predicate: "all" },
  { table: "mashwara_action_items", predicate: "all" },
  { table: "mashwara_meeting_shares", predicate: "all" },
  { table: "team_chat_messages", predicate: "all" },
  { table: "event_registrations", predicate: "all" },
  { table: "point_transactions", predicate: "all" },
  { table: "student_badges", predicate: "all" },
  { table: "digital_resources", predicate: "all" },
  { table: "knowledge_articles", predicate: "all" },
  { table: "park_staff_attendance_records", predicate: "all" },
  { table: "staff_attendance_records", predicate: "all" },
  { table: "batch_class_dates", predicate: "all" },
  { table: "operational_off_dates", predicate: "all" },
  { table: "batch_settings", predicate: "all" },
  { table: "login_attempt_windows", predicate: "all" },
  { table: "content_plan_blocks", predicate: "all" },
  { table: "guardians", predicate: "all" },
  { table: "attendance_events", predicate: "all" },
  { table: "fee_events", predicate: "all" },
  { table: "procurement_items", predicate: "all" },
  { table: "temporary_event_teams", predicate: "all" },
  { table: "event_responsibilities", predicate: "all" },
  { table: "calling_templates", predicate: "all" },
  { table: "calling_assignments", predicate: "all" },
  { table: "mashwara_meetings", predicate: "all" },
  { table: "badges", predicate: "all" },
  { table: "staff_attendance_events", predicate: "all" },
  { table: "park_staff_attendance_events", predicate: "all" },
  { table: "staff_meta", predicate: "except-super-admin" },
  { table: "collaboration_teams", predicate: "all" },
  { table: "content_plan_sessions", predicate: "all" },
  { table: "admission_applications", predicate: "all" },
  { table: "events", predicate: "all" },
  { table: "external_support_callers", predicate: "all" },
  { table: "content_plans", predicate: "all" },
  { table: "participants", predicate: "all" },
  { table: "calling_campaigns", predicate: "all" },
  { table: "users", predicate: "except-super-admin" },
  { table: "groups", predicate: "all" },
  { table: "batches", predicate: "all" },
  { table: "parks", predicate: "all" },
  { table: "cities", predicate: "all" },
];

const STEP_BY_TABLE = new Map(RESET_STEPS.map((step) => [step.table, step]));

/** A child-before-parent order for `tables`, given `child -> parents` edges. */
export function orderTablesForDelete(
  tables: readonly string[],
  edges: ReadonlyMap<string, ReadonlySet<string>>
): { readonly order: string[]; readonly cycle: string[] } {
  const remaining = new Set(tables);
  const order: string[] = [];
  const referencedBy = new Map<string, Set<string>>();
  for (const table of tables) referencedBy.set(table, new Set());
  for (const table of tables) {
    for (const parent of edges.get(table) ?? []) {
      if (remaining.has(parent)) referencedBy.get(parent)?.add(table);
    }
  }

  while (remaining.size > 0) {
    const ready = [...remaining].filter((table) => [...(referencedBy.get(table) ?? [])].every((child) => !remaining.has(child)));
    if (ready.length === 0) return { order, cycle: [...remaining] };
    for (const table of ready) {
      order.push(table);
      remaining.delete(table);
    }
  }
  return { order, cycle: [] };
}

/**
 * Existing tables that are clearable but absent from the plan. A non-empty
 * result must abort the reset: the plan would leave operational data behind.
 */
export function missingResetTargets(existingTables: readonly string[]): string[] {
  return existingTables.filter((table) => !PRESERVED_TABLES.includes(table) && !STEP_BY_TABLE.has(table));
}

function deleteStatement(table: string): string {
  const step = STEP_BY_TABLE.get(table);
  if (!step) throw new Error("Unknown reset table");
  if (step.predicate === "all") return `DELETE FROM "${table}"`;
  if (table === "staff_meta") return `DELETE FROM "${table}" WHERE "role" <> '${SUPER_ADMIN_ROLE}'`;
  return `DELETE FROM "${table}" WHERE "id" NOT IN (SELECT "userId" FROM "staff_meta" WHERE "role" = '${SUPER_ADMIN_ROLE}')`;
}

export function buildResetStatements(orderedTables: readonly string[] = RESET_STEPS.map((step) => step.table)): readonly string[] {
  return orderedTables.map(deleteStatement);
}

/** Plan invariants the reset driver must hold before it deletes anything. */
export function assertResetPlanInvariants(steps: readonly ResetStep[] = RESET_STEPS): void {
  const tables = steps.map((step) => step.table);
  if (new Set(tables).size !== tables.length) throw new Error("Reset plan contains a duplicated table");
  for (const preserved of PRESERVED_TABLES) {
    if (tables.includes(preserved)) throw new Error(`Reset plan must preserve ${preserved}`);
  }
  const users = steps.find((step) => step.table === "users");
  if (!users || users.predicate !== "except-super-admin") {
    throw new Error("Reset plan must delete only non-Super-Admin users");
  }
  const staff = steps.find((step) => step.table === "staff_meta");
  if (!staff || staff.predicate !== "except-super-admin") {
    throw new Error("Reset plan must preserve Super Admin StaffMeta rows");
  }
}
