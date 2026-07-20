import { db } from "@/lib/db";

export interface AuditParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
}

const REDACTED_VALUE = "[REDACTED]";
const MAX_AUDIT_TEXT_LENGTH = 500;
const SENSITIVE_AUDIT_FIELD = /(?:password|token|secret|email|phone|cnic|address|dateofbirth|^name$|name$|reason|message|body|content)/i;

function sanitizeAuditText(value: string): string {
  return value.length > MAX_AUDIT_TEXT_LENGTH
    ? `${value.slice(0, MAX_AUDIT_TEXT_LENGTH)}... [TRUNCATED]`
    : value;
}

function sanitizeAuditValue(fieldName: string, value: unknown): unknown {
  if (SENSITIVE_AUDIT_FIELD.test(fieldName)) {
    return REDACTED_VALUE;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return sanitizeAuditText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(fieldName, item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => [
        key,
        sanitizeAuditValue(key, childValue),
      ])
    );
  }
  return value;
}

function sanitizeAuditValues(values?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!values) return undefined;

  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, sanitizeAuditValue(key, value)])
  );
}

export function sanitizeAuditReason(reason?: string): string | undefined {
  if (!reason) return undefined;

  return sanitizeAuditText(reason)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED_VALUE)
    .replace(/\b\d{5}-?\d{7}-?\d\b/g, REDACTED_VALUE)
    .replace(/\b(?:\+92|0)3\d{9}\b/g, REDACTED_VALUE);
}

/**
 * Produces a redacted audit payload that callers can persist inside their own
 * transaction when an operation must not succeed without its audit record.
 */
export function createAuditLogData(params: AuditParams) {
  return {
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    oldValues: params.oldValues ? JSON.stringify(sanitizeAuditValues(params.oldValues)) : undefined,
    newValues: params.newValues ? JSON.stringify(sanitizeAuditValues(params.newValues)) : undefined,
    reason: sanitizeAuditReason(params.reason),
  };
}

/**
 * Log an audit entry without allowing observability failures to block the
 * primary operation. Failures are emitted in a PII-safe, structured form.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: createAuditLogData(params),
    });
  } catch (error) {
    // Vercel captures stderr, so this remains visible on the free tier without
    // copying actor, entity, or before/after values into application logs.
    console.error(JSON.stringify({
      level: "error",
      event: "audit_write_failed",
      action: params.action,
      entityType: params.entityType,
      errorType: error instanceof Error ? error.name : "UnknownError",
      timestamp: new Date().toISOString(),
    }));
  }
}
