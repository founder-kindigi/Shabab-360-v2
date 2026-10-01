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

const lessonSchema = z.object({
  parkId: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  type: z.enum(["Tarbiyah", "Activity"]),
  lessonDate: z.string().datetime(),
  driveLink: z.string().max(2000).url().refine((value) => /^https?:\/\//i.test(value), "Only HTTP(S) URLs are supported").optional().or(z.literal("")),
});

export async function GET(request: Request) {
  const auth = await requireCapability("content.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const allowedRoles = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parkId = searchParams.get("parkId");

  if (!parkId) {
    return NextResponse.json({ error: "Missing parkId parameter" }, { status: 400 });
  }

  try {
    const scope = await resolveRequestedHierarchy(user, { parkId });
    if (scope instanceof NextResponse) return scope;
    const lessons = await db.parkLesson.findMany({
      where: { parkId },
      orderBy: { lessonDate: "desc" },
    });

    return NextResponse.json(lessons);
  } catch (error) {
    console.error("GET /api/park/lessons error:", error);
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
    const result = lessonSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;
    const scope = await resolveRequestedHierarchy(user, { parkId: data.parkId });
    if (scope instanceof NextResponse) return scope;
    if (scope.kind === "group") return NextResponse.json({ error: "Park content changes require park management scope" }, { status: 403 });

    const lesson = await db.$transaction(async (tx) => {
    const created = await tx.parkLesson.create({
      data: {
        parkId: data.parkId,
        title: data.title,
        type: data.type,
        lessonDate: new Date(data.lessonDate),
        driveLink: data.driveLink || null,
      },
    });

    await tx.auditLog.create({ data: createAuditLogData({ userId: user.id, action: "park.lessons.create", entityType: "parkLesson", entityId: created.id, newValues: { parkId: data.parkId } }) });
    return created;
    });
    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error("POST /api/park/lessons error:", error);
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
  const parkId = searchParams.get("parkId");

  if (!id || !parkId) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    return await db.$transaction(async (tx) => {
      const record = await tx.parkLesson.findUnique({ where: { id } });
      if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
      if (parkId !== record.parkId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const scope = await resolveRequestedHierarchy(user, { parkId: record.parkId }, tx);
      if (scope instanceof NextResponse) return scope;
      if (scope.kind === "group") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await tx.parkLesson.delete({ where: { id } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: user.id, action: "park.lessons.delete", entityType: "parkLesson", entityId: id }) });
      return NextResponse.json({ success: true });
    });
  } catch (error) {
    console.error("DELETE /api/park/lessons error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
