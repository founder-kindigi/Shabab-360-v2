import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyEventCityAccess } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createEventTeamSchema } from "@/lib/validations/event-team-planner";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("events.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const verified = await verifyEventCityAccess(user, id);
  if (verified.error || !verified.event) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const teams = await db.temporaryEventTeam.findMany({
    where: { eventId: id, isActive: true },
    include: {
      memberships: {
        where: { isActive: true },
        include: {
          staffMeta: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
    },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(teams);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("events.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const verified = await verifyEventCityAccess(user, id);
  if (verified.error || !verified.event) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createEventTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const team = await db.temporaryEventTeam.create({
    data: {
      eventId: id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      isActive: true,
    },
  });

  await logAudit({
    userId: user.id,
    action: "event.team.create",
    entityType: "TemporaryEventTeam",
    entityId: team.id,
    newValues: { eventId: id, title: team.title },
  });

  return NextResponse.json(team, { status: 201 });
}
