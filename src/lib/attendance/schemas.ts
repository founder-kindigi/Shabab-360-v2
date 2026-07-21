import { isValid, parseISO } from "date-fns";
import { z } from "zod";

export const attendanceStatusSchema = z.enum([
  "present",
  "absent",
  "late",
  "excused",
]);

const cuidSchema = z.string().cuid();
const isoDateTimeSchema = z
  .string()
  .trim()
  .refine((value) => isValid(parseISO(value)), { message: "Invalid datetime" });

export const createAttendanceEventSchema = z.object({
  groupId: cuidSchema,
  title: z.string().trim().min(1).max(200),
  eventDate: isoDateTimeSchema.optional(),
});

export const markAttendanceSchema = z.object({
  participantId: cuidSchema,
  status: attendanceStatusSchema,
  mutationId: z.string().trim().max(100).optional(),
  editReason: z.string().trim().min(1).max(1000).optional(),
  markedAt: isoDateTimeSchema.optional(),
});

export const closeAttendanceEventSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const editAttendanceRecordSchema = z.object({
  status: attendanceStatusSchema,
  editReason: z.string().trim().min(10).max(2000),
});

export const syncMutationSchema = z.object({
  mutationId: z.string().trim().min(1).max(100),
  eventId: cuidSchema,
  participantId: cuidSchema,
  status: attendanceStatusSchema,
  markedAt: isoDateTimeSchema.optional(),
});

export const syncAttendanceRequestSchema = z.object({
  mutations: z.array(syncMutationSchema).min(1).max(50),
});

export const checkAttendanceAlertsSchema = z.object({
  participantId: cuidSchema,
  eventId: cuidSchema,
});
