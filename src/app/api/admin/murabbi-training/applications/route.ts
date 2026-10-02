import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTrainingReviewer, reviewerCity } from "@/lib/training/access";
import { applicationListSchema, queryObject } from "@/lib/training/validation";
import { privateHeaders, trainingError } from "@/lib/training/responses";

export async function GET(request: Request) {
  const auth = await requireTrainingReviewer();
  if (auth instanceof NextResponse) return auth;
  const parsed = applicationListSchema.safeParse(queryObject(request.url));
  if (!parsed.success) return trainingError("Invalid query", 400);
  const cityId = reviewerCity(auth.user, parsed.data.cityId);
  if (cityId instanceof NextResponse) return cityId;
  const where = {
    ...(parsed.data.cohortId ? { cohortId: parsed.data.cohortId } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(cityId ? { cohort: { cityId } } : {}),
  };
  try {
    const [applications, total] = await Promise.all([
      db.trainingApplication.findMany({ where, orderBy: { createdAt: "desc" }, skip: (parsed.data.page - 1) * parsed.data.pageSize, take: parsed.data.pageSize,
        select: { id: true, reference: true, fullName: true, phone: true, email: true, locality: true, status: true, version: true, createdAt: true,
          cohort: { select: { id: true, title: true, cityId: true } } } }),
      db.trainingApplication.count({ where }),
    ]);
    return NextResponse.json({ data: applications, total, page: parsed.data.page, pageSize: parsed.data.pageSize }, { headers: privateHeaders });
  } catch { return trainingError("Applications are temporarily unavailable", 503); }
}
