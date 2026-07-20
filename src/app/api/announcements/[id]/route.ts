import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("announcements.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  const announcement = await db.announcement.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      title: true,
    },
  });

  if (!announcement) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  // Only author or super_admin can delete
  if (announcement.authorId !== user.id && user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get old values for audit
  const oldAnnouncement = await db.announcement.findUnique({
    where: { id },
    select: { title: true, content: true, priority: true, targetRoles: true },
  });

  await db.announcement.delete({ where: { id } });

  // Fire audit log
  await logAudit({
    userId: user.id,
    action: "delete",
    entityType: "announcement",
    entityId: id,
    oldValues: oldAnnouncement
      ? {
          title: oldAnnouncement.title,
          priority: oldAnnouncement.priority,
          targetRoles: oldAnnouncement.targetRoles,
        }
      : undefined,
  });

  return NextResponse.json({ success: true });
}
