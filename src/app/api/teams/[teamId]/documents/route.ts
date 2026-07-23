import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { isStaffActiveTeamMember } from "@/lib/auth/team-scope";
import { db } from "@/lib/db";
import { registerDocumentLinkSchema } from "@/lib/validations/teams";

export async function GET(
  _request: Request,
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

  const documents = await db.teamDocumentLink.findMany({
    where: {
      teamId,
      isActive: true,
    },
    include: {
      createdBy: {
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: documents });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireCapability("teams.workspace.manage");
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

  const parsed = registerDocumentLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  // Security policy enforcement (TEAM-007 / Contract Section 5.1): Fail-closed by default
  return NextResponse.json(
    {
      error:
        "Document link registration is currently disabled pending security domain allowlist and open-redirect policy approval",
    },
    { status: 403 }
  );
}
