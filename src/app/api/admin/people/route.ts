import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import type { UserRole } from "@/types";
import { z } from "zod";
import {
  optionalIdentifier,
  optionalQueryText,
  paginatedQuerySchema,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";

const PAGE_SIZE = 24;

const peopleQuerySchema = paginatedQuerySchema().extend({
  stats: z.literal("true").optional(),
  search: optionalQueryText(),
  role: optionalQueryText(32),
  cityId: optionalIdentifier(),
  parkId: optionalIdentifier(),
  isActive: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;
  const capabilityAuth = await requireCapability("people.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const query = peopleQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }

  // Stats-only mode
  if (query.data.stats) {
    return getStats();
  }

  const { search, role, cityId, parkId, isActive: isActiveParam, page } = query.data;

  // Build where clause
  const where: Record<string, unknown> = {
    staffMeta: { isNot: null },
  };

  // Search across name, email
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  // Build staffMeta where
  const metaWhere: Record<string, unknown> = {};

  // Filter by role
  if (role) {
    metaWhere.role = role;
  }

  // Filter by city
  if (cityId) {
    metaWhere.assignedCityId = cityId;
  }

  // Filter by park
  if (parkId) {
    metaWhere.assignedParkId = parkId;
  }

  // Filter by active status
  if (isActiveParam === "true") {
    metaWhere.isActive = true;
    where.isActive = true;
  } else if (isActiveParam === "false") {
    metaWhere.isActive = false;
  }

  // Merge metaWhere into where
  if (Object.keys(metaWhere).length > 0) {
    (where.staffMeta as Record<string, unknown>) = { ...metaWhere };
  }

  const [staff, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        mustResetPwd: true,
        createdAt: true,
        updatedAt: true,
        staffMeta: {
          select: {
            id: true,
            role: true,
            isActive: true,
            createdAt: true,
            assignedCity: {
              select: { id: true, name: true },
            },
            assignedPark: {
              select: { id: true, name: true },
            },
            assignedGroup: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    data: staff,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
}

async function getStats() {
  const allStaff = await db.user.findMany({
    where: { staffMeta: { isNot: null } },
    select: {
      isActive: true,
      staffMeta: {
        select: { isActive: true, role: true },
      },
    },
  });

  const total = allStaff.length;
  const active = allStaff.filter(
    (s) => s.isActive && s.staffMeta?.isActive
  ).length;
  const inactive = total - active;

  // Count by role
  const roleMap = new Map<string, number>();
  for (const s of allStaff) {
    const r = s.staffMeta?.role;
    if (!r) continue;
    roleMap.set(r, (roleMap.get(r) || 0) + 1);
  }
  const byRole = Array.from(roleMap.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ total, active, inactive, byRole });
}
