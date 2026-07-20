import { z } from "zod";

const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

export const participantProfileFieldsSchema = z.object({
  age: z.preprocess(
    blankToNull,
    z.coerce.number().int().min(4, "Age must be at least 4").max(30, "Age must be at most 30").nullable().optional()
  ),
  gradeClass: z.preprocess(blankToNull, z.string().trim().min(1).max(64).nullable().optional()),
});

export function participantProfileFieldsFromCsv(row: Record<string, string>) {
  return {
    age: row.age ?? row.Age ?? "",
    gradeClass: row.gradeClass ?? row.GradeClass ?? row.grade_class ?? row.grade ?? row.Grade ?? row.class ?? row.Class ?? "",
  };
}
