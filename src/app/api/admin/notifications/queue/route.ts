import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

/**
 * GET /api/admin/notifications/queue
 * Admin endpoint to view queued/pending/sent/failed notifications.
 * Supports query params: ?status=&channel=&page=&pageSize=
 */
export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const channel = searchParams.get("channel") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

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

  try {
    const body = await request.json();
    const { ids, status } = body as { ids?: string[]; status?: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    if (!["sent", "failed"].includes(status)) {
      return NextResponse.json({ error: "status must be 'sent' or 'failed'" }, { status: 400 });
    }

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