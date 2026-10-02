import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSameOriginRequest } from "@/lib/security/origin";
import { readBoundedJson, trainingError } from "@/lib/training/responses";
import { trainingApplicationSchema, validIntake } from "@/lib/training/validation";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginRequest(request)) return trainingError("Forbidden", 403);
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return trainingError("Training registration not found", 404);
  let body: unknown;
  try { body = await readBoundedJson(request); } catch { return trainingError("Invalid request body", 400); }
  const parsed = trainingApplicationSchema.safeParse(body);
  if (!parsed.success) return trainingError("Invalid application details", 400);
  const data = parsed.data;
  const requestHash = createHash("sha256").update(JSON.stringify(data)).digest("hex");

  try {
    const cohort = await db.trainingCohort.findUnique({ where: { slug }, include: { city: { select: { isActive: true } } } });
    if (!cohort || !cohort.city.isActive) return trainingError("Training registration not found", 404);
    const existing = await db.trainingApplication.findUnique({ where: { cohortId_requestKey: { cohortId: cohort.id, requestKey: data.requestKey } }, select: { reference: true, requestHash: true } });
    if (existing) return existing.requestHash === requestHash
      ? NextResponse.json({ reference: existing.reference }, { headers: { "Cache-Control": "no-store" } })
      : trainingError("Request key has already been used", 409);
    if (cohort.status !== "published") return trainingError("Training registration not found", 404);
    if (!validIntake(cohort)) return trainingError("Registration is closed", 409);
    if (data.privacyVersion !== cohort.policyVersion) return trainingError("Registration details changed; please review them again", 409);

    const application = await db.$transaction(async (tx) => {
      // Re-read inside the transaction; close/policy edits must not race an intake.
      const current = await tx.trainingCohort.findUnique({ where: { id: cohort.id }, select: { status: true, registrationStart: true, registrationEnd: true, eligibilityText: true, feeText: true, privacyNotice: true, policyVersion: true } });
      if (!current || !validIntake(current) || current.policyVersion !== data.privacyVersion) return null;
      return tx.trainingApplication.create({ data: {
        cohortId: cohort.id, requestKey: data.requestKey, requestHash,
        reference: `MTI-${randomBytes(10).toString("hex").toUpperCase()}`,
        fullName: data.fullName, phone: data.phone.replace(/[ -]/g, ""), email: data.email,
        dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00Z`) : null,
        locality: data.locality, background: data.background, connection: data.connection,
        motivation: data.motivation, availability: data.availability, privacyVersion: data.privacyVersion,
      }, select: { reference: true } });
    });
    if (!application) return trainingError("Registration is closed", 409);
    return NextResponse.json({ reference: application.reference }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      const cohort = await db.trainingCohort.findUnique({ where: { slug }, select: { id: true } });
      const existing = cohort && await db.trainingApplication.findUnique({ where: { cohortId_requestKey: { cohortId: cohort.id, requestKey: data.requestKey } }, select: { reference: true, requestHash: true } });
      if (existing?.requestHash === requestHash) return NextResponse.json({ reference: existing.reference }, { headers: { "Cache-Control": "no-store" } });
      return trainingError("Request key has already been used", 409);
    }
    return trainingError("Application could not be saved; please retry", 503);
  }
}
