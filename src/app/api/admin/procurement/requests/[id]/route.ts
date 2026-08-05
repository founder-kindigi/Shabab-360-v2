import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
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

  const actorCity = await resolveActorCity();
  if (actorCity && existing.park.cityId !== actorCity) {
    return NextResponse.json({ error: "Forbidden: Cannot update request outside city scope" }, { status: 403 });
  }

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

  const updated = await db.$transaction(async (tx) => {
    const req = await tx.stockRequest.update({
      where: { id },
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

    // If status transitioned to "fulfilled", atomically increment park stock!
    if (parsed.data.status === "fulfilled" && existing.status !== "fulfilled") {
      await tx.parkStock.upsert({
        where: { parkId_itemId: { parkId: existing.parkId, itemId: existing.itemId } },
        create: {
          parkId: existing.parkId,
          itemId: existing.itemId,
          quantity: existing.quantity,
          minThreshold: 5,
        },
        update: {
          quantity: { increment: existing.quantity },
        },
      });
    }

    return req;
  });

  logAudit({
    userId: user.id!,
    action: "procurement.request.update_status",
    entityType: "stock_request",
    entityId: updated.id,
    oldValues: { status: existing.status },
    newValues: { status: updated.status, notes: updated.notes },
  });

  return NextResponse.json(updated);
}
