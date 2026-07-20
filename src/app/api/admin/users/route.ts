import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  optionalQueryText,
  paginatedQuerySchema,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";

const userListQuerySchema = paginatedQuerySchema().extend({
  role: optionalQueryText(32),
  status: z.enum(["active", "inactive"]).optional(),
  search: optionalQueryText(),
  sort: z.enum(["name", "email", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const capabilityAuth = await requireCapability("people.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const query = userListQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const { role, status, search, page, pageSize, sort, order } = query.data;

  // Build where clause
  const where: any = {};

  if (role) {
    where.staffMeta = { ...where.staffMeta, role };
  }

  if (status === "active") {
    where.isActive = true;
  } else if (status === "inactive") {
    where.isActive = false;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  // Build orderBy
  const orderBy: any = { [sort]: order };

  const skip = (page - 1) * pageSize;

  const [users, totalItems] = await Promise.all([
    db.user.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        mustResetPwd: true,
        createdAt: true,
        staffMeta: {
          select: {
            id: true,
            role: true,
            assignedCityId: true,
            assignedParkId: true,
            assignedGroupId: true,
            isActive: true,
            assignedCity: { select: { id: true, name: true } },
            assignedPark: { select: { id: true, name: true } },
            assignedGroup: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    data: users,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  });
}

export async function POST() {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const capabilityAuth = await requireCapability("access.scope.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  return NextResponse.json(
    { error: "Use /api/admin/invite to create staff accounts" },
    { status: 410 }
  );
}
