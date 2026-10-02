import { z } from "zod";

export const NOTIFICATION_CHANNELS = [
  "password_reset",
  "password_changed",
  "invite",
  "fee_reminder",
  "absence_alert",
  "admission_status",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

const roleSchema = z.enum([
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
  "murabbi",
  "guardian",
  "student",
]);
const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
const emptyMetadataSchema = z.object({}).strict();

const notificationMetadataSchemas = {
  password_reset: emptyMetadataSchema,
  password_changed: emptyMetadataSchema,
  invite: z.object({ role: roleSchema }).strict(),
  fee_reminder: emptyMetadataSchema,
  absence_alert: z
    .object({
      participantId: identifierSchema,
      consecutiveAbsents: z.number().int().nonnegative().max(10_000),
      level: z.enum(["warning", "critical", "dropout"]),
      threshold: z.number().int().nonnegative().max(10_000),
    })
    .strict(),
  admission_status: z
    .object({
      applicationId: identifierSchema.optional(),
      status: z.string().trim().min(1).max(64).regex(/^[a-z_]+$/).optional(),
    })
    .strict(),
} satisfies Record<NotificationChannel, z.ZodType>;

const noPersistedUrlChannels = new Set<NotificationChannel>([
  "password_reset",
  "password_changed",
  "invite",
]);
const urlPattern = /\b(?:https?:\/\/|www\.)\S+/i;
const secretBearingUrlPattern =
  /\b(?:https?:\/\/|www\.)\S*(?:[?&](?:token|code|secret|password|credential|key)=|\/(?:reset|invite|invitation)(?:\/|\?|#|$))\S*/i;
const forbiddenSensitiveSecretTermPattern =
  /\b(?:temporary\s+password|one-time\s+password|password\s+hash|token\s+hash|reset\s+token|invitation\s+token|access\s+token|passcode|otp)\b/i;
const credentialAssignmentPattern =
  /\b(?:temporary\s+password|password\s+hash|token\s+hash|password|passcode|token|secret|credential|invitation\s+code|reset\s+code|otp)\b\s*(?:is|:|=|-|–|—)\s*\S+/i;

export function assertNotificationContentSafe(
  channel: NotificationChannel,
  subject: string,
  body: string
): void {
  if (!subject.trim() || !body.trim()) {
    throw new Error(`Notification content is empty for channel ${channel}`);
  }

  const persistedContent = `${subject}\n${body}`;
  const hasForbiddenUrl =
    secretBearingUrlPattern.test(persistedContent) ||
    (noPersistedUrlChannels.has(channel) && urlPattern.test(persistedContent));
  const hasForbiddenSensitiveTerm =
    noPersistedUrlChannels.has(channel) &&
    forbiddenSensitiveSecretTermPattern.test(persistedContent);

  if (
    hasForbiddenUrl ||
    hasForbiddenSensitiveTerm ||
    credentialAssignmentPattern.test(persistedContent)
  ) {
    throw new Error(`Unsafe notification content for channel ${channel}`);
  }
}

export function serializeNotificationMetadata(
  channel: NotificationChannel,
  data?: Record<string, unknown>
): string | null {
  const result = notificationMetadataSchemas[channel].safeParse(data ?? {});
  if (!result.success) {
    throw new Error(`Unsafe notification metadata for channel ${channel}`);
  }

  const metadata = result.data as Record<string, unknown>;
  return Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;
}
