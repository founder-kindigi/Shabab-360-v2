import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { computeValuesHmac } from "@/lib/calling/template-hmac";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { useTemplateSchema } from "@/lib/validations/calling";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = useTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { templateId, assignmentId, variablesUsed, valuesUsed } = parsed.data;

  const [template, assignment] = await Promise.all([
    db.callingTemplate.findUnique({ where: { id: templateId } }),
    db.callingAssignment.findUnique({
      where: { id: assignmentId },
      include: { campaign: true },
    }),
  ]);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (template.status !== "approved") {
    return NextResponse.json(
      { error: `Template is ${template.status}; only approved templates may be used` },
      { status: 400 }
    );
  }

  if (!assignment || !assignment.isActive) {
    return NextResponse.json(
      { error: "Calling assignment not found or inactive" },
      { status: 404 }
    );
  }

  // Verify the template is eligible for this assignment's campaign and city.
  // A campaign-bound template must match; a city-only template is compatible
  // with any campaign in its city.
  if (template.campaignId && template.campaignId !== assignment.campaignId) {
    return NextResponse.json(
      { error: "Template is bound to a different campaign than this lead" },
      { status: 403 }
    );
  }
  if (template.cityId !== assignment.campaign.cityId) {
    return NextResponse.json(
      { error: "Template city does not match lead campaign city" },
      { status: 403 }
    );
  }

  // Direct-caller authorization: only the assigned staff caller or a valid
  // external caller may record template use for this lead.
  let isAuthorizedCaller = false;

  if (assignment.callerExternalId) {
    const extCaller = await db.externalSupportCaller.findFirst({
      where: {
        id: assignment.callerExternalId,
        userId: user.id,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (extCaller) isAuthorizedCaller = true;
  }

  if (!isAuthorizedCaller && assignment.callerStaffMetaId) {
    const staffMeta = await db.staffMeta.findFirst({
      where: { id: assignment.callerStaffMetaId, userId: user.id, isActive: true },
    });
    if (staffMeta) isAuthorizedCaller = true;
  }

  if (!isAuthorizedCaller) {
    return NextResponse.json(
      { error: "Forbidden: only the assigned caller may record template use" },
      { status: 403 }
    );
  }

  const valuesHmac = computeValuesHmac(valuesUsed);

  const useRecord = await db.callingTemplateUse.create({
    data: {
      templateId,
      templateVersion: template.version,
      callerUserId: user.id!,
      assignmentId,
      // Only variable keys and HMAC evidence — never raw merge values,
      // candidate message bodies, names, phones, or notes.
      variablesUsed: JSON.stringify(variablesUsed),
      valuesHmac,
    },
  });

  await logAudit({
    userId: user.id!,
    action: "calling.template.use",
    entityType: "CallingTemplateUse",
    entityId: useRecord.id,
    newValues: {
      templateId,
      templateVersion: template.version,
      assignmentId,
      variablesUsed,
      valuesHmac,
    },
  });

  return NextResponse.json(useRecord, { status: 201 });
}
