import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { verifyEventCityAccess } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Returns active staff in the event city for responsibility assignment. */
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const [canManageResponsibilities, canManageEvents] = await Promise.all([
    userHasCapability(auth.user, "events.responsibilities.manage"),
    userHasCapability(auth.user, "events.manage"),
  ]);
  if (!canManageResponsibilities && !canManageEvents) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const access = await verifyEventCityAccess(auth.user, id);
  if (access.error || !access.event) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const staff = await db.staffMeta.findMany({
    where: { isActive: true, user: { isActive: true } },
    take: 200,
    orderBy: { user: { name: "asc" } },
    select: {
      id: true,
      role: true,
      assignedCityId: true,
      assignedPark: { select: { cityId: true } },
      assignedGroup: {
        select: {
          park: { select: { cityId: true } },
          batch: { select: { cityId: true, park: { select: { cityId: true } } } },
        },
      },
      user: { select: { name: true } },
    },
  });

  const eventCityId = access.event.cityId;
  const data = staff
    .filter((member) => {
      const cityId =
        member.assignedCityId ||
        member.assignedPark?.cityId ||
        member.assignedGroup?.park?.cityId ||
        member.assignedGroup?.batch?.cityId ||
        member.assignedGroup?.batch?.park?.cityId;
      return cityId === eventCityId;
    })
    .map((member) => ({ id: member.id, name: member.user.name, role: member.role }));

  return NextResponse.json({ data });
}
