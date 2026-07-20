import { describe, expect, it } from "vitest";
import { participantProfileFieldsFromCsv, participantProfileFieldsSchema } from "./profile-fields";

describe("participant profile fields", () => {
  it("accepts a bounded integer age and grade/class from CSV aliases", () => {
    const values = participantProfileFieldsFromCsv({ Age: "13.0", Grade: "8th" });

    expect(participantProfileFieldsSchema.parse(values)).toEqual({ age: 13, gradeClass: "8th" });
  });

  it("treats supplied blank values as explicit nulls", () => {
    expect(participantProfileFieldsSchema.parse({ age: "", gradeClass: "" })).toEqual({ age: null, gradeClass: null });
  });

  it("rejects impossible ages and oversized grades", () => {
    expect(participantProfileFieldsSchema.safeParse({ age: "3", gradeClass: "8th" }).success).toBe(false);
    expect(participantProfileFieldsSchema.safeParse({ age: "13", gradeClass: "x".repeat(65) }).success).toBe(false);
  });
});
