import { describe, expect, it } from "vitest";
import { fromCents, moneyToNumber, roundToCents, toCents } from "@/lib/money";

describe("money helpers", () => {
  describe("toCents", () => {
    it("converts valid positive and negative rupee amounts to paisa", () => {
      expect(toCents(0)).toBe(0);
      expect(toCents(1)).toBe(100);
      expect(toCents(1.1)).toBe(110);
      expect(toCents(199.99)).toBe(19_999);
      expect(toCents(1234.56)).toBe(123_456);
      expect(toCents(-12.34)).toBe(-1234);
    });

    it("normalizes common floating-point operations successfully", () => {
      // Floating-point precision error cases (0.1 + 0.2 = 0.30000000000000004)
      expect(toCents(0.1 + 0.2)).toBe(30);

      // Floats like 0.29 often representationally exist as 0.28999999999999996
      expect(toCents(0.29)).toBe(29);
      expect(toCents(2.29)).toBe(229);
    });

    it("rejects fractional paisas (sub-cent values)", () => {
      expect(toCents(12.345)).toBeNull();
      expect(toCents(0.001)).toBeNull();
      expect(toCents(100.009)).toBeNull();
      expect(toCents(-0.005)).toBeNull();
      expect(toCents(0.0100001)).toBeNull();
    });

    it("rejects non-finite values, NaN, and positive/negative infinity", () => {
      expect(toCents(Number.NaN)).toBeNull();
      expect(toCents(Number.POSITIVE_INFINITY)).toBeNull();
      expect(toCents(Number.NEGATIVE_INFINITY)).toBeNull();
    });

    it("handles boundary check on safe integer limits", () => {
      // Max safe integer is 9,007,199,254,740,991
      // passing 90,071,992,547,409.91 should return 9007199254740991
      expect(toCents(90071992547409.91)).toBe(9007199254740991);

      // exceeding safe integer limits should return null
      expect(toCents(90071992547409.92)).toBeNull();
      expect(toCents(1e16)).toBeNull();
      expect(toCents(-90071992547409.92)).toBeNull();
    });
  });

  describe("roundToCents", () => {
    it("rounds legacy floats to nearest cent/paisa (no validation)", () => {
      expect(roundToCents(0.1 + 0.2)).toBe(30);
      expect(roundToCents(12.345)).toBe(1235);
      expect(roundToCents(0.004)).toBe(0);
      expect(roundToCents(-1.005)).toBe(-100);
    });
  });

  describe("fromCents", () => {
    it("converts integer cents back to float rupees", () => {
      expect(fromCents(12_345)).toBe(123.45);
      expect(fromCents(100)).toBe(1.0);
      expect(fromCents(0)).toBe(0);
      expect(fromCents(-150)).toBe(-1.5);
    });
  });

  describe("moneyToNumber", () => {
    it("normalizes legacy floats and Prisma Decimal-like values", () => {
      expect(moneyToNumber(19.99)).toBe(19.99);
      expect(moneyToNumber({ toString: () => "2000.00" })).toBe(2000);
      expect(moneyToNumber(null)).toBe(0);
    });

    it("rejects invalid database values instead of silently changing a financial total", () => {
      expect(() => moneyToNumber({ toString: () => "not-a-number" })).toThrow("must be finite");
    });
  });
});
