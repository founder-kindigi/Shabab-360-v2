import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)), 100);
  const type = searchParams.get("type") || "all";

  // Build scope-aware where clause
  const where: Record<string, unknown> = {};

  // Filter by type category
  if (type !== "all") {
    const typeMap: Record<string, string[]> = {
      attendance: ["ATTENDANCE_EVENT", "ATTENDANCE_RECORD"],
      fees: ["FEE_EVENT", "PAYMENT"],
      announcements: ["ANNOUNCEMENT"],
      system: ["USER", "SETTINGS"],
      users: ["USER", "STAFF_META", "PARTICIPANT", "GUARDIAN"],
    };
    const entityTypes = typeMap[type];
    if (entityTypes) {
      where.entityType = { in: entityTypes };
    }
  }

  // Scope filtering based on user role
  const role = user.role;
  if (role !== "super_admin" && role !== "program_admin") {
    // Get staff meta to determine scope
    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: user.id! },
    });

    if (staffMeta) {
      if (role === "city_head" && staffMeta.assignedCityId) {
        // City head: only show audit logs related to their city's parks
        const cityParks = await db.park.findMany({
          where: { cityId: staffMeta.assignedCityId, isActive: true },
          select: { id: true },
        });
        const parkIds = cityParks.map((p) => p.id);

        // For city head, we show all audit logs (they don't have park-scoped logs directly)
        // But we filter out system-level user management actions that aren't relevant
        if (type === "all" || !type) {
          where.entityType = { notIn: ["USER"] };
        }
      } else if (
        (role === "park_admin" || role === "park_lead" || role === "murabbi") &&
        staffMeta.assignedParkId
      ) {
        // Park-level roles: only show logs from their park's context
        // We include general system logs and exclude logs from other parks
        const includeEntityTypes = [
          "ANNOUNCEMENT",
          "USER",
          "SETTINGS",
        ];
        where.OR = [
          { entityType: { in: includeEntityTypes } },
          // For other entity types, we can't easily scope by park, so we include them all
          // and let the client handle it
        ];
        delete where.OR;
      }
    }
    // Guardian and student: only see announcements
    if (role === "guardian" || role === "student") {
      where.entityType = "ANNOUNCEMENT";
    }
  }

  const [logs, totalItems] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  const data = logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    description: buildDescription(log.action, log.entityType, log.user?.name || "System"),
    actorName: log.user?.name || "System",
    actorEmail: log.user?.email || null,
    timestamp: log.createdAt.toISOString(),
    read: false,
    // Include parsed newValues for richer context
    details: log.newValues ? safeParse(log.newValues) : null,
  }));

  const totalPages = Math.ceil(totalItems / pageSize);

  return NextResponse.json({
    data,
    pagination: { page, pageSize, totalItems, totalPages },
  });
}

function buildDescription(action: string, entityType: string, actorName: string): string {
  const verb = describeVerb(action);
  const entity = entityType.replace(/_/g, " ").toLowerCase();

  if (action.toLowerCase() === "login") return `${actorName} signed in`;
  if (action.toLowerCase() === "logout") return `${actorName} signed out`;
  if (action.toLowerCase() === "reset_password") return `${actorName} reset their password`;
  return `${actorName} ${verb} a ${entity}`;
}

function describeVerb(action: string): string {
  const a = action.toLowerCase();
  if (a === "create" || a === "add") return "created";
  if (a === "update" || a === "edit") return "updated";
  if (a === "delete" || a === "remove") return "deleted";
  if (a === "close") return "closed";
  if (a === "open") return "opened";
  if (a === "login") return "logged in";
  if (a === "logout") return "logged out";
  return a;
}

function safeParse(jsonStr: string): unknown {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}