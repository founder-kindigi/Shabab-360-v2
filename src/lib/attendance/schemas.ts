import { isValid, parseISO } from "date-fns";
import { z } from "zod";

export const attendanceStatusSchema = z.enum([
  "present",
  "absent",
  "late",
  "excused",
]);

// Lahore reconciliation retains legacy UUID rows while newer Prisma rows use CUIDs.
// Both are persisted identifiers; arbitrary client-provided strings stay invalid.
export const persistentIdSchema = z.union([z.string().cuid(), z.string().uuid()]);
const isoDateTimeSchema = z
  .string()
  .trim()
  .refine((value) => isValid(parseISO(value)), { message: "Invalid datetime" });

export const createAttendanceEventSchema = z.object({
  groupId: persistentIdSchema,
  title: z.string().trim().min(1).max(200),
  eventDate: isoDateTimeSchema.optional(),
}).strict();

export const materializeScheduledAttendanceSchema = z.object({
  groupId: persistentIdSchema,
  eventDate: isoDateTimeSchema,
}).strict();

export const markAttendanceSchema = z.object({
  participantId: persistentIdSchema,
  status: attendanceStatusSchema,
  mutationId: z.string().trim().max(100).optional(),
  editReason: z.string().trim().min(1).max(1000).optional(),
  markedAt: isoDateTimeSchema.optional(),
}).strict();

export const closeAttendanceEventSchema = z.object({
  reason: z.string().trim().min(1).max(500),
}).strict();

export const editAttendanceRecordSchema = z.object({
  status: attendanceStatusSchema,
  editReason: z.string().trim().min(10).max(2000),
}).strict();

export const syncMutationSchema = z.object({
  mutationId: z.string().trim().min(1).max(100),
  eventId: persistentIdSchema,
  participantId: persistentIdSchema,
  status: attendanceStatusSchema,
  markedAt: isoDateTimeSchema.optional(),
}).strict();

export const syncAttendanceRequestSchema = z.object({
  mutations: z.array(syncMutationSchema).min(1).max(50),
}).strict();

export const checkAttendanceAlertsSchema = z.object({
  participantId: persistentIdSchema,
  eventId: persistentIdSchema,
}).strict();

export const materializeParkStaffAttendanceSchema = z.object({
  parkId: persistentIdSchema,
  eventDate: isoDateTimeSchema,
}).strict();

export const markParkStaffAttendanceSchema = z.object({
  staffId: persistentIdSchema,
  status: attendanceStatusSchema,
  editReason: z.string().trim().min(1).max(500).optional(),
}).strict();
