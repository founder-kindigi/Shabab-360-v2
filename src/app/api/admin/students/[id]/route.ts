import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { participantProfileFieldsSchema } from "@/lib/participants/profile-fields";

const updateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  state: z.string().optional(),
  groupId: z.string().min(1, "Group is required").optional(),
}).merge(participantProfileFieldsSchema);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("students.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  const existing = await db.participant.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data: any = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone || null;
  if (parsed.data.gender !== undefined) data.gender = parsed.data.gender || null;
  if (parsed.data.dateOfBirth !== undefined)
    data.dateOfBirth = parsed.data.dateOfBirth
      ? new Date(parsed.data.dateOfBirth)
      : null;
  if (parsed.data.age !== undefined) data.age = parsed.data.age;
  if (parsed.data.gradeClass !== undefined) data.gradeClass = parsed.data.gradeClass;
  if (parsed.data.state !== undefined) data.state = parsed.data.state;
  const revokeUserSession = parsed.data.state === "inactive" && existing.state !== "inactive" && existing.userId;
  if (revokeUserSession) {
    data.user = { update: { tokenVersion: { increment: 1 } } };
  }
  if (parsed.data.groupId !== undefined) {
    const group = await db.group.findUnique({
      where: { id: parsed.data.groupId, isActive: true },
    });
    if (!group) {
      return NextResponse.json(
        { error: { groupId: ["Selected group not found or inactive"] } },
        { status: 400 }
      );
    }
    data.groupId = parsed.data.groupId;
  }

  const participant = await db.participant.update({
    where: { id },
    data,
  });

  await logAudit({
    userId: auth.user.id,
    action: "update",
    entityType: "participant",
    entityId: id,
    oldValues: {
      name: existing.name,
      phone: existing.phone,
      gender: existing.gender,
      age: existing.age,
      gradeClass: existing.gradeClass,
      state: existing.state,
      groupId: existing.groupId,
    },
    newValues: data,
  });

  return NextResponse.json(participant);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("students.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  const existing = await db.participant.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  const participant = await db.participant.update({
    where: { id },
    data: {
      state: "inactive",
      ...(existing.userId
        ? { user: { update: { tokenVersion: { increment: 1 } } } }
        : {}),
    },
  });

  await logAudit({
    userId: auth.user.id,
    action: "delete",
    entityType: "participant",
    entityId: id,
    oldValues: { name: existing.name, state: existing.state },
    newValues: { state: "inactive" },
  });

  return NextResponse.json(participant);
}
