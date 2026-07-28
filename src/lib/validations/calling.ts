import { z } from "zod";

const cuidSchema = z.string().trim().min(1, "Identifier required");

// ── Merge variable allowlist ─────────────────────────────────────────────────
export const ALLOWED_MERGE_VARIABLES = ["parentName", "applicantName", "trackingCode"] as const;
export type AllowedMergeVariable = (typeof ALLOWED_MERGE_VARIABLES)[number];

// ── Campaign schemas ─────────────────────────────────────────────────────────

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

export const updateCampaignSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(120, "Name is too long").optional(),
    description: z.string().trim().max(1000, "Description is too long").optional().nullable(),
    status: z.enum(["draft", "active", "completed", "archived"]).optional(),
    startDate: z.string().datetime({ message: "Invalid startDate format" }).optional(),
    endDate: z.string().datetime({ message: "Invalid endDate format" }).optional(),
  })
  .strict();

// ── Template schemas ─────────────────────────────────────────────────────────

export const createTemplateSchema = z
  .object({
    cityId: cuidSchema.optional(),
    campaignId: cuidSchema.optional().nullable(),
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
    body: z.string().trim().min(5, "Body must be at least 5 characters").max(2000, "Body is too long"),
  })
  .strict();

const TEMPLATE_LIFECYCLE: Record<string, readonly string[]> = {
  draft: ["approved"],
  approved: ["retired"],
  retired: [],
};

export const updateTemplateStatusSchema = z
  .object({
    status: z.enum(["approved", "retired"]),
  })
  .strict();

export function isValidTemplateTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const allowed = TEMPLATE_LIFECYCLE[currentStatus];
  return Boolean(allowed && allowed.includes(nextStatus));
}

export const useTemplateSchema = z
  .object({
    templateId: cuidSchema,
    assignmentId: cuidSchema,
    variablesUsed: z
      .array(z.string())
      .default([])
      .refine(
        (vars) => vars.every((v) => (ALLOWED_MERGE_VARIABLES as readonly string[]).includes(v)),
        { message: `Variables must be one of: ${ALLOWED_MERGE_VARIABLES.join(", ")}` }
      ),
    // Restricted to approved merge-variable keys with bounded string values.
    // Keys must match variablesUsed — enforced via refine below.
    valuesUsed: z
      .record(z.string(), z.string().min(1).max(500))
      .default({}),
  })
  .strict()
  .refine(
    (data) => {
      const valsKeys = Object.keys(data.valuesUsed);
      if (valsKeys.length === 0) return true;
      return valsKeys.every((k) => (ALLOWED_MERGE_VARIABLES as readonly string[]).includes(k));
    },
    {
      message: `valuesUsed keys must be one of: ${ALLOWED_MERGE_VARIABLES.join(", ")}`,
      path: ["valuesUsed"],
    }
  )
  .refine(
    (data) => {
      const varsUsed = new Set(data.variablesUsed);
      const valsKeys = Object.keys(data.valuesUsed);
      return valsKeys.length === varsUsed.size && valsKeys.every((k) => varsUsed.has(k));
    },
    {
      message: "valuesUsed keys must match variablesUsed exactly",
      path: ["valuesUsed"],
    }
  );

// ── Assignment schema ────────────────────────────────────────────────────────

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

// ── Interaction schema ───────────────────────────────────────────────────────

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
