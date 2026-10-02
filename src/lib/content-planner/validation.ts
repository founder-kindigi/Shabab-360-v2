/**
 * Bounded Zod validation schemas for content planner operations.
 * All inputs are validated against maximum lengths and business rules.
 */

import { z } from "zod";
import {
  optionalIdentifier,
  optionalQueryText,
  paginatedQuerySchema,
  MAX_IDENTIFIER_LENGTH,
} from "@/lib/api/query-params";

// Field length limits
export const CONTENT_PLAN_LIMITS = {
  name: 200,
  kind: 50,
  status: 50,
  sourceWorkbook: 500,
  sourceSheet: 200,
  weekLabel: 50,
  dayLabel: 50,
  focusArea: 500,
  title: 200,
  content: 10_000,
  category: 50,
  resourceLabel: 200,
  resourceUrl: 2_000,
  activityTitle: 200,
  activityDescription: 2_000,
};

// Allowed values
export const PLAN_KINDS = ["template", "override"] as const;
export const PLAN_STATUSES = ["draft", "published", "archived"] as const;
export const SESSION_STATUSES = ["draft", "published", "delivered", "cancelled"] as const;
export const BLOCK_STATUSES = ["draft", "published"] as const;
export const RESOURCE_KINDS = ["external_link", "document"] as const;
export const ACTIVITY_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const;

/**
 * Content plan kind validation
 */
export const planKindSchema = z.enum(PLAN_KINDS);

/**
 * Content plan status validation
 */
export const planStatusSchema = z.enum(PLAN_STATUSES);

/**
 * Session status validation
 */
export const sessionStatusSchema = z.enum(SESSION_STATUSES);

/**
 * Block status validation
 */
export const blockStatusSchema = z.enum(BLOCK_STATUSES);

/**
 * Resource kind validation
 */
export const resourceKindSchema = z.enum(RESOURCE_KINDS);

/**
 * Activity status validation
 */
export const activityStatusSchema = z.enum(ACTIVITY_STATUSES);

/**
 * Approved category validation - only four categories allowed
 * Must be defined as a tuple for z.enum() compatibility
 */
const APPROVED_CATEGORIES = ["exercises", "sports", "skills", "tadreeb"] as const;
export const contentCategorySchema = z.enum(APPROVED_CATEGORIES);

/**
 * Content plan list query parameters
 */
export const contentPlanListQuerySchema = paginatedQuerySchema().extend({
  cityId: optionalIdentifier(),
  batchId: optionalIdentifier(),
  parkId: optionalIdentifier(),
  status: planStatusSchema.optional(),
  kind: planKindSchema.optional(),
  search: optionalQueryText(),
});

/**
 * Create content plan payload
 */
export const createContentPlanSchema = z.object({
  cityId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH),
  batchId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH).optional().nullable(),
  parkId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH).optional().nullable(),
  basePlanId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH).optional().nullable(),
  name: z.string().trim().min(1).max(CONTENT_PLAN_LIMITS.name),
  kind: planKindSchema.default("template"),
  sourceWorkbook: z.string().trim().max(CONTENT_PLAN_LIMITS.sourceWorkbook).optional().nullable(),
  sourceSheet: z.string().trim().max(CONTENT_PLAN_LIMITS.sourceSheet).optional().nullable(),
});

/**
 * Update content plan payload
 */
export const updateContentPlanSchema = z.object({
  name: z.string().trim().min(1).max(CONTENT_PLAN_LIMITS.name).optional(),
  status: planStatusSchema.optional(),
});

/**
 * Validate calendar date format (YYYY-MM-DD) and reject impossible dates.
 * Parses year/month/day components and round-trip validates them so that
 * dates like 2026-02-30 or 2026-13-01 are rejected rather than silently
 * clamped by the JS Date constructor.
 */
const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (val) => {
      const [year, month, day] = val.split("-").map(Number);
      // month is 0-indexed in Date constructor
      const date = new Date(year, month - 1, day);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    },
    { message: "Invalid calendar date" }
  );

/**
 * Session list query parameters
 */
export const sessionListQuerySchema = paginatedQuerySchema({ maxPageSize: 200 })
  .extend({
    planId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH),
    startDate: calendarDateSchema.optional(),
    endDate: calendarDateSchema.optional(),
    status: sessionStatusSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "startDate must be less than or equal to endDate",
      path: ["startDate"],
    }
  );

/**
 * Create session payload
 */
export const createSessionSchema = z
  .object({
    planId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH),
    weekLabel: z.string().trim().max(CONTENT_PLAN_LIMITS.weekLabel).optional().nullable(),
    dayLabel: z.string().trim().max(CONTENT_PLAN_LIMITS.dayLabel).optional().nullable(),
    sessionDate: calendarDateSchema,
    focusArea: z.string().trim().max(CONTENT_PLAN_LIMITS.focusArea).optional().nullable(),
    isOffDay: z.boolean().default(false),
    sourceRow: z.number().int().min(1).max(10_000).optional().nullable(),
  })
  .refine(
    (data) => {
      // Off-day sessions must not have focusArea
      if (data.isOffDay && data.focusArea) {
        return false;
      }
      return true;
    },
    {
      message: "Off-day sessions cannot have a focus area",
      path: ["focusArea"],
    }
  );

/**
 * Update session payload
 */
export const updateSessionSchema = z.object({
  weekLabel: z.string().trim().max(CONTENT_PLAN_LIMITS.weekLabel).optional().nullable(),
  dayLabel: z.string().trim().max(CONTENT_PLAN_LIMITS.dayLabel).optional().nullable(),
  sessionDate: calendarDateSchema.optional(),
  focusArea: z.string().trim().max(CONTENT_PLAN_LIMITS.focusArea).optional().nullable(),
  status: sessionStatusSchema.optional(),
});

/**
 * Block list query parameters
 */
export const blockListQuerySchema = paginatedQuerySchema({ maxPageSize: 200 }).extend({
  sessionId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH),
  category: contentCategorySchema.optional(),
  teamId: optionalIdentifier(),
  status: blockStatusSchema.optional(),
});

/**
 * Create block payload - enforces category validation
 * Server-side validation additionally checks:
 * 1. Session is not an off-day (off-days have zero blocks)
 * 2. Team belongs to the same city as the plan
 * 3. Category matches team code mapping
 */
export const createBlockSchema = z.object({
  sessionId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH),
  teamId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH),
  category: contentCategorySchema,
  title: z.string().trim().max(CONTENT_PLAN_LIMITS.title).optional().nullable(),
  content: z.string().trim().min(1).max(CONTENT_PLAN_LIMITS.content),
  sortOrder: z.number().int().min(0).max(100).default(0),
});

/**
 * Update block payload
 */
export const updateBlockSchema = z.object({
  title: z.string().trim().max(CONTENT_PLAN_LIMITS.title).optional().nullable(),
  content: z.string().trim().min(1).max(CONTENT_PLAN_LIMITS.content).optional(),
  sortOrder: z.number().int().min(0).max(100).optional(),
  status: blockStatusSchema.optional(),
});

/**
 * Create resource payload
 */
export const createResourceSchema = z.object({
  blockId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH),
  label: z.string().trim().min(1).max(CONTENT_PLAN_LIMITS.resourceLabel),
  url: z.string().trim().url().max(CONTENT_PLAN_LIMITS.resourceUrl),
  kind: resourceKindSchema.default("external_link"),
});

/**
 * Create activity plan item payload
 */
export const createActivitySchema = z.object({
  teamId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH),
  contentBlockId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH).optional().nullable(),
  assignedStaffMetaId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH).optional().nullable(),
  title: z.string().trim().min(1).max(CONTENT_PLAN_LIMITS.activityTitle),
  description: z.string().trim().max(CONTENT_PLAN_LIMITS.activityDescription).optional().nullable(),
  scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

/**
 * Update activity plan item payload
 */
export const updateActivitySchema = z.object({
  assignedStaffMetaId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH).optional().nullable(),
  title: z.string().trim().min(1).max(CONTENT_PLAN_LIMITS.activityTitle).optional(),
  description: z.string().trim().max(CONTENT_PLAN_LIMITS.activityDescription).optional().nullable(),
  status: activityStatusSchema.optional(),
  scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

/**
 * Archive content plan payload
 */
export const archiveContentPlanSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

/**
 * Helper to validate that a session is not an off-day before allowing blocks
 */
export function validateNotOffDay(isOffDay: boolean): boolean {
  if (isOffDay) {
    throw new Error("Cannot create content blocks for off-day sessions");
  }
  return true;
}

import { CATEGORY_TO_TEAM_CODE } from "./scope";

/**
 * Helper to validate category matches team code using CATEGORY_TO_TEAM_CODE mapping
 */
export function validateCategoryTeamMapping(
  category: string,
  teamCode: string
): boolean {
  if (!APPROVED_CATEGORIES.includes(category as any)) {
    throw new Error(`Invalid category: ${category}. Must be one of: ${APPROVED_CATEGORIES.join(", ")}`);
  }

  // Use CATEGORY_TO_TEAM_CODE from scope as the single source of truth
  const expectedTeamCode = CATEGORY_TO_TEAM_CODE[category as keyof typeof CATEGORY_TO_TEAM_CODE];

  if (!expectedTeamCode) {
    throw new Error(`No team mapping found for category: ${category}`);
  }

  if (expectedTeamCode !== teamCode) {
    throw new Error(
      `Category '${category}' must use team '${expectedTeamCode}', got '${teamCode}'`
    );
  }

  return true;
}

/**
 * Type exports for validated data
 */
export type ContentPlanListQuery = z.infer<typeof contentPlanListQuerySchema>;
export type CreateContentPlan = z.infer<typeof createContentPlanSchema>;
export type UpdateContentPlan = z.infer<typeof updateContentPlanSchema>;

export type SessionListQuery = z.infer<typeof sessionListQuerySchema>;
export type CreateSession = z.infer<typeof createSessionSchema>;
export type UpdateSession = z.infer<typeof updateSessionSchema>;

export type BlockListQuery = z.infer<typeof blockListQuerySchema>;
export type CreateBlock = z.infer<typeof createBlockSchema>;
export type UpdateBlock = z.infer<typeof updateBlockSchema>;

export type CreateResource = z.infer<typeof createResourceSchema>;
export type CreateActivity = z.infer<typeof createActivitySchema>;
export type UpdateActivity = z.infer<typeof updateActivitySchema>;
export type ArchiveContentPlan = z.infer<typeof archiveContentPlanSchema>;
