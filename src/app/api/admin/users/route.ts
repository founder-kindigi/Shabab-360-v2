import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { StaffRole } from "@/types";

const VALID_ROLES: StaffRole[] = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
  "murabbi",
];

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  role: z.enum(VALID_ROLES, { errorMap: () => ({ message: "Invalid role" }) }),
  assignedCityId: z.string().optional(),
  assignedParkId: z.string().optional(),
  assignedGroupId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";

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
  const allowedSortFields = ["name", "email", "createdAt"] as const;
  const sortField = allowedSortFields.includes(sort as any) ? sort : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";
  const orderBy: any = { [sortField]: sortOrder };

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

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password, phone, role, assignedCityId, assignedParkId, assignedGroupId } = parsed.data;

  // Check email uniqueness
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Validate role-based assignments
  if (["city_head", "park_admin", "park_lead", "murabbi"].includes(role)) {
    if (!assignedCityId) {
      return NextResponse.json(
        { error: { assignedCityId: ["City assignment is required for this role"] } },
        { status: 400 }
      );
    }
  }

  if (["park_admin", "park_lead", "murabbi"].includes(role)) {
    if (!assignedParkId) {
      return NextResponse.json(
        { error: { assignedParkId: ["Park assignment is required for this role"] } },
        { status: 400 }
      );
    }
  }

  if (role === "murabbi" && !assignedGroupId) {
    return NextResponse.json(
      { error: { assignedGroupId: ["Group assignment is required for murabbi role"] } },
      { status: 400 }
    );
  }

  // Validate park belongs to city
  if (assignedCityId && assignedParkId) {
    const park = await db.park.findUnique({
      where: { id: assignedParkId, cityId: assignedCityId, isActive: true },
    });
    if (!park) {
      return NextResponse.json(
        { error: { assignedParkId: ["Selected park does not belong to the selected city"] } },
        { status: 400 }
      );
    }
  }

  // Validate group belongs to park's batch
  if (assignedParkId && assignedGroupId) {
    const parkWithBatches = await db.park.findUnique({
      where: { id: assignedParkId },
      include: { batches: { where: { isActive: true }, select: { id: true } } },
    });
    if (parkWithBatches) {
      const batchIds = parkWithBatches.batches.map((b) => b.id);
      const group = await db.group.findFirst({
        where: { id: assignedGroupId, batchId: { in: batchIds }, isActive: true },
      });
      if (!group) {
        return NextResponse.json(
          { error: { assignedGroupId: ["Selected group does not belong to the selected park"] } },
          { status: 400 }
        );
      }
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user + staffMeta in transaction
  const user = await db.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone || null,
        mustResetPwd: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        mustResetPwd: true,
        createdAt: true,
      },
    });

    await tx.staffMeta.create({
      data: {
        userId: createdUser.id,
        role,
        assignedCityId: assignedCityId || null,
        assignedParkId: assignedParkId || null,
        assignedGroupId: assignedGroupId || null,
      },
    });

    return createdUser;
  });

  // Fire audit log
  const authAgain = await requireAuth();
  if (!(authAgain instanceof NextResponse)) {
    await logAudit({
      userId: authAgain.user.id,
      action: "create",
      entityType: "user",
      entityId: user.id,
      newValues: { name, email, role, assignedCityId, assignedParkId, assignedGroupId },
    });
  }

  return NextResponse.json(user, { status: 201 });
}