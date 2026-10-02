import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { requireFormCity, requireFormManager } from "@/lib/registration-forms/access";
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
  if (!parsed.success) return formError("Invalid close request", 400);
  try {
    const form = await db.registrationForm.findUnique({ where: { id }, select: { ownerCityId: true, status: true, version: true } });
    if (!form || requireFormCity(auth.user, form.ownerCityId)) return formError("Form not found", 404);
    if (form.version !== parsed.data.version || form.status !== "published") return formError("Form changed or is not published", 409);
    const updated = await db.$transaction(async (tx) => {
      const changed = await tx.registrationForm.updateMany({ where: { id, version: form.version, status: "published" }, data: { status: "closed", version: { increment: 1 } } });
      if (changed.count !== 1) return false;
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "registration_form_close", entityType: "registration_forms", entityId: id, newValues: { status: "closed" } }) });
      return true;
    });
    if (!updated) return formError("Form changed; reload and review again", 409);
    return NextResponse.json({ status: "closed", version: form.version + 1 }, { headers: noStore });
  } catch { return formError("Form could not be closed", 503); }
}
