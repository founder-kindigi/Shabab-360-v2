import { z } from "zod";

const requiredText = (max: number) => z.string().trim().min(2).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(80);

export const cohortCreateSchema = z.object({
  slug,
  cityId: z.string().min(1).max(80),
  title: requiredText(120),
  summary: requiredText(800),
  registrationStart: z.iso.datetime({ offset: true }).optional(),
  registrationEnd: z.iso.datetime({ offset: true }).optional(),
  capacity: z.number().int().min(1).max(10000).optional(),
}).strict().refine(
  (value) => !value.registrationStart || !value.registrationEnd || new Date(value.registrationStart) < new Date(value.registrationEnd),
  { message: "Registration end must follow start" },
);

export const cohortDraftUpdateSchema = z.object({
  version: z.number().int().positive(),
  title: requiredText(120).optional(),
  summary: requiredText(800).optional(),
  eligibilityText: z.string().trim().min(2).max(1200).nullable().optional(),
  feeText: z.string().trim().min(2).max(500).nullable().optional(),
  privacyNotice: z.string().trim().min(2).max(3000).nullable().optional(),
  registrationStart: z.iso.datetime({ offset: true }).nullable().optional(),
  registrationEnd: z.iso.datetime({ offset: true }).nullable().optional(),
  capacity: z.number().int().min(1).max(10000).nullable().optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== "version"), { message: "No changes provided" });

export const trainingApplicationSchema = z.object({
  requestKey: z.uuid(),
  fullName: requiredText(120),
  phone: z.string().trim().regex(/^\+?[0-9][0-9 -]{7,18}[0-9]$/).max(20),
  email: z.email().max(254).optional(),
  dateOfBirth: z.iso.date().optional(),
  locality: requiredText(120),
  background: requiredText(200),
  connection: z.enum(["new", "existing_team"]),
  motivation: requiredText(1000),
  availability: z.enum(["available", "limited", "unavailable"]),
  privacyVersion: z.number().int().positive(),
  declaration: z.literal(true),
}).strict().refine(
  (value) => !value.dateOfBirth || new Date(`${value.dateOfBirth}T00:00:00Z`) <= new Date(),
  { message: "Date of birth cannot be in the future", path: ["dateOfBirth"] },
);

export const reviewActionSchema = z.object({
  version: z.number().int().positive(),
  status: z.enum(["under_review", "accepted", "waitlisted", "rejected"]),
  reason: optionalText(500),
}).strict();

export const cohortListSchema = z.object({
  cityId: z.string().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const applicationListSchema = cohortListSchema.extend({
  cohortId: z.string().min(1).max(80).optional(),
  status: z.enum(["submitted", "under_review", "accepted", "waitlisted", "rejected"]).optional(),
}).strict();

export function queryObject(url: string) {
  return Object.fromEntries(new URL(url).searchParams.entries());
}

export function validIntake(cohort: { status: string; registrationStart: Date | null; registrationEnd: Date | null; eligibilityText: string | null; feeText: string | null; privacyNotice: string | null }, now = new Date()) {
  return cohort.status === "published"
    && Boolean(cohort.eligibilityText && cohort.feeText && cohort.privacyNotice)
    && (!cohort.registrationStart || cohort.registrationStart <= now)
    && (!cohort.registrationEnd || now <= cohort.registrationEnd);
}
