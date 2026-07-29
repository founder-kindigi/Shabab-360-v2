import { z } from "zod";

const cuidSchema = z.string().trim().min(1).max(50);
const teamIdSchema = cuidSchema;
const staffMetaIdSchema = cuidSchema;

export const MEDIA_BRIEF_STATUSES = [
  "draft", "open", "in_progress", "ready_for_review",
  "revision_requested", "approved", "delivered", "cancelled", "archived",
] as const;

export type MediaBriefStatus = (typeof MEDIA_BRIEF_STATUSES)[number];

export const MEDIA_BRIEF_LIFECYCLE: Record<string, readonly string[]> = {
  draft: ["open", "cancelled"],
  open: ["in_progress", "cancelled"],
  in_progress: ["ready_for_review"],
  ready_for_review: ["approved", "revision_requested"],
  revision_requested: ["in_progress"],
  approved: ["delivered", "archived"],
  delivered: ["archived"],
  cancelled: [],
  archived: [],
};

export function isValidBriefTransition(current: string, next: string): boolean {
  const allowed = MEDIA_BRIEF_LIFECYCLE[current];
  return Boolean(allowed && allowed.includes(next));
}

export const mediaTypeSchema = z.enum(["graphic", "video", "audio", "document", "photography", "other"]);
export const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const assetMetadataSchema = z.object({
  fileName: z.string().max(255).optional(),
  fileSizeBytes: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
  duration: z.string().max(20).optional(),
  resolution: z.string().max(20).optional(),
  format: z.string().max(100).optional(),
  thumbnailUrl: z.string().url().optional(),
  externalStorageUrl: z.string().url().optional(),
}).strict();

export const createBriefSchema = z.object({
  cityId: cuidSchema.optional(),
  teamId: teamIdSchema,
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().trim().max(5000, "Description is too long").optional(),
  mediaType: mediaTypeSchema.optional(),
  format: z.string().trim().max(100).optional(),
  priority: prioritySchema.optional(),
  dueAt: z.coerce.date().optional(),
}).strict();

export const updateBriefSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  mediaType: mediaTypeSchema.optional(),
  format: z.string().trim().max(100).optional().nullable(),
  priority: prioritySchema.optional(),
  dueAt: z.coerce.date().optional().nullable(),
  contentBlockId: cuidSchema.optional().nullable(),
  status: z.enum(MEDIA_BRIEF_STATUSES).optional(),
  assignedToStaffMetaId: staffMetaIdSchema.optional().nullable(),
  rejectionReason: z.string().trim().max(1000).optional().nullable(),
  cancellationReason: z.string().trim().max(500).optional().nullable(),
  assetMetadata: assetMetadataSchema.optional().nullable(),
  version: z.number().int().positive("version is required for update"),
}).strict().refine(
  (d) => { if (d.cancellationReason && d.status !== "cancelled") return false; return true; },
  { message: "cancellationReason is only valid when status transitions to cancelled", path: ["cancellationReason"] }
);

export const briefListQuerySchema = z.object({
  cityId: cuidSchema,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(MEDIA_BRIEF_STATUSES).optional(),
  teamId: cuidSchema.optional(),
  mediaType: mediaTypeSchema.optional(),
  priority: prioritySchema.optional(),
  assignedToStaffMetaId: staffMetaIdSchema.optional(),
});

const SENSITIVE_FIELD = /(?:password|token|secret|email|phone|cnic|address|dateofbirth|^name$|name$|reason|message|body|content|description)/i;

export function sanitizeMediaAuditData(values: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(values)) {
    if (/rejectionReason|cancellationReason/i.test(key)) continue;
    if (SENSITIVE_FIELD.test(key)) continue;
    if (typeof value === "string" && /^https?:\/\//i.test(value)) { result[key] = "[REDACTED]"; continue; }
    if (key === "assetMetadata" && typeof value === "object" && value !== null) {
      const s = { ...value };
      if ("externalStorageUrl" in s) s.externalStorageUrl = "[REDACTED]";
      if ("thumbnailUrl" in s) s.thumbnailUrl = "[REDACTED]";
      result[key] = s;
      continue;
    }
    result[key] = value;
  }
  return result;
}

export function assetMetadataHasExternalUrl(meta: Record<string, any> | null | undefined): boolean {
  if (!meta) return false;
  if (typeof meta.thumbnailUrl === "string" && /^https?:\/\//i.test(meta.thumbnailUrl)) return true;
  if (typeof meta.externalStorageUrl === "string" && /^https?:\/\//i.test(meta.externalStorageUrl)) return true;
  return false;
}
