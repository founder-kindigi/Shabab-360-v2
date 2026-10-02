import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { filterNotificationsForRole, NotificationFeedItem } from "@/lib/notifications/feed";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  // 1. Fetch announcements for target audience, including read status for this user
  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      content: true,
      targetRoles: true,
      priority: true,
      createdAt: true,
      reads: {
        where: { userId: user.id! },
        select: { id: true },
      },
    },
  });

  const announcementFeed: NotificationFeedItem[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.content,
    category: "announcement",
    priority: (a.priority as any) || "normal",
    targetRole: a.targetRoles,
    read: a.reads.length > 0,
    createdAt: a.createdAt.toISOString(),
  }));

  // 2. Fetch point-to-point notifications for this user
  const directNotifications = await db.notification.findMany({
    where: { recipientId: user.id! },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const directFeed: NotificationFeedItem[] = directNotifications.map((n) => ({
    id: n.id,
    title: n.subject,
    message: n.body,
    category: (n.channel as any) || "system",
    priority: "normal", 
    read: !!n.readAt,
    createdAt: n.createdAt.toISOString(),
  }));

  // Combine and sort
  const combined = [...announcementFeed, ...directFeed].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filtered = filterNotificationsForRole(combined, user.role, unreadOnly);

  return NextResponse.json({
    unreadCount: filtered.filter((i) => !i.read).length,
    notifications: filtered,
  });
}
