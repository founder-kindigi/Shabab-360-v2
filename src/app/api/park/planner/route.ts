import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

type SessionUser = {
  id?: string;
  role?: string;
};

const plannerSchema = z.object({
  parkId: z.string().min(1),
  timeStart: z.string().min(1),
  timeEnd: z.string().min(1),
  activity: z.string().min(1),
  pdfLink: z.string().url().optional().or(z.literal("")),
  isSpecialEvent: z.boolean().default(false),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parkId = searchParams.get("parkId");

  if (!parkId) {
    return NextResponse.json({ error: "Missing parkId parameter" }, { status: 400 });
  }

  try {
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
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "park_lead") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = plannerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;

    const slot = await db.parkRoutineSlot.create({
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

    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    console.error("POST /api/park/planner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "park_lead") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    await db.parkRoutineSlot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/park/planner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
