import { z } from "zod";

export const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, "Invalid identifier format");

export const assignTeamMemberSchema = z.object({
  staffMetaId: cuidSchema.min(1, "Staff member is required"),
  title: z.string().trim().min(2).max(120).optional(),
}).strict();

export const updateTeamMemberSchema = z.object({
  title: z.string().trim().min(2).max(120).optional().nullable(),
}).strict();

export const createActivitySchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  description: z.string().trim().max(1000).optional(),
  contentBlockId: cuidSchema.optional(),
  assignedStaffMetaId: cuidSchema.min(1, "Assignee is required"),
  scheduledFor: z.string().datetime().optional(),
}).strict();

export const updateActivitySchema = z.object({
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
  assignedStaffMetaId: cuidSchema.optional().nullable(),
  scheduledFor: z.string().datetime().optional().nullable(),
}).strict();

export const createChatMessageSchema = z.object({
  content: z.string().trim().min(1, "Message content cannot be empty").max(2000, "Message exceeds 2000 character limit"),
}).strict();

export const registerDocumentLinkSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  url: z.string().url("Must be a valid URL").refine((val) => val.startsWith("https://"), {
    message: "URL must use secure HTTPS protocol",
  }),
  description: z.string().trim().max(500).optional(),
}).strict();
