import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { fromPKT } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || undefined;
  const entityType = searchParams.get("entityType") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const search = searchParams.get("search") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";

  // Support both page/pageSize and limit/offset
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)), 100);
  const legacyLimit = Math.min(Number(searchParams.get("limit") || 0), 200);
  const legacyOffset = Number(searchParams.get("offset") || 0);

  // If legacy limit/offset are used, use them; otherwise use page/pageSize
  const limit = legacyLimit > 0 ? legacyLimit : pageSize;
  const offset = legacyLimit > 0 ? legacyOffset : (page - 1) * pageSize;

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

  // Build orderBy
  const allowedSortFields = ["createdAt", "action", "entityType"] as const;
  const sortField = allowedSortFields.includes(sort as any) ? sort : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";
  const orderBy: Record<string, string> = { [sortField]: sortOrder };

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
  const effectivePage = legacyLimit > 0 ? Math.floor(legacyOffset / limit) + 1 : page;

  return NextResponse.json({
    data: logs,
    pagination: {
      page: effectivePage,
      pageSize: limit,
      totalItems,
      totalPages,
    },
  });
}