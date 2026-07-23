import { z } from "zod";

const cuidSchema = z.string().trim().min(1, "Identifier required");

export const createCampaignSchema = z
  .object({
    cityId: cuidSchema.optional(),
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(120, "Name is too long"),
    description: z.string().trim().max(1000, "Description is too long").optional().nullable(),
    startDate: z.string().datetime({ message: "Invalid startDate format" }),
    endDate: z.string().datetime({ message: "Invalid endDate format" }),
  })
  .strict()
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: "startDate must be less than or equal to endDate",
      path: ["startDate"],
    }
  );

export const createTemplateSchema = z
  .object({
    cityId: cuidSchema.optional(),
    campaignId: cuidSchema.optional().nullable(),
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
    body: z.string().trim().min(5, "Body must be at least 5 characters").max(2000, "Body is too long"),
  })
  .strict();

export const updateTemplateStatusSchema = z
  .object({
    status: z.enum(["approved", "retired"]),
  })
  .strict();

export const assignLeadsSchema = z
  .object({
    campaignId: cuidSchema,
    applicationIds: z.array(cuidSchema).min(1, "At least one application lead required"),
    callerStaffMetaId: cuidSchema.optional().nullable(),
    callerExternalId: cuidSchema.optional().nullable(),
  })
  .strict()
  .refine(
    (data) => Boolean(data.callerStaffMetaId) !== Boolean(data.callerExternalId),
    {
      message: "Lead assignment must specify exactly one caller: callerStaffMetaId XOR callerExternalId",
      path: ["callerStaffMetaId"],
    }
  );

export const logInteractionSchema = z
  .object({
    assignmentId: cuidSchema,
    outcome: z.enum([
      "reached",
      "no_answer",
      "busy",
      "wrong_number",
      "not_interested",
      "callback_requested",
    ]),
    notes: z.string().trim().max(1000).optional().nullable(),
    scheduledFor: z.string().datetime().optional().nullable(),
  })
  .strict()
  .refine(
    (data) => data.outcome !== "callback_requested" || Boolean(data.scheduledFor),
    {
      message: "scheduledFor date is required when outcome is callback_requested",
      path: ["scheduledFor"],
    }
  );

export const useTemplateSchema = z
  .object({
    templateId: cuidSchema,
    assignmentId: cuidSchema,
    variablesUsed: z.array(z.string()).default([]),
    valuesUsed: z.record(z.any()).default({}),
  })
  .strict();
