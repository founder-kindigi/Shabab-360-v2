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

export const prepareAttendanceSessionsSchema = z.object({
  date: z.string().date(),
  parkId: cuidSchema.optional(),
}).strict();

export const updateAttendanceScheduleSchema = z.object({
  classWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7)
    .transform((days) => [...new Set(days)].sort()),
  extraClassDates: z.array(z.string().date()).max(60).default([]),
  automaticDropoutEnabled: z.boolean().optional(),
  warningConsecutiveWeeks: z.number().int().min(1).max(12).optional(),
  dropoutConsecutiveWeeks: z.number().int().min(1).max(12).optional(),
}).strict();

export const operationalOffDateSchema = z.object({
  cityId: cuidSchema,
  offDate: z.string().date(),
  label: z.string().trim().min(2).max(120),
}).strict();

export const prepareStaffAttendanceSchema = z.object({
  parkId: cuidSchema,
  date: z.string().date(),
}).strict();

export const markStaffAttendanceSchema = z.object({
  staffMetaId: cuidSchema,
  status: attendanceStatusSchema,
  editReason: z.string().trim().min(10).max(1000).optional(),
}).strict();

export const updateDropoutPolicySchema = z.object({
  automaticDropoutEnabled: z.boolean(),
  warningConsecutiveWeeks: z.number().int().min(1).max(12),
  dropoutConsecutiveWeeks: z.number().int().min(1).max(12),
}).strict().refine((value) => value.warningConsecutiveWeeks < value.dropoutConsecutiveWeeks, {
  message: "Warning threshold must be lower than dropout threshold",
  path: ["warningConsecutiveWeeks"],
});

export const participantDropoutActionSchema = z.object({
  action: z.enum(["dropout", "reactivate"]),
  reason: z.string().trim().min(10).max(500),
  effectiveDate: z.string().date().optional(),
}).strict();
