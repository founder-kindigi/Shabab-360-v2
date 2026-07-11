import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

// Human-readable labels for entity types
const ENTITY_LABELS: Record<string, string> = {
  city: "City",
  park: "Park",
  batch: "Batch",
  group: "Group",
  user: "User",
  attendance_events: "Attendance Event",
  attendance_records: "Attendance Record",
};

// Verb for each action type
const ACTION_VERBS: Record<string, string> = {
  CREATE: "created",
  UPDATE: "updated",
  DELETE: "deleted",
  CLOSE: "closed",
};

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const role = user.role;
  const isHQ = role === "super_admin" || role === "program_admin";

  // Build a WHERE clause based on the user's scope.
  // We collect entity IDs relevant to the user's org scope,
  // then filter audit logs where the actor (userId) or the target (entityId) is in scope.
  let whereClause: Record<string, unknown> = {};

  if (!isHQ && (role === "city_head" || role === "park_admin" || role === "park_lead" || role === "murabbi")) {
    // Collect entity IDs in the user's organizational scope
    const entityIds: string[] = [];
    const staffUserIds: string[] = [];

    if (role === "city_head" && user.assignedCityId) {
      entityIds.push(user.assignedCityId);

      // Parks in this city
      const parks = await db.park.findMany({
        where: { cityId: user.assignedCityId, isActive: true },
        select: { id: true },
      });
      const parkIds = parks.map((p) => p.id);
      entityIds.push(...parkIds);

      // Staff in this city
      const cityStaff = await db.staffMeta.findMany({
        where: { assignedCityId: user.assignedCityId, isActive: true },
        select: { userId: true },
      });
      staffUserIds.push(...cityStaff.map((s) => s.userId));
    } else if ((role === "park_admin" || role === "park_lead" || role === "murabbi") && user.assignedParkId) {
      entityIds.push(user.assignedParkId);

      // Batches in this park
      const batches = await db.batch.findMany({
        where: { parkId: user.assignedParkId, isActive: true },
        select: { id: true },
      });
      const batchIds = batches.map((b) => b.id);
      entityIds.push(...batchIds);

      // Groups in these batches
      if (batchIds.length > 0) {
        const groups = await db.group.findMany({
          where: { batchId: { in: batchIds }, isActive: true },
          select: { id: true },
        });
        entityIds.push(...groups.map((g) => g.id));
      }

      // Staff in this park
      const parkStaff = await db.staffMeta.findMany({
        where: { assignedParkId: user.assignedParkId, isActive: true },
        select: { userId: true },
      });
      staffUserIds.push(...parkStaff.map((s) => s.userId));
    }

    // Filter: actor is in scope OR target entity is in scope
    const orConditions: Record<string, unknown>[] = [];

    if (staffUserIds.length > 0) {
      orConditions.push({ userId: { in: staffUserIds } });
    }

    if (entityIds.length > 0) {
      orConditions.push({ entityId: { in: entityIds } });
    }

    if (orConditions.length > 0) {
      whereClause = { OR: orConditions };
    } else {
      // No scope data — return empty
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }
  }
  // For super_admin / program_admin: no filter (all entries)
  // For guardian / student: return empty (no audit log access)
  else if (role === "guardian" || role === "student") {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  // Calculate unread threshold (last 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [logs, unreadCount] = await Promise.all([
    db.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    }),
    db.auditLog.count({
      where: {
        ...whereClause,
        createdAt: { gte: twentyFourHoursAgo },
      },
    }),
  ]);

  // Build notification objects with auto-generated descriptions
  const notifications = logs.map((log) => {
    const actorName = log.user?.name || "System";
    const entityLabel = ENTITY_LABELS[log.entityType] || log.entityType;
    const actionVerb = ACTION_VERBS[log.action] || log.action.toLowerCase();

    // Try to extract a meaningful name from newValues
    let targetName = "";
    try {
      if (log.newValues) {
        const vals = JSON.parse(log.newValues);
        targetName = vals.name || vals.title || "";
      }
    } catch {
      // ignore parse errors
    }

    const description = targetName
      ? `${actorName} ${actionVerb} ${entityLabel}: ${targetName}`
      : `${actorName} ${actionVerb} a ${entityLabel}`;

    return {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      description,
      timestamp: log.createdAt.toISOString(),
      actorName,
    };
  });

  return NextResponse.json({ notifications, unreadCount });
}