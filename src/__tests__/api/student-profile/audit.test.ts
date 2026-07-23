import { describe, expect, it } from "vitest";
import { redactProfileSensitiveValues } from "@/lib/student-profile/audit";

describe("Student profile audit sanitizer", () => {
  it("redacts all 7 sensitive wellbeing fields", () => {
    const input = {
      school: "LGS",
      financialStatus: "Middle class",
      deenBackground: "Practicing Muslim",
      badHabits: "None",
      disability: "None",
      specialNeed: "None",
      moralCharacter: "Good",
      namaz: "Five times",
      hobbies: "Reading",
    };
    const result = redactProfileSensitiveValues(input);
    expect(result?.financialStatus).toBe("[REDACTED]");
    expect(result?.deenBackground).toBe("[REDACTED]");
    expect(result?.badHabits).toBe("[REDACTED]");
    expect(result?.disability).toBe("[REDACTED]");
    expect(result?.specialNeed).toBe("[REDACTED]");
    expect(result?.moralCharacter).toBe("[REDACTED]");
    expect(result?.namaz).toBe("[REDACTED]");
    expect(result?.school).toBe("LGS");
    expect(result?.hobbies).toBe("Reading");
  });

  it("returns undefined for undefined input", () => {
    expect(redactProfileSensitiveValues(undefined)).toBeUndefined();
  });

  it("does not mutate the original object", () => {
    const input = { financialStatus: "Value" };
    const result = redactProfileSensitiveValues(input);
    expect(result?.financialStatus).toBe("[REDACTED]");
    expect(input.financialStatus).toBe("Value");
  });
});
