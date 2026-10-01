import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveRequestedHierarchy, groupHierarchyInclude, groupResourceScope, groupParkWhere } from "@/lib/auth/hierarchy";
import { createAuditLogData } from "@/lib/audit";
import { z } from "zod";

type SessionUser = {
  id?: string;
  role?: string;
};

const plannerSchema = z.object({
  parkId: z.string().trim().min(1).max(200),
  timeStart: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  timeEnd: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  activity: z.string().trim().min(1).max(200),
  pdfLink: z.string().max(2000).url().refine((value) => /^https?:\/\//i.test(value), "Only HTTP(S) URLs are supported").optional().or(z.literal("")),
  isSpecialEvent: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10000).optional(),
}).refine(data => data.timeEnd > data.timeStart, { message: "End time must be later than start time", path: ["timeEnd"] });

export async function GET(request: Request) {
  const auth = await requireCapability("content.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const parkId = searchParams.get("parkId");

  if (!parkId) {
    return NextResponse.json({ error: "Missing parkId parameter" }, { status: 400 });
  }

  try {
    const scope = await resolveRequestedHierarchy(user, { parkId });
    if (scope instanceof NextResponse) return scope;
    const slots = await db.parkRoutineSlot.findMany({
      where: { parkId },
      orderBy: { sortOrder: "asc" },
    });

    const routineSlots = slots.filter((s) => !s.isSpecialEvent);
    const specialEvents = slots.filter((s) => s.isSpecialEvent);

    return NextResponse.json({ routineSlots, specialEvents });
  } catch (error) {
    console.error("GET /api/park/planner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCapability("content.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const allowedRoles = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    const result = plannerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;
    const scope = await resolveRequestedHierarchy(user, { parkId: data.parkId });
    if (scope instanceof NextResponse) return scope;
    if (scope.kind === "group") return NextResponse.json({ error: "Park content changes require park management scope" }, { status: 403 });

    const slot = await db.$transaction(async (tx) => {
    const created = await tx.parkRoutineSlot.create({
      data: {
        parkId: data.parkId,
        timeStart: data.timeStart,
        timeEnd: data.timeEnd,
        activity: data.activity,
        pdfLink: data.pdfLink || null,
        isSpecialEvent: data.isSpecialEvent,
        sortOrder: data.sortOrder || 0,
      },
    });

    await tx.auditLog.create({ data: createAuditLogData({ userId: user.id, action: "park.planner.create", entityType: "parkRoutineSlot", entityId: created.id, newValues: { parkId: data.parkId } }) });
    return created;
    });
    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    console.error("POST /api/park/planner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireCapability("content.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const allowedRoles = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    return await db.$transaction(async (tx) => {
      const record = await tx.parkRoutineSlot.findUnique({ where: { id } });
      if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

      const scope = await resolveRequestedHierarchy(user, { parkId: record.parkId }, tx);
      if (scope instanceof NextResponse) return scope;
      if (scope.kind === "group") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await tx.parkRoutineSlot.delete({ where: { id } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: user.id, action: "park.planner.delete", entityType: "parkRoutineSlot", entityId: id }) });
      return NextResponse.json({ success: true });
    });
  } catch (error) {
    console.error("DELETE /api/park/planner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
