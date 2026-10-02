import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { requireFormCity, requireFormManager } from "@/lib/registration-forms/access";
import { formFieldsSchema, formSettingsSchema, publicationError } from "@/lib/registration-forms/definition";
import { formError, noStore, readFormJson } from "@/lib/registration-forms/http";

const inputSchema = z.object({ version: z.number().int().positive() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFormManager();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id || id.length > 80) return formError("Form not found", 404);
  let body: unknown;
  try { body = await readFormJson(request); } catch { return formError("Invalid request body", 400); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return formError("Invalid publish request", 400);
  try {
    const form = await db.registrationForm.findUnique({ where: { id }, include: { ownerCity: { select: { isActive: true } } } });
    if (!form || requireFormCity(auth.user, form.ownerCityId)) return formError("Form not found", 404);
    if (!form.ownerCity.isActive) return formError("Owning city is inactive", 409);
    if (form.version !== parsed.data.version) return formError("Form changed; reload and review again", 409);
    const fields = formFieldsSchema.safeParse(JSON.parse(form.draftSchemaJson));
    const settings = formSettingsSchema.safeParse(JSON.parse(form.draftSettingsJson));
    if (!fields.success || !settings.success) return formError("Form draft is invalid", 400);
    const problem = publicationError(fields.data, settings.data);
    if (problem) return formError(problem, 400);
    const revisionNumber = form.publishedVersion + 1;
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.registrationForm.updateMany({ where: { id, version: form.version }, data: { status: "published", publishedVersion: revisionNumber, version: { increment: 1 } } });
      if (updated.count !== 1) return null;
      await tx.registrationFormRevision.create({ data: {
        formId: id, version: revisionNumber, title: form.title, intro: form.intro,
        schemaJson: JSON.stringify(fields.data), settingsJson: JSON.stringify(settings.data), publishedBy: auth.user.id!,
      } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "registration_form_publish", entityType: "registration_forms", entityId: id, newValues: { revision: revisionNumber, ownerCityId: form.ownerCityId } }) });
      return { status: "published", version: form.version + 1, publishedVersion: revisionNumber, publicPath: `/register/forms/${form.slug}` };
    });
    if (!result) return formError("Form changed; reload and review again", 409);
    return NextResponse.json(result, { headers: noStore });
  } catch { return formError("Form could not be published", 503); }
}
