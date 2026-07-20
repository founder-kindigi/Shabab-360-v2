import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email-service";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ALL_ROLES = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
  "murabbi",
  "guardian",
  "student",
] as const;

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  role: z.enum(ALL_ROLES),
  assignedCityId: z.string().optional(),
  assignedParkId: z.string().optional(),
  assignedGroupId: z.string().optional(),
});

// Roles that require city assignment
const CITY_REQUIRED_ROLES = ["city_head", "park_admin", "park_lead", "murabbi"];
// Roles that require park assignment
const PARK_REQUIRED_ROLES = ["park_admin", "park_lead", "murabbi"];
// Roles that require group assignment
const GROUP_REQUIRED_ROLES = ["murabbi"];
const CITY_HEAD_ASSIGNABLE_ROLES = ["park_admin", "park_lead", "murabbi"] as const;

export async function POST(request: NextRequest) {
  // Auth check
  const authError = await requireRole(["super_admin", "program_admin", "city_head"]);
  if (authError) return authError;

  const auth = await requireCapability("access.scope.manage");
  const cityHeadAuth = await requireCapability("access.city_staff.manage");
  const isCityHead = !(cityHeadAuth instanceof NextResponse) && cityHeadAuth.user.role === "city_head";
  if (!isCityHead && auth instanceof NextResponse) return auth;
  if (isCityHead && !cityHeadAuth.user.assignedCityId) {
    return NextResponse.json({ error: "City Head scope is missing" }, { status: 403 });
  }
  const actorUserId = isCityHead
    ? (cityHeadAuth as { user: { id: string } }).user.id
    : (auth as { user: { id: string } }).user.id;

  // Parse and validate body
  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, phone, role, assignedCityId, assignedParkId, assignedGroupId } = parsed.data;

  if (isCityHead) {
    if (!CITY_HEAD_ASSIGNABLE_ROLES.includes(role as (typeof CITY_HEAD_ASSIGNABLE_ROLES)[number])) {
      return NextResponse.json({ error: "City Heads can only provision Park Leads, Park Admins, and Murabbis" }, { status: 403 });
    }
    if (assignedCityId !== cityHeadAuth.user.assignedCityId) {
      return NextResponse.json({ error: "Staff must be assigned to your city" }, { status: 403 });
    }
  }

  // Validate role-scope requirements
  if (CITY_REQUIRED_ROLES.includes(role) && !assignedCityId) {
    return NextResponse.json(
      { error: { assignedCityId: ["City assignment is required for this role"] } },
      { status: 400 }
    );
  }

  if (PARK_REQUIRED_ROLES.includes(role) && !assignedParkId) {
    return NextResponse.json(
      { error: { assignedParkId: ["Park assignment is required for this role"] } },
      { status: 400 }
    );
  }

  if (GROUP_REQUIRED_ROLES.includes(role) && !assignedGroupId) {
    return NextResponse.json(
      { error: { assignedGroupId: ["Group assignment is required for this role"] } },
      { status: 400 }
    );
  }

  // Validate that assigned city exists
  if (assignedCityId) {
    const city = await db.city.findUnique({
      where: { id: assignedCityId, isActive: true },
    });
    if (!city) {
      return NextResponse.json(
        { error: { assignedCityId: ["Selected city does not exist"] } },
        { status: 400 }
      );
    }
  }

  // Validate that assigned park exists and belongs to city
  if (assignedParkId) {
    const parkWhere: any = { id: assignedParkId, isActive: true };
    if (assignedCityId) parkWhere.cityId = assignedCityId;
    const park = await db.park.findFirst({ where: parkWhere });
    if (!park) {
      return NextResponse.json(
        { error: { assignedParkId: ["Selected park does not exist or does not belong to the selected city"] } },
        { status: 400 }
      );
    }
  }

  // Validate that assigned group exists and belongs to park's batch
  if (assignedGroupId && assignedParkId) {
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

  // Check email uniqueness
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Display this once to the administrator; never persist it in a notification or audit log.
  const temporaryPassword = crypto.randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  // Create User + StaffMeta in a Prisma transaction
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

    // Re-fetch with staffMeta included
    return tx.user.findUnique({
      where: { id: createdUser.id },
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
    });
  });

  // Fire audit log
  await logAudit({
    userId: actorUserId,
    action: "create",
    entityType: "user",
    entityId: user!.id,
    newValues: { name, email, role, assignedCityId, assignedParkId, assignedGroupId },
  });

  // Queue an invitation notice without credentials.
  sendInviteEmail(
    { id: user!.id, email: user!.email, name: user!.name },
    role
  ).catch(() => {});

  return NextResponse.json({ user, temporaryPassword }, { status: 201 });
}
