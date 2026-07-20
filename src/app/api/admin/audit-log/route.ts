import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { fromPKT } from "@/lib/timezone";
import { z } from "zod";
import {
  MAX_LIST_OFFSET,
  optionalDateOnly,
  optionalIdentifier,
  optionalInteger,
  optionalQueryText,
  paginatedQuerySchema,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";

const auditLogQuerySchema = paginatedQuerySchema().extend({
  action: optionalQueryText(64),
  entityType: optionalQueryText(64),
  userId: optionalIdentifier(),
  search: optionalQueryText(),
  from: optionalDateOnly(),
  to: optionalDateOnly(),
  sort: z.enum(["createdAt", "action", "entityType"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: optionalInteger(1, 200),
  offset: optionalInteger(0, MAX_LIST_OFFSET),
}).refine(
  ({ limit, offset }) => offset === undefined || limit !== undefined,
  { path: ["offset"], message: "offset requires limit" }
).refine(
  ({ from, to }) => !from || !to || from <= to,
  { path: ["to"], message: "to must be on or after from" }
);

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;
  const capabilityAuth = await requireCapability("audit.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const query = auditLogQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }

  const { action, entityType, userId, search, from, to, sort, order, page, pageSize } = query.data;
  const usesLegacyPagination = query.data.limit !== undefined;

  // If legacy limit/offset are used, use them; otherwise use page/pageSize
  const limit = query.data.limit ?? pageSize;
  const offset = usesLegacyPagination ? (query.data.offset ?? 0) : (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;

  // Search by user name
  if (search) {
    where.user = { name: { contains: search, mode: "insensitive" } };
  }

  if (from || to) {
    where.createdAt = {};
    if (from) {
      const fromDate = fromPKT(new Date(from + "T00:00:00"));
      (where.createdAt as Record<string, unknown>).gte = fromDate;
    }
    if (to) {
      const toDate = fromPKT(new Date(to + "T23:59:59"));
      (where.createdAt as Record<string, unknown>).lte = toDate;
    }
  }

  const orderBy: Record<string, string> = { [sort]: order };

  try {
    const [logs, totalItems] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    const effectivePage = usesLegacyPagination ? Math.floor(offset / limit) + 1 : page;

    return NextResponse.json({
      data: logs,
      pagination: {
        page: effectivePage,
        pageSize: limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Audit log query failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
