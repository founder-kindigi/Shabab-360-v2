import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { computeValuesHmac } from "@/lib/calling/template-hmac";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { useTemplateSchema } from "@/lib/validations/calling";

export async function POST(request: NextRequest) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

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

  const template = await db.callingTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (template.status !== "approved") {
    // Retired templates must not be used for live calls; draft templates
    // have not been reviewed for routing.
    return NextResponse.json(
      { error: `Template is ${template.status}; only approved templates may be used` },
      { status: 400 }
    );
  }

  const assignment = await db.callingAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment || !assignment.isActive) {
    return NextResponse.json(
      { error: "Calling assignment not found or inactive" },
      { status: 400 }
    );
  }

  const valuesHmac = computeValuesHmac(valuesUsed || {});

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
      // Log only variable keys — no raw merge values, names, phones, or notes.
      variablesUsed,
      // HMAC evidence permits later verification without exposing PII.
      valuesHmac,
    },
  });

  return NextResponse.json(useRecord, { status: 201 });
}
