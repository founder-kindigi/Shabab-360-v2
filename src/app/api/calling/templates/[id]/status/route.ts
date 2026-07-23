import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { updateTemplateStatusSchema } from "@/lib/validations/calling";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.templates.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

  const { id } = await params;
  const template = await db.callingTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, template.cityId);
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateTemplateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const updated = await db.callingTemplate.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  await logAudit({
    userId: user.id,
    action: "calling.template.status_change",
    entityType: "CallingTemplate",
    entityId: id,
    oldValues: { status: template.status },
    newValues: { status: updated.status },
  });

  return NextResponse.json(updated);
}
