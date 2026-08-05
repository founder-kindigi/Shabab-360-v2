import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendTeamChatMessageSchema } from "@/lib/validations/team";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("organisation.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id: teamId } = await params;

  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
    select: { id: true, cityId: true, name: true, isActive: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, team.cityId);
  if (resolved.error || resolved.cityId !== team.cityId) {
    return NextResponse.json(
      { error: "Access denied: team is outside assigned scope" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

  const [messages, total] = await Promise.all([
    db.teamChatMessage.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    db.teamChatMessage.count({ where: { teamId } }),
  ]);

  const formatted = messages.map((m) => ({
    id: m.id,
    teamId: m.teamId,
    message: m.message,
    isFlagged: m.isFlagged,
    createdAt: m.createdAt,
    author: {
      id: m.author.id,
      name: m.author.user.name,
      email: m.author.user.email,
    },
  }));

  return NextResponse.json({
    team: { id: team.id, name: team.name, isActive: team.isActive },
    messages: formatted.reverse(), // Ascending chronological order for display
    total,
    limit,
    offset,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("organisation.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id: teamId } = await params;

  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
    select: { id: true, cityId: true, name: true, isActive: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (!team.isActive) {
    return NextResponse.json(
      { error: "Cannot send messages to an archived team." },
      { status: 400 }
    );
  }

  const resolved = await resolveActorCity(user, team.cityId);
  if (resolved.error || resolved.cityId !== team.cityId) {
    return NextResponse.json(
      { error: "Access denied: team is outside assigned scope" },
      { status: 403 }
    );
  }

  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!staffMeta) {
    return NextResponse.json(
      { error: "Staff meta profile required to send team chat messages" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = sendTeamChatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const messageRecord = await db.teamChatMessage.create({
    data: {
      teamId,
      authorId: staffMeta.id,
      message: parsed.data.message,
    },
    include: {
      author: {
        select: {
          id: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  logAudit({
    userId: user.id,
    action: "team.chat.create",
    entityType: "team_chat_message",
    entityId: messageRecord.id,
    newValues: {
      teamId,
      messageLength: messageRecord.message.length,
    },
  });

  return NextResponse.json(
    {
      id: messageRecord.id,
      teamId: messageRecord.teamId,
      message: messageRecord.message,
      isFlagged: messageRecord.isFlagged,
      createdAt: messageRecord.createdAt,
      author: {
        id: messageRecord.author.id,
        name: messageRecord.author.user.name,
        email: messageRecord.author.user.email,
      },
    },
    { status: 201 }
  );
}
