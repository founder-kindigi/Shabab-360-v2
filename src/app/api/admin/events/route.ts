import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createEventSchema, getEventsQuerySchema } from "@/lib/validations/event";

export async function GET(request: NextRequest) {
  const auth = await requireCapability("events.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const url = new URL(request.url);
  const queryData = {
    cityId: url.searchParams.get("cityId") || undefined,
    status: url.searchParams.get("status") || undefined,
    eventType: url.searchParams.get("eventType") || undefined,
    limit: url.searchParams.has("limit") ? url.searchParams.get("limit") : undefined,
    offset: url.searchParams.has("offset") ? url.searchParams.get("offset") : undefined,
  };

  const parsedQuery = getEventsQuerySchema.safeParse(queryData);
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { cityId: requestedCityId, status: statusParam, eventType: eventTypeParam, limit, offset } = parsedQuery.data;

  const resolved = await resolveActorCity(user, requestedCityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json({ error: resolved.error || "City resolution failed" }, { status: resolved.status || 400 });
  }

  const canManage = await userHasCapability(user, "events.manage");

  const where: any = {
    cityId: resolved.cityId,
  };

  if (!canManage) {
    if (statusParam === "planned") {
      return NextResponse.json([]);
    }
    if (statusParam) {
      where.status = statusParam;
    } else {
      where.status = { not: "planned" };
    }
  } else {
    if (statusParam) {
      where.status = statusParam;
    }
  }

  if (eventTypeParam) {
    where.eventType = eventTypeParam;
  }

  const events = await db.event.findMany({
    where,
    orderBy: { startDate: "desc" },
    take: limit,
    skip: offset,
    include: {
      city: { select: { id: true, name: true, code: true } },
      _count: { select: { teams: true, responsibilities: true, plannerItems: true } },
    },
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const auth = await requireCapability("events.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const resolved = await resolveActorCity(user, data.cityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json({ error: resolved.error || "City resolution failed" }, { status: resolved.status || 400 });
  }

  const event = await db.event.create({
    data: {
      cityId: resolved.cityId,
      title: data.title,
      description: data.description || null,
      eventType: data.eventType,
      status: data.status || "planned",
      venue: data.venue || null,
      venueNotes: data.venueNotes || null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      capacity: data.capacity ?? null,
      cost: data.cost ?? 0,
      requiresConsent: data.requiresConsent ?? false,
      requiresMedical: data.requiresMedical ?? false,
      createdBy: user.id!,
    },
  });

  await logAudit({
    userId: user.id,
    action: "event.create",
    entityType: "Event",
    entityId: event.id,
    newValues: {
      id: event.id,
      cityId: event.cityId,
      title: event.title,
      eventType: event.eventType,
      status: event.status,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
