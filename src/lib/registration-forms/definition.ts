import { z } from "zod";

const short = (max: number) => z.string().trim().min(1).max(max);
const key = z.string().regex(/^[a-z][a-zA-Z0-9]{0,39}$/);

export const formFieldSchema = z.object({
  key,
  label: short(120),
  type: z.enum(["short_text", "long_text", "phone", "number", "single_select", "city"]),
  required: z.boolean(),
  helpText: z.string().trim().max(300).optional(),
  options: z.array(short(80)).min(2).max(50).optional(),
  allowOther: z.boolean().optional(),
  minNumber: z.number().int().min(0).max(1000000).optional(),
  maxNumber: z.number().int().min(0).max(1000000).optional(),
  visibleWhen: z.object({ fieldKey: key, equals: short(80) }).strict().optional(),
}).strict().superRefine((value, ctx) => {
  const select = value.type === "single_select" || value.type === "city";
  if (select && !value.options) ctx.addIssue({ code: "custom", message: "Selection options are required" });
  if (!select && value.options) ctx.addIssue({ code: "custom", message: "Options are only for selection fields" });
  if (value.options && new Set(value.options.map((item) => item.toLowerCase())).size !== value.options.length) ctx.addIssue({ code: "custom", message: "Options must be distinct" });
  if (value.allowOther && value.type !== "city") ctx.addIssue({ code: "custom", message: "Other City is available for city fields only" });
  if (value.allowOther && !value.options?.includes("Other City")) ctx.addIssue({ code: "custom", message: "Other City option is required" });
  if (value.minNumber !== undefined && value.maxNumber !== undefined && value.minNumber > value.maxNumber) ctx.addIssue({ code: "custom", message: "Number range is invalid" });
  if (value.type !== "number" && (value.minNumber !== undefined || value.maxNumber !== undefined)) ctx.addIssue({ code: "custom", message: "Number limits require a number field" });
});

export const draftFormFieldsSchema = z.array(formFieldSchema).max(20).superRefine((fields, ctx) => {
  if (new Set(fields.map((field) => field.key)).size !== fields.length) ctx.addIssue({ code: "custom", message: "Field keys must be unique" });
  fields.forEach((field, index) => {
    if (!field.visibleWhen) return;
    const controllerIndex = fields.findIndex((candidate) => candidate.key === field.visibleWhen!.fieldKey);
    const controller = fields[controllerIndex];
    if (controllerIndex < 0 || controllerIndex >= index || controller?.type !== "single_select" || !controller.options?.includes(field.visibleWhen.equals)) {
      ctx.addIssue({ code: "custom", path: [index, "visibleWhen"], message: "Conditional questions must depend on an earlier choice and one of its options" });
    }
  });
});

export const formFieldsSchema = draftFormFieldsSchema.superRefine((fields, ctx) => {
  if (fields.length === 0) ctx.addIssue({ code: "custom", message: "At least one question is required" });
});

export const formSettingsSchema = z.object({
  eligibilityText: z.string().trim().max(1200),
  feeText: z.string().trim().max(500),
  privacyNotice: z.string().trim().max(3000),
  contactConsentText: z.string().trim().max(1000),
  successText: short(500),
  minimumAge: z.number().int().min(0).max(100).optional(),
  ageFieldKey: key.optional(),
  genderFieldKey: key.optional(),
  allowedGenderValues: z.array(short(80)).min(1).max(10).optional(),
  registrationStart: z.iso.datetime({ offset: true }).nullable().optional(),
  registrationEnd: z.iso.datetime({ offset: true }).nullable().optional(),
}).strict().superRefine((value, ctx) => {
  if ((value.minimumAge !== undefined) !== Boolean(value.ageFieldKey)) ctx.addIssue({ code: "custom", message: "Age field and minimum age must be set together" });
  if (Boolean(value.genderFieldKey) !== Boolean(value.allowedGenderValues)) ctx.addIssue({ code: "custom", message: "Gender field and allowed values must be set together" });
  if (value.registrationStart && value.registrationEnd && new Date(value.registrationStart) >= new Date(value.registrationEnd)) ctx.addIssue({ code: "custom", message: "Registration dates are invalid" });
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FormSettings = z.infer<typeof formSettingsSchema>;

export const formCreateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(80),
  ownerCityId: z.string().min(1).max(80),
  title: short(120),
  intro: z.string().trim().max(800),
  template: z.enum(["blank", "atfal_style"]).default("blank"),
}).strict();

export const formUpdateSchema = z.object({
  version: z.number().int().positive(),
  title: short(120).optional(),
  intro: z.string().trim().max(800).optional(),
  fields: draftFormFieldsSchema.optional(),
  settings: formSettingsSchema.optional(),
}).strict().refine((value) => Object.keys(value).some((item) => item !== "version"), { message: "No changes provided" });

export function publicationError(fields: FormField[], settings: FormSettings): string | null {
  if (fields.length === 0) return "Add at least one question before publishing";
  if (!settings.privacyNotice || !settings.contactConsentText) return "Privacy notice and contact consent text are required";
  if (settings.minimumAge !== undefined) {
    const age = fields.find((field) => field.key === settings.ageFieldKey);
    if (!age || age.type !== "number" || !age.required) return "A required number field must supply age eligibility";
  }
  if (settings.allowedGenderValues) {
    const gender = fields.find((field) => field.key === settings.genderFieldKey);
    if (!gender || gender.type !== "single_select" || !gender.required || settings.allowedGenderValues.some((value) => !gender.options?.includes(value))) return "Gender eligibility must match a required choice field";
  }
  return null;
}

export function intakeOpen(settings: FormSettings, now = new Date()) {
  return (!settings.registrationStart || new Date(settings.registrationStart) <= now)
    && (!settings.registrationEnd || now <= new Date(settings.registrationEnd));
}

type Answer = string | number | { choice: "Other City"; other: string };
export function isFieldVisible(field: FormField, answers: Record<string, unknown>): boolean {
  return !field.visibleWhen || answers[field.visibleWhen.fieldKey] === field.visibleWhen.equals;
}

export function parseFormAnswers(fields: FormField[], settings: FormSettings, candidate: unknown): Record<string, Answer> | null {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const input = candidate as Record<string, unknown>;
  const keys = new Set(fields.map((field) => field.key));
  if (Object.keys(input).some((item) => !keys.has(item))) return null;
  const output: Record<string, Answer> = {};
  for (const field of fields) {
    if (!isFieldVisible(field, input)) continue;
    const answer = input[field.key];
    if (answer === undefined || answer === null || answer === "") {
      if (field.required) return null;
      continue;
    }
    if (field.type === "number") {
      if (typeof answer !== "number" || !Number.isInteger(answer) || answer < (field.minNumber ?? 0) || answer > (field.maxNumber ?? 1000000)) return null;
      output[field.key] = answer;
    } else if (field.type === "city" && typeof answer === "object" && !Array.isArray(answer)) {
      const other = answer as Record<string, unknown>;
      if (!field.allowOther || Object.keys(other).sort().join(",") !== "choice,other" || other.choice !== "Other City" || typeof other.other !== "string" || other.other.trim().length < 2 || other.other.trim().length > 120) return null;
      output[field.key] = { choice: "Other City", other: other.other.trim() };
    } else {
      if (typeof answer !== "string") return null;
      const text = answer.trim();
      if (!text) return null;
      if (field.type === "phone" && (!/^\+?[0-9][0-9 -]{7,18}[0-9]$/.test(text) || text.length > 20)) return null;
      if (field.type === "short_text" && text.length > 200) return null;
      if (field.type === "long_text" && text.length > 2000) return null;
      if ((field.type === "single_select" || field.type === "city") && (!field.options?.includes(text) || (field.type === "city" && field.allowOther && text === "Other City"))) return null;
      output[field.key] = text;
    }
  }
  if (settings.minimumAge !== undefined && Number(output[settings.ageFieldKey!]) < settings.minimumAge) return null;
  if (settings.allowedGenderValues && !settings.allowedGenderValues.includes(String(output[settings.genderFieldKey!]))) return null;
  return output;
}
