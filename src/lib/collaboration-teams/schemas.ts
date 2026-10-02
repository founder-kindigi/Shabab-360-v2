/**
 * Bounded Zod schemas for collaboration-team membership operations.
 * All IDs are validated against MAX_IDENTIFIER_LENGTH; free-text fields
 * are capped so audit payloads stay within the 500-char sanitisation limit.
 */
import { z } from "zod";
import {
  MAX_IDENTIFIER_LENGTH,
  optionalIdentifier,
  paginatedQuerySchema,
} from "@/lib/api/query-params";

// ── Field limits ─────────────────────────────────────────────────────────────
export const TEAM_TITLE_MAX = 120;
export const TEAM_NAME_MAX = 100;
export const TEAM_CODE_MAX = 32;
export const TEAM_DESCRIPTION_MAX = 300;

// ── Team list query ───────────────────────────────────────────────────────────
export const teamListQuerySchema = paginatedQuerySchema().extend({
  cityId: optionalIdentifier(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

// ── Membership list query ─────────────────────────────────────────────────────
export const memberListQuerySchema = paginatedQuerySchema().extend({
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

// ── Create membership ─────────────────────────────────────────────────────────
export const createMembershipSchema = z.object({
  staffMetaId: z
    .string()
    .trim()
    .min(1, "Staff member is required")
    .max(MAX_IDENTIFIER_LENGTH),
  title: z.string().trim().min(2).max(TEAM_TITLE_MAX).optional(),
});

// ── Update membership ─────────────────────────────────────────────────────────
export const updateMembershipSchema = z
  .object({
    title: z.string().trim().min(2).max(TEAM_TITLE_MAX).optional().nullable(),
    endedAt: z.string().datetime().optional().nullable(),
  })
  .refine((d) => d.title !== undefined || d.endedAt !== undefined, {
    message: "At least one field must be provided",
  });

export type TeamListQuery = z.infer<typeof teamListQuerySchema>;
export type MemberListQuery = z.infer<typeof memberListQuerySchema>;
export type CreateMembership = z.infer<typeof createMembershipSchema>;
export type UpdateMembership = z.infer<typeof updateMembershipSchema>;
