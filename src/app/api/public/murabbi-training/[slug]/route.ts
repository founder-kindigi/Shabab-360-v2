import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicHeaders, trainingError } from "@/lib/training/responses";
import { validIntake } from "@/lib/training/validation";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return trainingError("Training registration not found", 404);
  try {
    const cohort = await db.trainingCohort.findUnique({ where: { slug }, include: { city: { select: { name: true, isActive: true } } } });
    if (!cohort || !cohort.city.isActive || cohort.status !== "published") return trainingError("Training registration not found", 404);
    return NextResponse.json({
      slug: cohort.slug,
      title: cohort.title,
      summary: cohort.summary,
      city: cohort.city.name,
      eligibility: cohort.eligibilityText,
      fee: cohort.feeText,
      privacyNotice: cohort.privacyNotice,
      privacyVersion: cohort.policyVersion,
      registrationStart: cohort.registrationStart,
      registrationEnd: cohort.registrationEnd,
      isOpen: validIntake(cohort),
    }, { headers: publicHeaders });
  } catch { return trainingError("Training registration is temporarily unavailable", 503); }
}
