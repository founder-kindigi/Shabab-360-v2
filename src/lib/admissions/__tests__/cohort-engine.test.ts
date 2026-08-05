import { describe, it, expect } from "vitest";
import { recommendCohort } from "../cohort-engine";

describe("Cohort Placement Engine", () => {
  it("recommends Senior cohort for applicant age >= 16", () => {
    const rec = recommendCohort(17, "FSc Pre-Medical");
    expect(rec.cohortName).toBe("Senior");
    expect(rec.confidence).toBe("high");
    expect(rec.reasoning).toContain("16 or above");
  });

  it("recommends Junior cohort for applicant age < 16", () => {
    const rec = recommendCohort(14, "8th Grade");
    expect(rec.cohortName).toBe("Junior");
    expect(rec.confidence).toBe("high");
    expect(rec.reasoning).toContain("under 16");
  });

  it("recommends Senior cohort based on education keywords when age is null", () => {
    const rec = recommendCohort(null, "10th Grade Matric");
    expect(rec.cohortName).toBe("Senior");
    expect(rec.confidence).toBe("medium");
    expect(rec.reasoning).toContain("Matched senior education level");
  });

  it("recommends Junior cohort based on education keywords when age is undefined", () => {
    const rec = recommendCohort(undefined, "6th Class");
    expect(rec.cohortName).toBe("Junior");
    expect(rec.confidence).toBe("medium");
    expect(rec.reasoning).toContain("Matched junior education level");
  });

  it("falls back to default Junior recommendation when no data matches", () => {
    const rec = recommendCohort(null, null);
    expect(rec.cohortName).toBe("Junior");
    expect(rec.confidence).toBe("low");
  });
});
