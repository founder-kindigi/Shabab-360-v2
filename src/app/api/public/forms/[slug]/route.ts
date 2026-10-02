import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formFieldsSchema, formSettingsSchema, intakeOpen } from "@/lib/registration-forms/definition";
import { formError } from "@/lib/registration-forms/http";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return formError("Form not found", 404);
  try {
    const form = await db.registrationForm.findUnique({ where: { slug }, include: { ownerCity: { select: { isActive: true } } } });
    if (!form || !form.ownerCity.isActive || form.publishedVersion === 0 || form.status === "draft") return formError("Form not found", 404);
    const revision = await db.registrationFormRevision.findUnique({ where: { formId_version: { formId: form.id, version: form.publishedVersion } } });
    if (!revision) return formError("Form is temporarily unavailable", 503);
    const fields = formFieldsSchema.parse(JSON.parse(revision.schemaJson));
    const settings = formSettingsSchema.parse(JSON.parse(revision.settingsJson));
    return NextResponse.json({ slug, title: revision.title, intro: revision.intro, fields, settings,
      publishedVersion: revision.version, isOpen: form.status === "published" && intakeOpen(settings),
    }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch { return formError("Form is temporarily unavailable", 503); }
}
