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
