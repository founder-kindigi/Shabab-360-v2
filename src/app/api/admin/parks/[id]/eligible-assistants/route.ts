import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { MAX_IDENTIFIER_LENGTH } from "@/lib/api/query-params";
import { db } from "@/lib/db";

const parkIdSchema = z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH);
const ASSISTANT_DIRECTORY_ROLES = ["super_admin", "program_admin"] as const;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Returns only the minimal directory data needed to link a Muawin to staff in
 * the same park. A Park Lead is eligible only when they also teach a group.
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  if (!ASSISTANT_DIRECTORY_ROLES.includes(auth.user.role as (typeof ASSISTANT_DIRECTORY_ROLES)[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const capability = await requireCapability("access.scope.manage", auth.user);
  if (capability instanceof NextResponse) return capability;

  const parsedParkId = parkIdSchema.safeParse((await context.params).id);
  if (!parsedParkId.success) {
    return NextResponse.json({ error: "Invalid park identifier" }, { status: 400 });
  }

  const staff = await db.staffMeta.findMany({
    where: {
      isActive: true,
      assignedParkId: parsedParkId.data,
      user: { isActive: true },
      OR: [
        { role: "murabbi" },
        {
          role: "park_lead",
          assignedGroupId: { not: null },
          assignedGroup: { parkId: parsedParkId.data },
        },
      ],
    },
    select: {
      id: true,
      role: true,
      user: { select: { name: true } },
    },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
  });

  return NextResponse.json({
    data: staff.map((member) => ({ id: member.id, name: member.user.name, role: member.role })),
  });
}
