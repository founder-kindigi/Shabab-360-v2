import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cohortCreateSchema, cohortListSchema, queryObject } from "@/lib/training/validation";
import { requireTrainingCity, requireTrainingReviewer, reviewerCity } from "@/lib/training/access";
import { privateHeaders, readBoundedJson, trainingError } from "@/lib/training/responses";
import { createAuditLogData } from "@/lib/audit";

export async function GET(request: Request) {
  const auth = await requireTrainingReviewer();
  if (auth instanceof NextResponse) return auth;
  const parsed = cohortListSchema.safeParse(queryObject(request.url));
  if (!parsed.success) return trainingError("Invalid query", 400);
  const cityId = reviewerCity(auth.user, parsed.data.cityId);
  if (cityId instanceof NextResponse) return cityId;
  const where = cityId ? { cityId } : {};
  try {
    const [cohorts, total] = await Promise.all([
      db.trainingCohort.findMany({ where, orderBy: { createdAt: "desc" }, skip: (parsed.data.page - 1) * parsed.data.pageSize, take: parsed.data.pageSize,
        select: { id: true, slug: true, cityId: true, title: true, status: true, registrationStart: true, registrationEnd: true, capacity: true, version: true, createdAt: true } }),
      db.trainingCohort.count({ where }),
    ]);
    return NextResponse.json({ data: cohorts, total, page: parsed.data.page, pageSize: parsed.data.pageSize }, { headers: privateHeaders });
  } catch { return trainingError("Training cohorts are temporarily unavailable", 503); }
}

export async function POST(request: Request) {
  const auth = await requireTrainingReviewer();
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await readBoundedJson(request); } catch { return trainingError("Invalid request body", 400); }
  const parsed = cohortCreateSchema.safeParse(body);
  if (!parsed.success) return trainingError("Invalid cohort details", 400);
  if (requireTrainingCity(auth.user, parsed.data.cityId)) return trainingError("Forbidden", 403);
  try {
    const city = await db.city.findUnique({ where: { id: parsed.data.cityId }, select: { isActive: true } });
    if (!city?.isActive) return trainingError("City not found", 404);
    const cohort = await db.$transaction(async (tx) => {
      const created = await tx.trainingCohort.create({ data: {
        slug: parsed.data.slug, cityId: parsed.data.cityId, title: parsed.data.title, summary: parsed.data.summary,
        registrationStart: parsed.data.registrationStart ? new Date(parsed.data.registrationStart) : null,
        registrationEnd: parsed.data.registrationEnd ? new Date(parsed.data.registrationEnd) : null,
        capacity: parsed.data.capacity ?? null, createdBy: auth.user.id!,
      } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "training_cohort_create", entityType: "training_cohorts", entityId: created.id, newValues: { cityId: created.cityId, status: "draft" } }) });
      return created;
    });
    return NextResponse.json({ id: cohort.id, slug: cohort.slug, status: cohort.status }, { status: 201, headers: privateHeaders });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return trainingError("Cohort slug already exists", 409);
    return trainingError("Training cohort could not be created", 503);
  }
}
