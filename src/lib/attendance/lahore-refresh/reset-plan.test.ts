import { describe, expect, it } from "vitest";
import {
  PRESERVED_TABLES,
  RESET_STEPS,
  SUPER_ADMIN_ROLE,
  assertResetPlanInvariants,
  buildResetStatements,
  missingResetTargets,
  orderTablesForDelete,
} from "./reset-plan";

describe("Lahore reset plan", () => {
  it("uses the real SQLite table names and preserves schema/migration metadata", () => {
    const tables = RESET_STEPS.map((step) => step.table);
    for (const preserved of PRESERVED_TABLES) expect(tables).not.toContain(preserved);
    // Both staff-attendance families are cleared when present, and neither is created here.
    expect(tables).toContain("staff_attendance_records");
    expect(tables).toContain("staff_attendance_events");
    expect(tables).toContain("park_staff_attendance_records");
    expect(tables).toContain("park_staff_attendance_events");
    expect(tables).toContain("operation_receipts");
    expect(PRESERVED_TABLES).toContain("_prisma_migrations");
    expect(PRESERVED_TABLES).toContain("role_capability_overrides");
  });

  it("clears the canonical staff-attendance pair only when the target has it", () => {
    // A legacy-only database stays acceptable: the canonical pair is absent there.
    expect(missingResetTargets(["cities", "staff_attendance_events", "staff_attendance_records", ...PRESERVED_TABLES])).toEqual([]);
    expect(
      missingResetTargets([
        "cities",
        "staff_attendance_events",
        "staff_attendance_records",
        "park_staff_attendance_events",
        "park_staff_attendance_records",
        ...PRESERVED_TABLES,
      ])
    ).toEqual([]);

    const statements = buildResetStatements(["park_staff_attendance_records", "park_staff_attendance_events"]);
    expect(statements).toEqual(['DELETE FROM "park_staff_attendance_records"', 'DELETE FROM "park_staff_attendance_events"']);
  });

  it("preserves Super Admin users and their StaffMeta role", () => {
    expect(RESET_STEPS.find((step) => step.table === "users")).toEqual({ table: "users", predicate: "except-super-admin" });
    expect(RESET_STEPS.find((step) => step.table === "staff_meta")).toEqual({ table: "staff_meta", predicate: "except-super-admin" });

    const statements = buildResetStatements();
    expect(statements).toContain(
      `DELETE FROM "users" WHERE "id" NOT IN (SELECT "userId" FROM "staff_meta" WHERE "role" = '${SUPER_ADMIN_ROLE}')`
    );
    expect(statements).toContain(`DELETE FROM "staff_meta" WHERE "role" <> '${SUPER_ADMIN_ROLE}'`);
    expect(statements.every((statement) => statement.startsWith("DELETE FROM "))).toBe(true);
  });

  it("orders a foreign-key graph child before parent", () => {
    const edges = new Map<string, ReadonlySet<string>>([
      ["attendance_records", new Set(["attendance_events"])],
      ["attendance_events", new Set(["groups"])],
      ["groups", new Set(["batches"])],
      ["batches", new Set(["parks"])],
      ["parks", new Set(["cities"])],
      ["cities", new Set()],
    ]);
    const { order, cycle } = orderTablesForDelete([...edges.keys()], edges);
    expect(cycle).toEqual([]);
    expect(order.indexOf("attendance_records")).toBeLessThan(order.indexOf("attendance_events"));
    expect(order.indexOf("attendance_events")).toBeLessThan(order.indexOf("groups"));
    expect(order.indexOf("groups")).toBeLessThan(order.indexOf("batches"));
    expect(order.indexOf("parks")).toBeLessThan(order.indexOf("cities"));
  });

  it("reports a cyclic foreign-key graph instead of guessing an order", () => {
    const edges = new Map<string, ReadonlySet<string>>([
      ["a", new Set(["b"])],
      ["b", new Set(["a"])],
    ]);
    const { order, cycle } = orderTablesForDelete(["a", "b"], edges);
    expect(order).toEqual([]);
    expect(cycle.sort()).toEqual(["a", "b"]);
  });

  it("refuses a target with a clearable table the plan does not cover", () => {
    expect(missingResetTargets(["cities", "users", ...PRESERVED_TABLES])).toEqual([]);
    expect(missingResetTargets(["cities", "unexpected_table"])).toEqual(["unexpected_table"]);
  });

  it("accepts the reviewed plan and rejects a tampered one", () => {
    expect(() => assertResetPlanInvariants()).not.toThrow();
    expect(() => assertResetPlanInvariants([...RESET_STEPS, { table: "_prisma_migrations", predicate: "all" }])).toThrow(/preserve/);
    expect(() => assertResetPlanInvariants(RESET_STEPS.map((step) => (step.table === "users" ? { table: "users", predicate: "all" } : step)))).toThrow();
    expect(() => assertResetPlanInvariants(RESET_STEPS.filter((step) => step.table !== "staff_meta"))).toThrow();
  });
});
