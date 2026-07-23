import { z } from "zod";

const cuidSchema = z.string().trim().min(1, "Identifier required");

export const createEventTeamSchema = z
  .object({
    title: z.string().trim().min(2, "Team title must be at least 2 characters").max(100, "Team title is too long"),
    description: z.string().trim().max(500, "Description is too long").optional().nullable(),
  })
  .strict();

export const addTeamMemberSchema = z
  .object({
    staffMetaId: cuidSchema,
    title: z.string().trim().max(50, "Title is too long").optional().nullable(),
    assignedUntil: z.string().datetime().optional().nullable(),
  })
  .strict();

export const createPlannerItemSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters").max(150, "Title is too long"),
    description: z.string().trim().max(1000, "Description is too long").optional().nullable(),
    assignedToStaffMetaId: cuidSchema.optional().nullable(),
    teamId: cuidSchema.optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().default("pending"),
  })
  .strict();

export const updatePlannerItemSchema = z
  .object({
    title: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    assignedToStaffMetaId: cuidSchema.optional().nullable(),
    teamId: cuidSchema.optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
    completionNote: z.string().trim().max(500).optional().nullable(),
  })
  .strict();
