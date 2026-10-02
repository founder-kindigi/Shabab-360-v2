import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { requireTrainingCity, requireTrainingReviewer } from "@/lib/training/access";
import { readBoundedJson, trainingError } from "@/lib/training/responses";
import { reviewActionSchema } from "@/lib/training/validation";

const transitions: Record<string, readonly string[]> = {
  submitted: ["under_review", "rejected"],
  under_review: ["accepted", "waitlisted", "rejected"],
  waitlisted: ["accepted", "rejected"],
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTrainingReviewer();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id || id.length > 80) return trainingError("Application not found", 404);
  let body: unknown;
  try { body = await readBoundedJson(request); } catch { return trainingError("Invalid request body", 400); }
  const parsed = reviewActionSchema.safeParse(body);
  if (!parsed.success) return trainingError("Invalid review action", 400);
  try {
    const application = await db.trainingApplication.findUnique({ where: { id }, select: { id: true, cohort: { select: { cityId: true } }, status: true, version: true } });
    if (!application || requireTrainingCity(auth.user, application.cohort.cityId)) return trainingError("Application not found", 404);
    if (application.version !== parsed.data.version) return trainingError("Application changed; reload and review again", 409);
    if (!transitions[application.status]?.includes(parsed.data.status)) return trainingError("Invalid status transition", 409);
    if (parsed.data.status === "rejected" && !parsed.data.reason?.trim()) return trainingError("A reason is required", 400);
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.trainingApplication.updateMany({ where: { id, version: application.version, status: application.status }, data: { status: parsed.data.status, version: { increment: 1 } } });
      if (updated.count !== 1) return null;
      await tx.trainingApplicationAction.create({ data: { applicationId: id, actorId: auth.user.id!, fromStatus: application.status, toStatus: parsed.data.status, reason: parsed.data.reason } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "training_application_review", entityType: "training_applications", entityId: id, oldValues: { status: application.status }, newValues: { status: parsed.data.status } }) });
      return { status: parsed.data.status, version: application.version + 1 };
    });
    if (!result) return trainingError("Application changed; reload and review again", 409);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return trainingError("Review could not be saved", 503); }
}
