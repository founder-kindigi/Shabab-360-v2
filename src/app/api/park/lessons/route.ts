import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

type SessionUser = {
  id?: string;
  role?: string;
};

const lessonSchema = z.object({
  parkId: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["Tarbiyah", "Activity"]),
  lessonDate: z.string().datetime(),
  driveLink: z.string().url().optional().or(z.literal("")),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.role || !["park_lead", "murabbi", "park_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parkId = searchParams.get("parkId");

  if (!parkId) {
    return NextResponse.json({ error: "Missing parkId parameter" }, { status: 400 });
  }

  try {
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
    const result = lessonSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;

    const lesson = await db.parkLesson.create({
      data: {
        parkId: data.parkId,
        title: data.title,
        type: data.type,
        lessonDate: new Date(data.lessonDate),
        driveLink: data.driveLink || null,
      },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error("POST /api/park/lessons error:", error);
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
  const parkId = searchParams.get("parkId");

  if (!id || !parkId) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    // Only delete if it belongs to the specified park
    await db.parkLesson.deleteMany({
      where: { id, parkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/park/lessons error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
