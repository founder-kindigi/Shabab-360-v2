import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import type { UserRole } from "@/types";

const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const role = searchParams.get("role") || undefined;
  const cityId = searchParams.get("cityId") || undefined;
  const isActiveParam = searchParams.get("isActive");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  // Build where clause
  const where: Record<string, unknown> = {
    staffMeta: { isNot: null },
  };

  // Search across name, email, phone
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  // Filter by role
  if (role) {
    (where.staffMeta as Record<string, unknown>).role = role;
  }

  // Filter by city
  if (cityId) {
    (where.staffMeta as Record<string, unknown>).assignedCityId = cityId;
  }

  // Filter by active status
  if (isActiveParam === "true") {
    (where.staffMeta as Record<string, unknown>).isActive = true;
    where.isActive = true;
  } else if (isActiveParam === "false") {
    (where.staffMeta as Record<string, unknown>).isActive = false;
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
        createdAt: true,
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