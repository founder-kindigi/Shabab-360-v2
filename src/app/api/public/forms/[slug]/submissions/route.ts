import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isSameOriginRequest } from "@/lib/security/origin";
import { createAuditLogData } from "@/lib/audit";
import { formFieldsSchema, formSettingsSchema, intakeOpen, parseFormAnswers } from "@/lib/registration-forms/definition";
import { formError, readFormJson } from "@/lib/registration-forms/http";
import { consumeFormSubmissionQuota } from "@/lib/registration-forms/quota";

const inputSchema = z.object({
  requestKey: z.uuid(),
  publishedVersion: z.number().int().positive(),
  answers: z.record(z.string(), z.unknown()),
  consent: z.literal(true),
}).strict();

const receipt = (reference: string, status = 200) => NextResponse.json({ reference }, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginRequest(request)) return formError("Forbidden", 403);
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return formError("Form not found", 404);
  let body: unknown;
  try { body = await readFormJson(request); } catch { return formError("Invalid request body", 400); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return formError("Invalid submission", 400);
  let requestHash: string | null = null;

  try {
    const form = await db.registrationForm.findUnique({ where: { slug }, include: { ownerCity: { select: { isActive: true } } } });
    if (!form || !form.ownerCity.isActive || form.publishedVersion === 0) return formError("Form not found", 404);
    const revision = await db.registrationFormRevision.findUnique({ where: { formId_version: { formId: form.id, version: parsed.data.publishedVersion } } });
    if (!revision) return formError("Form version not found", 409);
    const fields = formFieldsSchema.parse(JSON.parse(revision.schemaJson));
    const settings = formSettingsSchema.parse(JSON.parse(revision.settingsJson));
    const answers = parseFormAnswers(fields, settings, parsed.data.answers);
    if (!answers) return formError("Invalid answers or eligibility", 400);
    requestHash = createHash("sha256").update(JSON.stringify({ publishedVersion: revision.version, answers, consent: true })).digest("hex");
    const validatedRequestHash = requestHash;
    const existing = await db.registrationFormSubmission.findUnique({ where: { formId_requestKey: { formId: form.id, requestKey: parsed.data.requestKey } }, select: { reference: true, requestHash: true } });
    if (existing) return existing.requestHash === requestHash ? receipt(existing.reference) : formError("Request key has already been used", 409);
    if (form.status !== "published" || form.publishedVersion !== revision.version || !intakeOpen(settings)) return formError("Registration is closed or changed", 409);
    if (!(await consumeFormSubmissionQuota(form.id))) return formError("Registration is busy; try again later", 429);

    const saved = await db.$transaction(async (tx) => {
      const current = await tx.registrationForm.findUnique({ where: { id: form.id }, select: { status: true, publishedVersion: true } });
      if (!current || current.status !== "published" || current.publishedVersion !== revision.version || !intakeOpen(settings)) return null;
      const submission = await tx.registrationFormSubmission.create({ data: {
        formId: form.id, revisionId: revision.id, requestKey: parsed.data.requestKey, requestHash: validatedRequestHash,
        reference: `REG-${randomBytes(10).toString("hex").toUpperCase()}`,
        answersJson: JSON.stringify(answers),
      }, select: { id: true, reference: true } });
      await tx.auditLog.create({ data: createAuditLogData({ action: "registration_form_submit", entityType: "registration_form_submissions", entityId: submission.id, newValues: { formId: form.id, publishedVersion: revision.version } }) });
      return submission;
    });
    if (!saved) return formError("Registration is closed or changed", 409);
    return receipt(saved.reference, 201);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      try {
        const form = await db.registrationForm.findUnique({ where: { slug }, select: { id: true } });
        const existing = form && await db.registrationFormSubmission.findUnique({ where: { formId_requestKey: { formId: form.id, requestKey: parsed.data.requestKey } }, select: { reference: true, requestHash: true } });
        if (existing && existing.requestHash === requestHash) return receipt(existing.reference);
      } catch { /* Return a retryable response below. */ }
      return formError("Submission conflict; retry safely", 409);
    }
    return formError("Registration could not be saved; please retry", 503);
  }
}
