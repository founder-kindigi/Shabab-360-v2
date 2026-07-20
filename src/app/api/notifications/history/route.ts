import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import {
  paginatedQuerySchema,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const historyQuerySchema = paginatedQuerySchema().extend({
  type: z.enum(["all", "attendance", "fees", "announcements", "system", "users"]).default("all"),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const { searchParams } = new URL(request.url);
  const parsedQuery = historyQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
  }
  const { page, pageSize, type } = parsedQuery.data;

  // This feed exposes only generic activity metadata, never stored audit values.
  const where: Record<string, unknown> = {};

  // Filter by type category
  if (type !== "all") {
    const typeMap: Record<Exclude<typeof type, "all">, string[]> = {
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

  const isHq = user.role === "super_admin" || user.role === "program_admin";
  if (isHq) {
    const capabilityAuth = await requireCapability("audit.view");
    if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  } else {
    where.userId = user.id;
  }

  const [logs, totalItems] = await Promise.all([
    db.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        user: {
          select: { name: true },
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
    entityId: null,
    description: buildDescription(log.action, log.entityType, log.user?.name || "System"),
    actorName: log.user?.name || "System",
    timestamp: log.createdAt.toISOString(),
    read: false,
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
