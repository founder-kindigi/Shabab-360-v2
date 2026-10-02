import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFormCity, requireFormManager } from "@/lib/registration-forms/access";
import { formError, noStore } from "@/lib/registration-forms/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string; submissionId: string }> }) {
  const auth = await requireFormManager();
  if (auth instanceof NextResponse) return auth;
  const { id, submissionId } = await context.params;
  if (!id || !submissionId || id.length > 80 || submissionId.length > 80) return formError("Submission not found", 404);
  try {
    const form = await db.registrationForm.findUnique({ where: { id }, select: { ownerCityId: true } });
    if (!form || requireFormCity(auth.user, form.ownerCityId)) return formError("Submission not found", 404);
    const submission = await db.registrationFormSubmission.findFirst({ where: { id: submissionId, formId: id }, select: {
      id: true, reference: true, status: true, createdAt: true, answersJson: true,
      revision: { select: { version: true, title: true, schemaJson: true, settingsJson: true } },
    } });
    if (!submission) return formError("Submission not found", 404);
    return NextResponse.json({ data: {
      id: submission.id, reference: submission.reference, status: submission.status, createdAt: submission.createdAt,
      answers: JSON.parse(submission.answersJson),
      formVersion: submission.revision.version, formTitle: submission.revision.title,
      fields: JSON.parse(submission.revision.schemaJson), settings: JSON.parse(submission.revision.settingsJson),
    } }, { headers: noStore });
  } catch { return formError("Submission is temporarily unavailable", 503); }
}
