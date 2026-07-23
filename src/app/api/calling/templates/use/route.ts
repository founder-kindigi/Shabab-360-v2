import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { computeValuesHmac } from "@/lib/calling/template-hmac";
import { db } from "@/lib/db";
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

  if (!template || template.status !== "approved") {
    return NextResponse.json(
      { error: "Template not found or not in approved status" },
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
      callerUserId: user.id,
      assignmentId,
      variablesUsed: JSON.stringify(variablesUsed),
      valuesHmac,
    },
  });

  return NextResponse.json(useRecord, { status: 201 });
}
