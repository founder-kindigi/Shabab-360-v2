import { z } from "zod";

export const ALLOWED_EVENT_TYPES = [
  "trip",
  "ceremony",
  "campaign",
  "activity",
  "sports_day",
  "camp",
  "open_day",
  "closing",
  "other",
] as const;

export const ALLOWED_EVENT_STATUSES = [
  "planned",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;

const cuidSchema = z.string().trim().min(1, "Identifier required");

export const createEventSchema = z
  .object({
    cityId: cuidSchema.optional(),
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
    description: z.string().trim().max(1000, "Description is too long").optional(),
    eventType: z.enum(ALLOWED_EVENT_TYPES, { errorMap: () => ({ message: "Invalid eventType" }) }),
    status: z.enum(ALLOWED_EVENT_STATUSES).optional().default("planned"),
    venue: z.string().trim().max(200, "Venue is too long").optional(),
    venueNotes: z.string().trim().max(500, "Venue notes are too long").optional(),
    startDate: z.string().datetime({ message: "Invalid startDate datetime format" }),
    endDate: z.string().datetime({ message: "Invalid endDate datetime format" }).optional().nullable(),
    capacity: z.number().int().min(1, "Capacity must be positive").optional().nullable(),
    cost: z.number().min(0, "Cost cannot be negative").optional().nullable(),
    requiresConsent: z.boolean().optional().default(false),
    requiresMedical: z.boolean().optional().default(false),
  })
  .strict()
  .refine(
    (data) => {
      if (data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        return false;
      }
      return true;
    },
    {
      message: "endDate cannot be before startDate",
      path: ["endDate"],
    }
  );

export const updateEventSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long").optional(),
    description: z.string().trim().max(1000, "Description is too long").optional().nullable(),
    eventType: z.enum(ALLOWED_EVENT_TYPES).optional(),
    status: z.enum(ALLOWED_EVENT_STATUSES).optional(),
    venue: z.string().trim().max(200, "Venue is too long").optional().nullable(),
    venueNotes: z.string().trim().max(500, "Venue notes are too long").optional().nullable(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional().nullable(),
    capacity: z.number().int().min(1).optional().nullable(),
    cost: z.number().min(0).optional().nullable(),
    requiresConsent: z.boolean().optional(),
    requiresMedical: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        return false;
      }
      return true;
    },
    {
      message: "endDate cannot be before startDate",
      path: ["endDate"],
    }
  );
