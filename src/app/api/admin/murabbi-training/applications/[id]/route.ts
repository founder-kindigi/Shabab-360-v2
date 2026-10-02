import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTrainingCity, requireTrainingReviewer } from "@/lib/training/access";
import { privateHeaders, trainingError } from "@/lib/training/responses";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTrainingReviewer();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id || id.length > 80) return trainingError("Application not found", 404);
  try {
    const application = await db.trainingApplication.findUnique({ where: { id }, select: {
      id: true, reference: true, fullName: true, phone: true, email: true, dateOfBirth: true,
      locality: true, background: true, connection: true, motivation: true, availability: true,
      privacyVersion: true, status: true, version: true, createdAt: true,
      cohort: { select: { id: true, title: true, cityId: true } },
      actions: { orderBy: { createdAt: "asc" }, select: { fromStatus: true, toStatus: true, reason: true, actorId: true, createdAt: true } },
    } });
    if (!application || requireTrainingCity(auth.user, application.cohort.cityId)) return trainingError("Application not found", 404);
    return NextResponse.json({ data: application }, { headers: privateHeaders });
  } catch { return trainingError("Application is temporarily unavailable", 503); }
}
