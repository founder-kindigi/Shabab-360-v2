import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { isStaffActiveTeamMember } from "@/lib/auth/team-scope";
import { db } from "@/lib/db";
import { createChatMessageSchema } from "@/lib/validations/teams";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireCapability("teams.workspace.view");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId } = await params;

  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: auth.user.id },
  });

  if (!staffMeta || !(await isStaffActiveTeamMember(staffMeta.id, teamId))) {
    return NextResponse.json({ error: "Active team membership required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cursorParam = searchParams.get("cursor");
  const limitParam = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);

  const whereClause: {
    teamId: string;
    isDeleted: boolean;
    createdAt?: { gt: Date };
  } = {
    teamId,
    isDeleted: false,
  };

  if (cursorParam) {
    const cursorDate = new Date(cursorParam);
    if (!isNaN(cursorDate.getTime())) {
      whereClause.createdAt = { gt: cursorDate };
    }
  }

  const messages = await db.teamChatMessage.findMany({
    where: whereClause,
    include: {
      author: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return NextResponse.json({ data: messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireCapability("teams.workspace.view");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId } = await params;

  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: auth.user.id },
  });

  if (!staffMeta || !(await isStaffActiveTeamMember(staffMeta.id, teamId))) {
    return NextResponse.json({ error: "Active team membership required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createChatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  const message = await db.teamChatMessage.create({
    data: {
      teamId,
      authorId: staffMeta.id,
      content: parsed.data.content,
    },
    include: {
      author: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  await db.auditLog.create({
    data: {
      userId: auth.user.id,
      action: "send_team_chat_message",
      entityType: "TeamChatMessage",
      entityId: message.id,
      newValues: JSON.stringify({ contentLength: parsed.data.content.length }),
      reason: "Sent team chat message",
    },
  });

  return NextResponse.json({ data: message }, { status: 201 });
}
