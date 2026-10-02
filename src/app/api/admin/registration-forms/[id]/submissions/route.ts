import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireFormCity, requireFormManager } from "@/lib/registration-forms/access";
import { formError, noStore } from "@/lib/registration-forms/http";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFormManager();
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  if (!id || id.length > 80) return formError("Form not found", 404);
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return formError("Invalid query", 400);
  try {
    const form = await db.registrationForm.findUnique({ where: { id }, select: { ownerCityId: true } });
    if (!form || requireFormCity(auth.user, form.ownerCityId)) return formError("Form not found", 404);
    const where = { formId: id };
    const [submissions, total] = await Promise.all([
      db.registrationFormSubmission.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.data.page - 1) * query.data.pageSize, take: query.data.pageSize,
        select: { id: true, reference: true, status: true, createdAt: true, revision: { select: { version: true } } } }),
      db.registrationFormSubmission.count({ where }),
    ]);
    return NextResponse.json({ data: submissions, total, page: query.data.page, pageSize: query.data.pageSize }, { headers: noStore });
  } catch { return formError("Submissions are temporarily unavailable", 503); }
}
