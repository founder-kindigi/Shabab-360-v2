import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { sendTeamChatMessageSchema, teamChatQuerySchema } from "@/lib/validations/team";

async function resolveChatAccess(user: { id: string }, teamId: string, cityId: string) {
  const resolved = await resolveActorCity(user as any, cityId);
  if (resolved.error || resolved.cityId !== cityId) {
    return { error: "Access denied: team is outside assigned scope", status: 403 } as const;
  }

  const [canManage, membership] = await Promise.all([
    userHasCapability(user as any, "organisation.manage"),
    db.staffTeamMembership.findFirst({
      where: {
        teamId,
        isActive: true,
        endedAt: null,
        staffMeta: { userId: user.id, isActive: true },
      },
      select: { staffMetaId: true },
    }),
  ]);

  return { canManage, membership } as const;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;
  if (!user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = { id: user.id };

  const { id: teamId } = await params;

  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
    select: { id: true, cityId: true, name: true, isActive: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const access = await resolveChatAccess(actor, teamId, team.cityId);
  if ("error" in access) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  if (!access.canManage && !access.membership) {
    return NextResponse.json({ error: "Forbidden: active team membership is required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsedQuery = teamChatQuerySchema.safeParse({
    limit: url.searchParams.get("limit") || undefined,
    offset: url.searchParams.get("offset") || undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Validation failed", details: parsedQuery.error.format() }, { status: 400 });
  }
  const { limit, offset } = parsedQuery.data;

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
            user: { select: { name: true } },
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
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;
  if (!user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = { id: user.id };

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

  const access = await resolveChatAccess(actor, teamId, team.cityId);
  if ("error" in access) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  if (!access.membership) {
    return NextResponse.json(
      { error: "Forbidden: active team membership is required to send messages" },
      { status: 403 }
    );
  }
  const membership = access.membership;

  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = sendTeamChatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const messageRecord = await db.$transaction(async (tx) => {
    const created = await tx.teamChatMessage.create({
      data: {
        teamId,
        authorId: membership.staffMetaId,
        message: parsed.data.message,
      },
      include: {
        author: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
    });
    await tx.auditLog.create({
      data: createAuditLogData({
        userId: user.id,
        action: "team.chat.create",
        entityType: "team_chat_message",
        entityId: created.id,
        newValues: { teamId, messageLength: created.message.length },
      }),
    });
    return created;
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
      },
    },
    { status: 201 }
  );
}
