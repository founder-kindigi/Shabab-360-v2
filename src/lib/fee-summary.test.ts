import { describe, expect, it } from "vitest";
import { calculateTotalExpectedFees } from "./fee-summary";

describe("calculateTotalExpectedFees", () => {
  it("multiplies each fee event by active participants in its batch", () => {
    expect(
      calculateTotalExpectedFees([
        { amount: 2_000, activeParticipantCount: 4 },
        { amount: 500, activeParticipantCount: 3 },
      ])
    ).toBe(9_500);
  });

  it("does not count a fee event when its batch has no active participants", () => {
    expect(calculateTotalExpectedFees([{ amount: 2_000, activeParticipantCount: 0 }])).toBe(0);
  });
});
