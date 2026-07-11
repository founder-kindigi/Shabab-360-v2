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
    },
  });

  // Filter by targetRoles — parse the JSON string and check if user's role is included
  const relevant = announcements.filter((a) => {
    try {
      const roles: string[] = JSON.parse(a.targetRoles);
      // Empty array or null means "all roles"
      if (!roles || roles.length === 0) return true;
      return roles.includes(userRole);
    } catch {
      // If JSON parse fails, treat as targeting all roles
      return true;
    }
  });

  // Map to notification objects
  const notifications = relevant.map((a) => ({
    id: a.id,
    title: a.title,
    content:
      a.content.length > 120 ? a.content.slice(0, 120) + "…" : a.content,
    priority: a.priority, // "urgent" | "normal" | "low"
    createdAt: a.createdAt.toISOString(),
    authorName: a.author?.name || "System",
  }));

  return NextResponse.json({ notifications, unreadCount: notifications.length });
}