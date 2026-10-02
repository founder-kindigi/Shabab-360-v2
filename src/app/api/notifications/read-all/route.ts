import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function POST(_request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  // 1. Mark all point-to-point notifications as read
  await db.notification.updateMany({
    where: { 
      recipientId: user.id!,
      readAt: null
    },
    data: { readAt: new Date() }
  });

  // 2. Find all announcements that are relevant to this user but not yet read
  const now = new Date();
  const announcements = await db.announcement.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      reads: { none: { userId: user.id! } }
    }
  });

  // Filter to just those meant for this user's role
  const unreadRelevant = announcements.filter((a) => {
    try {
      const roles: string[] = JSON.parse(a.targetRoles);
      if (!roles || roles.length === 0) return true;
      return roles.includes(user.role as string);
    } catch {
      if (a.targetRoles === "all" || !a.targetRoles) return true;
      return a.targetRoles === user.role;
    }
  });

  // 3. Mark those announcements as read
  if (unreadRelevant.length > 0) {
    const records = unreadRelevant.map(a => ({
      announcementId: a.id,
      userId: user.id!
    }));
    await db.announcementRead.createMany({
      data: records,
      skipDuplicates: true
    });
  }

  return NextResponse.json({ success: true });
}
