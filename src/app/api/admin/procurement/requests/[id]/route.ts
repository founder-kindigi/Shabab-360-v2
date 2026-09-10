import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { z } from "zod";

const updateRequestSchema = z.object({
  status: z.enum(["approved", "rejected", "fulfilled"]),
  notes: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("organisation.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  const { id } = await params;
  const existing = await db.stockRequest.findUnique({
    where: { id },
    include: { park: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Stock request not found" }, { status: 404 });
  }

  const scope = await requireResourceScope(user, { cityId: existing.park.cityId, parkId: existing.park.id });
  if (scope instanceof NextResponse) return scope;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const allowedTransitions: Record<string, string[]> = {
    pending: ["approved", "rejected"],
  };
  if (!allowedTransitions[existing.status]?.includes(parsed.data.status)) {
    return NextResponse.json({ error: "This stock-request status transition is not allowed" }, { status: 409 });
  }

  try {
  const updated = await db.$transaction(async (tx) => {
    const req = await tx.stockRequest.update({
      where: { id, status: "pending", updatedAt: existing.updatedAt },
      data: {
        status: parsed.data.status,
        notes: parsed.data.notes || existing.notes,
        reviewedBy: user.id!,
        reviewedAt: new Date(),
      },
      include: {
        park: { select: { id: true, name: true } },
        item: { select: { id: true, sku: true, name: true } },
      },
    });

    await tx.auditLog.create({ data: createAuditLogData({
      userId: user.id, action: "procurement.request.update_status", entityType: "stock_request", entityId: req.id,
      oldValues: { status: existing.status }, newValues: { status: req.status },
    }) });
    return req;
  });

  return NextResponse.json(updated);
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") return NextResponse.json({ error: "Request was already reviewed" }, { status: 409 });
    return NextResponse.json({ error: "Request could not be updated" }, { status: 503 });
  }
}
