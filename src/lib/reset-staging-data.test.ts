import { describe, expect, it } from "vitest";

const reset = await import("../../scripts/reset-staging-data.cjs");

describe("staging data reset command", () => {
  it("defaults to dry-run and lists every application model", () => {
    expect(reset.parseArgs([])).toEqual({ execute: false, confirmStagingDataReset: false });
    expect(reset.RESET_TABLES).toEqual(expect.arrayContaining(["users", "cities", "attendance_records", "audit_log", "role_capability_overrides"]));
  });

  it("requires execution before accepting the destructive reset confirmation", () => {
    expect(() => reset.parseArgs(["--confirm-staging-data-reset"])).toThrow("can only be used with --execute");
  });

  it("rejects unsupported arguments", () => {
    expect(() => reset.parseArgs(["--force"])).toThrow("Unexpected argument");
  });
});
