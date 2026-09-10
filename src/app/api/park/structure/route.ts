import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { resolveRequestedHierarchy, groupParkWhere } from "@/lib/auth/hierarchy";
import { createAuditLogData } from "@/lib/audit";
import { z } from "zod";

type SessionUser = {
  id?: string;
  role?: string;
};

const ALLOWED_ROLES = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"];

const addStudentSchema = z.object({
  action: z.literal("add_student"),
  parkId: z.string().min(1),
  name: z.string().trim().min(1).max(150),
  groupId: z.string().trim().min(1).max(200),
  schoolClass: z.string().optional(),
  guardianContact: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parkId = searchParams.get("parkId");

  if (!parkId) {
    return NextResponse.json({ error: "Missing parkId parameter" }, { status: 400 });
  }

  try {
    const capability = await requireCapability("organisation.view", user);
    if (capability instanceof NextResponse) return capability;
    const scope = await resolveRequestedHierarchy(user, { parkId });
    if (scope instanceof NextResponse) return scope;
    const park = await db.park.findUnique({ where: { id: parkId }, include: { parkStaff: { where: { isActive: true }, include: { user: { select: { id: true, name: true, phone: true } } } } } });
    const scopedGroups = await db.group.findMany({
      where: { ...groupParkWhere(parkId), ...(scope.groupId ? { id: scope.groupId } : {}), isActive: true, batch: { isActive: true } },
      include: { batch: { select: { name: true } }, participants: { where: { state: "active" }, select: { id: true, name: true, phone: true, groupId: true } }, murabbis: { where: { isActive: true }, include: { user: { select: { id: true, name: true, phone: true } } } } },
    });

    if (!park) {
      return NextResponse.json({ error: "Park not found" }, { status: 404 });
    }

    // Collect all groups and participants
    const groups: Array<{ id: string; name: string }> = [];
    const students: Array<{
      id: string;
      name: string;
      murabbi: string;
      year: string;
      groupId: string;
      phone?: string | null;
      address?: string | null;
    }> = [];

    const murabbiMap = new Map<string, { id: string; name: string; studentsCount: number; phone: string }>();

    // Do not fabricate staff identities when a park has no assignment.
    let headMurabbi = { name: "Unassigned", studentsCount: 0, phone: "" };
    let parkAdmin = { name: "Unassigned", studentsCount: 0, phone: "" };

    for (const staff of park.parkStaff) {
      if (staff.role === "head_murabbi" || staff.role === "park_lead") {
        headMurabbi = {
          name: staff.user?.name || "Unassigned",
          studentsCount: 0,
          phone: staff.user?.phone || "",
        };
      } else if (staff.role === "park_admin") {
        parkAdmin = {
          name: staff.user?.name || "Unassigned",
          studentsCount: 0,
          phone: staff.user?.phone || "",
        };
      }
    }

    for (const group of scopedGroups) {
      const batch = group.batch;
      {
        groups.push({ id: group.id, name: group.name });
        const murabbiName = group.murabbis[0]?.user?.name || group.name;

        // Populate murabbis
        for (const m of group.murabbis) {
          const u = m.user;
          if (u) {
            const existing = murabbiMap.get(u.id);
            if (existing) {
              existing.studentsCount += group.participants.length;
            } else {
              murabbiMap.set(u.id, {
                id: u.id,
                name: u.name || "Murabbi",
                studentsCount: group.participants.length,
                phone: u.phone || "",
              });
            }
          }
        }

        // Populate students
        for (const p of group.participants) {
          students.push({
            id: p.id,
            name: p.name,
            murabbi: murabbiName,
            year: batch.name.includes("Batch") ? batch.name : "1st Year",
            groupId: group.id,
            phone: p.phone,

          });
        }
      }
    }

    const murabbis = Array.from(murabbiMap.values());

    return NextResponse.json({
      headMurabbi,
      parkAdmin,
      murabbis,
      students,
      groups,
      totalStudents: students.length,
      totalMurabbis: murabbis.length,
    });
  } catch (error) {
    console.error("GET /api/park/structure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    if (body.action === "add_student") {
      const parsed = addStudentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const capability = await requireCapability("students.manage", user);
      if (capability instanceof NextResponse) return capability;
      const targetGroupId = parsed.data.groupId;
      return await db.$transaction(async (tx) => {
      const scope = await resolveRequestedHierarchy(user, { parkId: parsed.data.parkId, groupId: targetGroupId }, tx);
      if (scope instanceof NextResponse) return scope;
      const participant = await tx.participant.create({
        data: {
          name: parsed.data.name,
          groupId: targetGroupId,
          address: parsed.data.address || null,
          phone: parsed.data.guardianContact || null,
          state: "active",
        },
      });

      await tx.auditLog.create({ data: createAuditLogData({ userId: user.id, action: "student.create", entityType: "Participant", entityId: participant.id, newValues: { groupId: targetGroupId } }) });
      return NextResponse.json({ success: true, participant }, { status: 201 });
      });
    }

    if (body.action === "add_murabbi") {
      return NextResponse.json(
        { error: "Staff provisioning is unavailable from Park Structure. Use authorized access provisioning." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/park/structure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
