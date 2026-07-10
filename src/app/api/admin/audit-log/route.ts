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
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const offset = Number(searchParams.get("offset") || 0);

  const where: Record<string, unknown> = {};

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;

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

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

  return NextResponse.json({ data: logs, total });
}