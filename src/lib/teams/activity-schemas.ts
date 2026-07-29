import { z } from "zod";
import { optionalIdentifier, paginatedQuerySchema } from "@/lib/api/query-params";

const activityStatusSchema = z.enum(["planned", "in_progress", "completed", "cancelled"]);

export const activityListQuerySchema = paginatedQuerySchema().extend({
  status: activityStatusSchema.optional(),
  assignedToMe: z.enum(["true", "false"]).optional(),
});

export const createActivitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).optional(),
  scheduledFor: z.coerce.date().optional(),
  assignedStaffMetaId: optionalIdentifier(),
  contentBlockId: optionalIdentifier(),
}).strict();

export const updateActivitySchema = z.object({
  status: activityStatusSchema.optional(),
  assignedStaffMetaId: optionalIdentifier(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2_000).optional().nullable(),
  scheduledFor: z.coerce.date().optional().nullable(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one activity field is required",
});

export type ActivityStatus = z.infer<typeof activityStatusSchema>;
