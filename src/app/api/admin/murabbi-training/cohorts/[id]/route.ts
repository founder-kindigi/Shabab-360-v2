import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { requireTrainingCity, requireTrainingReviewer } from "@/lib/training/access";
import { privateHeaders, readBoundedJson, trainingError } from "@/lib/training/responses";
import { cohortDraftUpdateSchema } from "@/lib/training/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const auth = await requireTrainingReviewer();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id || id.length > 80) return trainingError("Cohort not found", 404);
  try {
    const cohort = await db.trainingCohort.findUnique({ where: { id }, select: {
      id: true, slug: true, cityId: true, title: true, summary: true, eligibilityText: true, feeText: true,
      privacyNotice: true, registrationStart: true, registrationEnd: true, capacity: true, status: true,
      policyVersion: true, version: true, createdAt: true, updatedAt: true,
    } });
    if (!cohort || requireTrainingCity(auth.user, cohort.cityId)) return trainingError("Cohort not found", 404);
    return NextResponse.json({ data: cohort }, { headers: privateHeaders });
  } catch { return trainingError("Cohort is temporarily unavailable", 503); }
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireTrainingReviewer();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id || id.length > 80) return trainingError("Cohort not found", 404);
  let body: unknown;
  try { body = await readBoundedJson(request); } catch { return trainingError("Invalid request body", 400); }
  const parsed = cohortDraftUpdateSchema.safeParse(body);
  if (!parsed.success) return trainingError("Invalid cohort changes", 400);
  try {
    const existing = await db.trainingCohort.findUnique({ where: { id } });
    if (!existing || requireTrainingCity(auth.user, existing.cityId)) return trainingError("Cohort not found", 404);
    if (existing.status !== "draft") return trainingError("Only draft cohorts can be edited", 409);
    if (existing.version !== parsed.data.version) return trainingError("Cohort changed; reload and review again", 409);
    const { version, ...changes } = parsed.data;
    const start = changes.registrationStart === undefined ? existing.registrationStart : changes.registrationStart ? new Date(changes.registrationStart) : null;
    const end = changes.registrationEnd === undefined ? existing.registrationEnd : changes.registrationEnd ? new Date(changes.registrationEnd) : null;
    if (start && end && start >= end) return trainingError("Registration end must follow start", 400);
    const policyChanged = ["eligibilityText", "feeText", "privacyNotice"].some((key) => key in changes);
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.trainingCohort.updateMany({ where: { id, version, status: "draft" }, data: {
        ...changes, registrationStart: start, registrationEnd: end,
        version: { increment: 1 }, ...(policyChanged ? { policyVersion: { increment: 1 } } : {}),
      } });
      if (updated.count !== 1) return null;
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "training_cohort_draft_update", entityType: "training_cohorts", entityId: id, newValues: { changedFields: Object.keys(changes) } }) });
      return { version: version + 1, policyVersion: existing.policyVersion + (policyChanged ? 1 : 0) };
    });
    if (!result) return trainingError("Cohort changed; reload and review again", 409);
    return NextResponse.json(result, { headers: privateHeaders });
  } catch { return trainingError("Cohort changes could not be saved", 503); }
}
