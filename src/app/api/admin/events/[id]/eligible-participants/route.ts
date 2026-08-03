import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyEventCityAccess } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireCapability("events.manage");
  if (auth instanceof NextResponse) return auth;
  const access = await verifyEventCityAccess(auth.user, id);
  if (access.error || !access.event) return NextResponse.json({ error: access.error }, { status: access.status });

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80) return NextResponse.json({ error: "Search query must be 2 to 80 characters" }, { status: 400 });

  const participants = await db.participant.findMany({
    where: { state: "active", name: { contains: query }, group: { batch: { park: { cityId: access.event.cityId } } } },
    orderBy: { name: "asc" }, take: 20,
    select: { id: true, name: true, group: { select: { name: true } } },
  });
  return NextResponse.json({ data: participants.map((participant) => ({ id: participant.id, name: participant.name, groupName: participant.group?.name ?? "Unassigned" })) });
}
