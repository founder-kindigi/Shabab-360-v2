import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const userRole = user.role;
  if (!userRole) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  // Fetch active (non-expired) announcements
  const now = new Date();
  const announcements = await db.announcement.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      author: { select: { name: true } },
      reads: {
        where: { userId: user.id! },
        select: { id: true },
      },
    },
  });

  // Filter by targetRoles
  const relevant = announcements.filter((a) => {
    try {
      const roles: string[] = JSON.parse(a.targetRoles);
      if (!roles || roles.length === 0) return true;
      return roles.includes(userRole);
    } catch {
      // If targetRoles is just a string and not JSON (as in feed/route.ts)
      if (a.targetRoles === "all" || !a.targetRoles) return true;
      return a.targetRoles === userRole;
    }
  });

  const notifications = relevant.map((a) => ({
    id: a.id,
    title: a.title,
    content:
      a.content.length > 120 ? a.content.slice(0, 120) + "…" : a.content,
    type: "announcement" as const,
    priority: a.priority,
    read: a.reads.length > 0,
    createdAt: a.createdAt.toISOString(),
    authorName: a.author?.name || "System",
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications, unreadCount });
}