import { describe, expect, it } from "vitest";
import { toFiniteChartValue } from "./bar-chart";

describe("toFiniteChartValue", () => {
  it("keeps positive finite values", () => {
    expect(toFiniteChartValue(12)).toBe(12);
  });

  it("turns invalid runtime values into zero-height bars", () => {
    expect(toFiniteChartValue(undefined)).toBe(0);
    expect(toFiniteChartValue(Number.NaN)).toBe(0);
    expect(toFiniteChartValue(Number.POSITIVE_INFINITY)).toBe(0);
    expect(toFiniteChartValue(-4)).toBe(0);
  });
});
