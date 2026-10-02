import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult.user;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  // 1. Try marking as Notification
  const notification = await db.notification.findUnique({
    where: { id, recipientId: user.id! }
  });

  if (notification) {
    await db.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() }
    });
    return NextResponse.json({ success: true, id, type: "notification" });
  }

  // 2. Try marking as Announcement
  const announcement = await db.announcement.findUnique({
    where: { id }
  });

  if (announcement) {
    // Upsert AnnouncementRead
    await db.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId: user.id!
        }
      },
      create: {
        announcementId: id,
        userId: user.id!
      },
      update: {} // already exists
    });
    return NextResponse.json({ success: true, id, type: "announcement" });
  }

  // If we reach here, it's either not found or user doesn't have permission
  return NextResponse.json({ error: "Notification not found" }, { status: 404 });
}