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

  // Fetch announcements for target audience
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
    },
  });

  const feedItems: NotificationFeedItem[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.content,
    category: "announcement",
    priority: (a.priority as any) || "normal",
    targetRole: a.targetRoles,
    read: false,
    createdAt: a.createdAt.toISOString(),
  }));

  const filtered = filterNotificationsForRole(feedItems, user.role, unreadOnly);

  return NextResponse.json({
    unreadCount: filtered.filter((i) => !i.read).length,
    notifications: filtered,
  });
}
