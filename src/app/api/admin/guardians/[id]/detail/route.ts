import { NextRequest, NextResponse } from "next/server";
import { canAccessResourceScope, requireAuth, requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { moneyToNumber } from "@/lib/money";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole([
    "super_admin",
    "program_admin",
    "city_head",
    "park_admin",
    "park_lead",
    "murabbi",
  ]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("guardians.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  // Fetch guardian with all relations
  const guardian = await db.guardian.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
      children: {
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              phone: true,
              gender: true,
              state: true,
              joinedAt: true,
              group: {
                include: {
                  batch: {
                    include: {
                      park: {
                        include: {
                          city: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!guardian) {
    return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
  }

  const canAccessAllChildren =
    guardian.children.length > 0 &&
    guardian.children.every((child) =>
      canAccessResourceScope(auth.user, {
        cityId: child.participant.group?.batch.park.cityId ?? null,
        parkId: child.participant.group?.batch.parkId ?? null,
        groupId: child.participant.group?.id ?? null,
      })
    );
  if (!canAccessAllChildren) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ─── Fee Summary across all children ──────────────────────────────────
  const participantIds = guardian.children.map((c) => c.participantId);

  let totalExpected = 0;
  let totalPaid = 0;
  let overdueFees = 0;

  let recentPayments: {
    childName: string;
    feeEventTitle: string;
    amount: number;
    method: string;
    receiptNo: string | null;
    date: string;
  }[] = [];

  if (participantIds.length > 0) {
    // Get all active fee events for all children's batches
    const batchIds = [
      ...new Set(
        guardian.children
          .map((c) => c.participant.group?.batchId)
          .filter((id): id is string => typeof id === "string")
      ),
    ];

    const feeEvents = await db.feeEvent.findMany({
      where: {
        batchId: { in: batchIds },
        isActive: true,
      },
      select: { id: true, amount: true, dueDate: true },
    });

    totalExpected =
      feeEvents.reduce((sum, feeEvent) => sum + moneyToNumber(feeEvent.amount), 0) *
      participantIds.length;

    // Count overdue: fee events with dueDate in the past that don't have a payment for each child
    const now = new Date();
    const overdueFeeEventIds = feeEvents
      .filter((f) => f.dueDate && new Date(f.dueDate) < now)
      .map((f) => f.id);

    if (overdueFeeEventIds.length > 0) {
      // Get payments for these fee events across all children
      const existingPayments = await db.payment.findMany({
        where: {
          participantId: { in: participantIds },
          feeEventId: { in: overdueFeeEventIds },
        },
        select: {
          participantId: true,
          feeEventId: true,
        },
        distinct: ["participantId", "feeEventId"],
      });

      const paidSet = new Set(
        existingPayments.map((p) => `${p.participantId}-${p.feeEventId}`)
      );

      for (const childId of participantIds) {
        for (const feeEventId of overdueFeeEventIds) {
          if (!paidSet.has(`${childId}-${feeEventId}`)) {
            overdueFees++;
          }
        }
      }
    }

    // Get all payments for all children
    const payments = await db.payment.findMany({
      where: { participantId: { in: participantIds } },
      include: {
        feeEvent: {
          select: { title: true },
        },
        participant: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    totalPaid = payments.reduce((sum, payment) => sum + moneyToNumber(payment.amount), 0);

    // Recent payments (last 5)
    recentPayments = payments.slice(0, 5).map((p) => ({
      childName: p.participant.name,
      feeEventTitle: p.feeEvent.title,
      amount: moneyToNumber(p.amount),
      method: p.method,
      receiptNo: p.receiptNo,
      date: p.createdAt.toISOString(),
    }));
  } else {
    recentPayments = [];
  }

  const outstanding = totalExpected - totalPaid;

  return NextResponse.json({
    guardian: {
      id: guardian.id,
      name: guardian.name,
      phone: guardian.phone,
      cnic: guardian.cnic,
      address: guardian.address,
      isActive: guardian.isActive,
      user: guardian.user
        ? { id: guardian.user.id, email: guardian.user.email, name: guardian.user.name }
        : null,
      children: guardian.children.map((c) => ({
        participant: {
          id: c.participant.id,
          name: c.participant.name,
          phone: c.participant.phone,
          gender: c.participant.gender,
          state: c.participant.state,
          joinedAt: c.participant.joinedAt.toISOString(),
        },
        relation: c.relation,
        group: c.participant.group
          ? {
              id: c.participant.group.id,
              name: c.participant.group.name,
              batch: {
                id: c.participant.group.batch.id,
                name: c.participant.group.batch.name,
                park: {
                  id: c.participant.group.batch.park.id,
                  name: c.participant.group.batch.park.name,
                  city: c.participant.group.batch.park.city
                    ? {
                        id: c.participant.group.batch.park.city.id,
                        name: c.participant.group.batch.park.city.name,
                      }
                    : null,
                },
              },
            }
          : null,
      })),
    },
    feeSummary: {
      totalChildren: guardian.children.length,
      totalExpected: Math.round(totalExpected),
      totalPaid: Math.round(totalPaid),
      outstanding: Math.round(outstanding),
      overdueFees,
    },
    recentPayments,
  });
}
