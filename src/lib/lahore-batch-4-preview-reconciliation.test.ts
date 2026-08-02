import { describe, expect, it } from "vitest";

const reconciler = await import("../../scripts/reconcile-lahore-batch-4-preview.cjs");

describe("Lahore Preview reconciliation safeguards", () => {
  it("defaults to a zero-write dry run", () => {
    expect(reconciler.parseArgs([
      "--input", "batch.xlsx",
      "--completed-through", "2026-07-26",
    ])).toMatchObject({ execute: false, confirmed: false });
  });

  it("requires an explicit paired execution confirmation", () => {
    expect(() => reconciler.parseArgs([
      "--input", "batch.xlsx",
      "--completed-through", "2026-07-26",
      "--execute",
    ])).toThrow("requires both");
  });

  it("uses a deterministic normalized identity key", () => {
    expect(reconciler.sourceKey({ name: "  Ahmed   Khan ", phone: "+92 300 1234567" }))
      .toBe("ahmed khan|03001234567");
  });
});
