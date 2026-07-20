import { describe, expect, it } from "vitest";

import {
  EXCLUDED_MODELS,
  FINGERPRINT_CHECKS,
  IMPORT_MODELS,
  compareCounts,
  formatCents,
  moneyToCents,
} from "../../scripts/lib/migration-manifest.cjs";

describe("Postgres migration manifest", () => {
  it("keeps audit and notification records out of the data import", () => {
    expect(EXCLUDED_MODELS).toEqual(["auditLog", "notification"]);
    expect(IMPORT_MODELS).not.toContain("auditLog");
    expect(IMPORT_MODELS).not.toContain("notification");
  });

  it("reconciles every persisted admission additional-information field", () => {
    const admissionCheck = FINGERPRINT_CHECKS.find(
      (check) => check[0] === "admissionApplication"
    );

    expect(admissionCheck?.[1]).toEqual(
      expect.arrayContaining([
        "emergencyContact",
        "emergencyPhone",
        "previousEducation",
        "reference",
      ])
    );
  });

  it("converts exact two-decimal amounts without floating point math", () => {
    expect(moneyToCents(125.5)).toBe(BigInt(12550));
    expect(moneyToCents({ toString: () => "19.99" })).toBe(BigInt(1999));
    expect(formatCents(BigInt(-5))).toBe("-0.05");
  });

  it("rejects source amounts that cannot fit the exact-money target", () => {
    expect(() => moneyToCents(10.001)).toThrow("more than two decimal places");
  });

  it("reports only the models with row-count mismatches", () => {
    const source = Object.fromEntries(IMPORT_MODELS.map((model) => [model, 1]));
    const target = { ...source, payment: 0 };
    expect(compareCounts(source, target)).toEqual(["payment"]);
  });
});
