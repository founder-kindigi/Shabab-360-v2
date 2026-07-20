import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  optionalQueryText,
  paginatedQuerySchema,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";

const notificationStatusUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(1_000),
  status: z.enum(["sent", "failed"]),
});

const notificationQueueQuerySchema = paginatedQuerySchema({ maxPageSize: 50 }).extend({
  status: z.enum(["pending", "sent", "failed"]).optional(),
  channel: optionalQueryText(64),
});

/**
 * GET /api/admin/notifications/queue
 * Admin endpoint to view queued/pending/sent/failed notifications.
 * Supports query params: ?status=&channel=&page=&pageSize=
 */
export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const capabilityAuth = await requireCapability("settings.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const query = notificationQueueQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const { status, channel, page, pageSize } = query.data;

  try {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        channel: n.channel,
        recipientEmail: n.recipientEmail,
        recipientName: n.user?.name || null,
        subject: n.subject,
        bodyPreview: n.body.slice(0, 120) + (n.body.length > 120 ? "…" : ""),
        status: n.status,
        sentAt: n.sentAt?.toISOString() || null,
        createdAt: n.createdAt.toISOString(),
        data: n.data ? JSON.parse(n.data) : null,
      })),
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Notification queue error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/notifications/queue
 * Mark notifications as sent/failed (for admin manual processing).
 * Body: { ids: string[], status: "sent" | "failed" }
 */
export async function PATCH(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const capabilityAuth = await requireCapability("settings.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const body = await request.json().catch(() => null);
    const parsed = notificationStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 }
      );
    }
    const { ids, status } = parsed.data;

    await db.notification.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        sentAt: status === "sent" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, updatedCount: ids.length });
  } catch (error) {
    console.error("Notification update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
