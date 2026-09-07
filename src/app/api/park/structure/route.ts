import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

type SessionUser = {
  id?: string;
  role?: string;
};

const ALLOWED_ROLES = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"];

const addStudentSchema = z.object({
  action: z.literal("add_student"),
  parkId: z.string().min(1),
  name: z.string().min(1),
  groupId: z.string().optional(),
  schoolClass: z.string().optional(),
  guardianContact: z.string().optional(),
  address: z.string().optional(),
});

const addMurabbiSchema = z.object({
  action: z.literal("add_murabbi"),
  parkId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["Murabbi", "Muawin", "Head Murabbi", "Park Admin"]).default("Murabbi"),
  phone: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parkId = searchParams.get("parkId");

  if (!parkId) {
    return NextResponse.json({ error: "Missing parkId parameter" }, { status: 400 });
  }

  try {
    const park = await db.park.findUnique({
      where: { id: parkId },
      include: {
        batches: {
          include: {
            groups: {
              include: {
                participants: {
                  where: { state: "active" },
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    address: true,
                    groupId: true,
                  },
                },
                murabbis: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true, phone: true },
                    },
                  },
                },
              },
            },
          },
        },
        parkStaff: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
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

    // Check park staff
    let headMurabbi = { name: "Ahmed Khan", studentsCount: 0, phone: "0300-1234567" };
    let parkAdmin = { name: "Salman Ali", studentsCount: 0, phone: "0300-7654321" };

    for (const staff of park.parkStaff) {
      if (staff.role === "head_murabbi" || staff.role === "park_lead") {
        headMurabbi = {
          name: staff.user?.name || "Ahmed Khan",
          studentsCount: 0,
          phone: staff.user?.phone || "0300-1234567",
        };
      } else if (staff.role === "park_admin") {
        parkAdmin = {
          name: staff.user?.name || "Salman Ali",
          studentsCount: 0,
          phone: staff.user?.phone || "0300-7654321",
        };
      }
    }

    for (const batch of park.batches) {
      for (const group of batch.groups) {
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
                phone: u.phone || "0300-0000000",
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
            address: p.address,
          });
        }
      }
    }

    // Default sample murabbis if database has none assigned to groups
    let murabbis = Array.from(murabbiMap.values());
    if (murabbis.length === 0) {
      murabbis = [
        { id: "m1", name: "Hassan Safi", studentsCount: 12, phone: "0300-2345678" },
        { id: "m2", name: "Zaid Omar", studentsCount: 10, phone: "0300-3456789" },
        { id: "m3", name: "Bilal Tariq", studentsCount: 11, phone: "0300-4567890" },
        { id: "m4", name: "Usman Ghani", studentsCount: 12, phone: "0300-5678901" },
        { id: "m5", name: "Hamza Farooq", studentsCount: 12, phone: "0300-6789012" },
        { id: "m6", name: "Abdullah Malik", studentsCount: 12, phone: "0300-7890123" },
      ];
    }

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
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.action === "add_student") {
      const parsed = addStudentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      // If groupId is not specified, find first group in park
      let targetGroupId = parsed.data.groupId;
      if (!targetGroupId) {
        const group = await db.group.findFirst({
          where: { batch: { parkId: parsed.data.parkId } },
        });
        if (!group) {
          return NextResponse.json({ error: "No group found in park to assign student" }, { status: 400 });
        }
        targetGroupId = group.id;
      }

      const participant = await db.participant.create({
        data: {
          name: parsed.data.name,
          groupId: targetGroupId,
          address: parsed.data.address || null,
          phone: parsed.data.guardianContact || null,
          state: "active",
        },
      });

      return NextResponse.json({ success: true, participant }, { status: 201 });
    }

    if (body.action === "add_murabbi") {
      const parsed = addMurabbiSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      // Create or find User
      let targetUser = await db.user.findUnique({
        where: { email: parsed.data.email },
      });

      if (!targetUser) {
        targetUser = await db.user.create({
          data: {
            email: parsed.data.email,
            name: parsed.data.name,
            phone: parsed.data.phone || null,
            passwordHash: "$2a$12$placeholderHashForStaff1234567890",
            mustResetPwd: true,
          },
        });
      }

      // Create or update StaffMeta
      const mappedRole = parsed.data.role === "Head Murabbi" ? "head_murabbi"
        : parsed.data.role === "Park Admin" ? "park_admin"
        : parsed.data.role === "Muawin" ? "muawin"
        : "murabbi";

      await db.staffMeta.upsert({
        where: { userId: targetUser.id },
        update: {
          role: mappedRole,
          assignedParkId: parsed.data.parkId,
        },
        create: {
          userId: targetUser.id,
          role: mappedRole,
          assignedParkId: parsed.data.parkId,
        },
      });

      return NextResponse.json({ success: true, user: targetUser }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/park/structure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
