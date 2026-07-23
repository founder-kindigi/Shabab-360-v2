import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/authorize";
import type { SessionUser } from "@/lib/auth/scope";
import { SENSITIVE_PROFILE_FIELDS } from "@/lib/student-profile/zod";

export async function GET() {
  const auth = await requireCapability("students.profile.view");
  if (auth instanceof NextResponse) return auth;

  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.id || user.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const participant = await db.participant.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!participant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const profile = await db.studentExtendedProfile.findUnique({
    where: { participantId: participant.id },
  });
  if (!profile) return NextResponse.json(null, { status: 200 });

  // Strip sensitive fields — student never sees wellbeing data
  const result = { ...profile } as Record<string, unknown>;
  for (const field of SENSITIVE_PROFILE_FIELDS) {
    delete result[field];
  }
  return NextResponse.json(result);
}
