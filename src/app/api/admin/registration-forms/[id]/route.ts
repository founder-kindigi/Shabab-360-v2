import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { requireFormCity, requireFormManager } from "@/lib/registration-forms/access";
import { formFieldsSchema, formSettingsSchema, formUpdateSchema } from "@/lib/registration-forms/definition";
import { formError, noStore, readFormJson } from "@/lib/registration-forms/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const auth = await requireFormManager();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id || id.length > 80) return formError("Form not found", 404);
  try {
    const form = await db.registrationForm.findUnique({ where: { id } });
    if (!form || requireFormCity(auth.user, form.ownerCityId)) return formError("Form not found", 404);
    const rawFields: unknown = JSON.parse(form.draftSchemaJson);
    const fields = formFieldsSchema.safeParse(rawFields);
    const settings = formSettingsSchema.safeParse(JSON.parse(form.draftSettingsJson));
    // A blank new draft is valid until its first editor save; malformed saved data is not.
    if ((!fields.success && !(Array.isArray(rawFields) && rawFields.length === 0)) || !settings.success) return formError("Form configuration is unavailable", 503);
    return NextResponse.json({ data: {
      id: form.id, slug: form.slug, ownerCityId: form.ownerCityId, title: form.title, intro: form.intro,
      status: form.status, version: form.version, publishedVersion: form.publishedVersion,
      fields: fields.success ? fields.data : [], settings: settings.success ? settings.data : null,
      createdAt: form.createdAt, updatedAt: form.updatedAt,
    } }, { headers: noStore });
  } catch { return formError("Form is temporarily unavailable", 503); }
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireFormManager();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id || id.length > 80) return formError("Form not found", 404);
  let body: unknown;
  try { body = await readFormJson(request); } catch { return formError("Invalid request body", 400); }
  const parsed = formUpdateSchema.safeParse(body);
  if (!parsed.success) return formError("Invalid form changes", 400);
  try {
    const form = await db.registrationForm.findUnique({ where: { id }, select: { ownerCityId: true, version: true, status: true } });
    if (!form || requireFormCity(auth.user, form.ownerCityId)) return formError("Form not found", 404);
    if (form.version !== parsed.data.version) return formError("Form changed; reload and review again", 409);
    const data = parsed.data;
    const changedFields = Object.keys(data).filter((field) => field !== "version");
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.registrationForm.updateMany({ where: { id, version: data.version }, data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.intro !== undefined ? { intro: data.intro } : {}),
        ...(data.fields !== undefined ? { draftSchemaJson: JSON.stringify(data.fields) } : {}),
        ...(data.settings !== undefined ? { draftSettingsJson: JSON.stringify(data.settings) } : {}),
        version: { increment: 1 },
      } });
      if (updated.count !== 1) return null;
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "registration_form_draft_update", entityType: "registration_forms", entityId: id, newValues: { changedFields } }) });
      return { version: data.version + 1, status: form.status };
    });
    if (!result) return formError("Form changed; reload and review again", 409);
    return NextResponse.json(result, { headers: noStore });
  } catch { return formError("Form changes could not be saved", 503); }
}
