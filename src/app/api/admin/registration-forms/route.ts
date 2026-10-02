import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { requireFormCity, requireFormManager, scopedFormCity } from "@/lib/registration-forms/access";
import { formCreateSchema } from "@/lib/registration-forms/definition";
import { formError, noStore, readFormJson } from "@/lib/registration-forms/http";
import { ATFAL_STYLE_FIELDS, EMPTY_FORM_SETTINGS } from "@/lib/registration-forms/template";

const listSchema = z.object({
  cityId: z.string().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export async function GET(request: Request) {
  const auth = await requireFormManager();
  if (auth instanceof NextResponse) return auth;
  const query = listSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return formError("Invalid query", 400);
  const cityId = scopedFormCity(auth.user, query.data.cityId);
  if (cityId instanceof NextResponse) return cityId;
  const where = cityId ? { ownerCityId: cityId } : {};
  try {
    const [forms, total] = await Promise.all([
      db.registrationForm.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.data.page - 1) * query.data.pageSize, take: query.data.pageSize,
        select: { id: true, slug: true, ownerCityId: true, title: true, status: true, version: true, publishedVersion: true, createdAt: true } }),
      db.registrationForm.count({ where }),
    ]);
    return NextResponse.json({ data: forms, total, page: query.data.page, pageSize: query.data.pageSize }, { headers: noStore });
  } catch { return formError("Forms are temporarily unavailable", 503); }
}

export async function POST(request: Request) {
  const auth = await requireFormManager();
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await readFormJson(request); } catch { return formError("Invalid request body", 400); }
  const parsed = formCreateSchema.safeParse(body);
  if (!parsed.success) return formError("Invalid form details", 400);
  if (requireFormCity(auth.user, parsed.data.ownerCityId)) return formError("Forbidden", 403);
  try {
    const city = await db.city.findUnique({ where: { id: parsed.data.ownerCityId }, select: { isActive: true } });
    if (!city?.isActive) return formError("City not found", 404);
    const form = await db.$transaction(async (tx) => {
      const created = await tx.registrationForm.create({ data: {
        slug: parsed.data.slug, ownerCityId: parsed.data.ownerCityId, title: parsed.data.title, intro: parsed.data.intro,
        draftSchemaJson: JSON.stringify(parsed.data.template === "atfal_style" ? ATFAL_STYLE_FIELDS : []),
        draftSettingsJson: JSON.stringify(EMPTY_FORM_SETTINGS), createdBy: auth.user.id!,
      } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "registration_form_create", entityType: "registration_forms", entityId: created.id, newValues: { ownerCityId: created.ownerCityId, status: "draft" } }) });
      return created;
    });
    return NextResponse.json({ id: form.id, slug: form.slug, status: form.status, version: form.version }, { status: 201, headers: noStore });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return formError("Form slug already exists", 409);
    return formError("Form could not be created", 503);
  }
}
