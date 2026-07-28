import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { revokeResponsibilitySchema } from "@/lib/validations/event-responsibility";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return handleRevoke(request, await params);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return handleRevoke(request, await params);
}

async function handleRevoke(request: NextRequest, { id }: { id: string }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const canManageResp = await userHasCapability(user, "events.responsibilities.manage");
  const canManageEvent = await userHasCapability(user, "events.manage");
  if (!canManageResp && !canManageEvent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const responsibility = await db.eventResponsibility.findUnique({
    where: { id },
  });

  if (!responsibility) {
    return NextResponse.json({ error: "Responsibility not found" }, { status: 404 });
  }

  if (!responsibility.isActive) {
    return NextResponse.json({ error: "Responsibility is already revoked or inactive" }, { status: 409 });
  }

  const resolved = await resolveActorCity(user, responsibility.cityId);
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = revokeResponsibilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const updated = await db.eventResponsibility.update({
    where: { id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedBy: user.id,
      revokedReason: parsed.data.revokedReason,
    },
  });

  await logAudit({
    userId: user.id,
    action: "event.responsibility.revoke",
    entityType: "EventResponsibility",
    entityId: id,
    oldValues: { isActive: responsibility.isActive },
    newValues: {
      isActive: false,
      revokedAt: updated.revokedAt,
      revokedBy: user.id,
      revokedReason: parsed.data.revokedReason,
    },
  });

  return NextResponse.json(updated);
}
