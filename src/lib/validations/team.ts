import { z } from "zod";

export const assignTeamMemberSchema = z
  .object({
    staffMetaId: z.string().trim().min(1, "Staff member is required"),
    title: z.string().trim().min(2, "Title must be at least 2 characters").max(120, "Title is too long").optional(),
  })
  .strict();

export const teamListQuerySchema = z.object({
  cityId: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "all"]).optional().default("active"),
});

export const createTeamActivitySchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters").max(150, "Title is too long"),
    description: z.string().trim().max(1000, "Description is too long").optional(),
    assignedStaffMetaId: z.string().trim().min(1).optional(),
    contentBlockId: z.string().trim().min(1).optional(),
    status: z.enum(["planned", "in_progress", "completed", "cancelled", "archived"]).optional().default("planned"),
    scheduledFor: z.string().optional().nullable(),
  })
  .strict();

export const updateTeamActivitySchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters").max(150, "Title is too long").optional(),
    description: z.string().trim().max(1000, "Description is too long").optional().nullable(),
    assignedStaffMetaId: z.string().trim().min(1).optional().nullable(),
    contentBlockId: z.string().trim().min(1).optional().nullable(),
    status: z.enum(["planned", "in_progress", "completed", "cancelled", "archived"]).optional(),
    scheduledFor: z.string().optional().nullable(),
  })
  .strict();

export const sendTeamChatMessageSchema = z
  .object({
    message: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message is too long"),
  })
  .strict();
