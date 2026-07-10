import { db } from "@/lib/db";

interface AuditParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
}

/**
 * Log an audit entry. Fire-and-forget — errors are silently ignored
 * to avoid blocking the main operation.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : undefined,
        newValues: params.newValues ? JSON.stringify(params.newValues) : undefined,
        reason: params.reason,
      },
    });
  } catch {
    // Never block the main operation for audit failures
  }
}