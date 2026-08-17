import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { attendanceDateStart } from "@/lib/attendance/schedule";
import { operationalOffDateSchema } from "@/lib/attendance/schemas";
import { optionalIdentifier, queryParamsToObject, queryValidationError } from "@/lib/api/query-params";
import { db } from "@/lib/db";
import { z } from "zod";

const querySchema = z.object({ cityId: optionalIdentifier() });

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("organisation.view");
  if (capability instanceof NextResponse) return capability;
  const parsed = querySchema.safeParse(queryParamsToObject(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json(queryValidationError(parsed.error), { status: 400 });
  const cityId = parsed.data.cityId ?? auth.user.assignedCityId;
  if (!cityId) return NextResponse.json({ error: "cityId required" }, { status: 400 });
  const scopeError = requireResourceScope(auth.user, { cityId });
  if (scopeError) return scopeError;
  return NextResponse.json(await db.operationalOffDate.findMany({ where: { cityId }, orderBy: { offDate: "asc" } }));
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("organisation.manage");
  if (capability instanceof NextResponse) return capability;
  const parsed = operationalOffDateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const scopeError = requireResourceScope(auth.user, { cityId: parsed.data.cityId });
  if (scopeError) return scopeError;
  const offDate = attendanceDateStart(parsed.data.offDate);
  const result = await db.$transaction(async (tx) => {
    const item = await tx.operationalOffDate.upsert({
      where: { cityId_offDate: { cityId: parsed.data.cityId, offDate } },
      create: { cityId: parsed.data.cityId, offDate, label: parsed.data.label },
      update: { label: parsed.data.label },
    });
    await tx.auditLog.create({ data: createAuditLogData({
      userId: auth.user.id,
      action: "operational_off_date_upsert",
      entityType: "operational_off_dates",
      entityId: item.id,
      newValues: { cityId: parsed.data.cityId, offDate: parsed.data.offDate, label: parsed.data.label },
    }) });
    return item;
  });
  return NextResponse.json(result, { status: 201 });
}
