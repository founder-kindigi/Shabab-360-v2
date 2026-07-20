import { NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { moneyToNumber } from "@/lib/money";
import { formatPKT } from "@/lib/timezone";

export async function GET() {
  const roleError = await requireRole(["guardian"]);
  if (roleError) return roleError;

  const auth = await requireCapability("reports.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    // Find guardian record linked to this user
    const guardian = await db.guardian.findFirst({
      where: { userId: user.id },
    });

    if (!guardian) {
      return NextResponse.json({ guardian: null, children: [] });
    }

    // Get guardian's children with participant data and group/batch
    const guardianChildren = await db.guardianChild.findMany({
      where: { guardianId: guardian.id },
      include: {
        participant: {
          include: {
            group: {
              include: {
                batch: {
                  include: {
                    park: {
                      include: { city: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Collect all unique batch IDs
    const batchIds = [
      ...new Set(
        guardianChildren.map((gc) => gc.participant.group?.batchId).filter(Boolean) as string[]
      ),
    ];

    // Get all fee events for all batches
    const feeEvents = batchIds.length > 0
      ? await db.feeEvent.findMany({
          where: { batchId: { in: batchIds }, isActive: true },
          orderBy: { dueDate: "desc" },
        })
      : [];

    // Get all payments for this guardian's children
    const participantIds = guardianChildren.map((gc) => gc.participantId);
    const allPayments = participantIds.length > 0
      ? await db.payment.findMany({
          where: { participantId: { in: participantIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];

    // Build children data with their fee events and payment status
    const children = guardianChildren.map((gc) => {
      const p = gc.participant;
      const batchId = p.group?.batchId;
      const childFees = feeEvents
        .filter((f) => f.batchId === batchId)
        .map((fee) => {
          const childPayments = allPayments.filter(
            (pay) => pay.feeEventId === fee.id && pay.participantId === p.id
          );
          const amount = moneyToNumber(fee.amount);
          const totalPaid = childPayments.reduce(
            (sum, payment) => sum + moneyToNumber(payment.amount),
            0
          );
          const paid = totalPaid >= amount;
          const partial = totalPaid > 0 && totalPaid < amount;

          return {
            id: fee.id,
            title: fee.title,
            feeType: fee.feeType,
            amount,
            dueDate: fee.dueDate ? formatPKT(new Date(fee.dueDate)) : null,
            status: paid ? "paid" : partial ? "partial" : "unpaid",
            totalPaid: Math.round(totalPaid * 100) / 100,
            remaining: Math.round((amount - totalPaid) * 100) / 100,
            paymentCount: childPayments.length,
            payments: childPayments.map((pay) => ({
              id: pay.id,
              amount: moneyToNumber(pay.amount),
              method: pay.method,
              receiptNo: pay.receiptNo,
              notes: pay.notes,
              createdAt: formatPKT(new Date(pay.createdAt), "dd MMM yyyy"),
            })),
          };
        });

      const totalFees = childFees.reduce((s, f) => s + f.amount, 0);
      const totalPaid = childFees.reduce((s, f) => s + f.totalPaid, 0);

      return {
        id: p.id,
        name: p.name,
        groupName: p.group?.name || null,
        batchName: p.group?.batch?.name || null,
        parkName: p.group?.batch?.park?.name || null,
        cityName: p.group?.batch?.park?.city?.name || null,
        feeEvents: childFees,
        summary: {
          totalFees: Math.round(totalFees * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalRemaining: Math.round((totalFees - totalPaid) * 100) / 100,
          totalEvents: childFees.length,
          paidCount: childFees.filter((f) => f.status === "paid").length,
          unpaidCount: childFees.filter((f) => f.status === "unpaid").length,
          partialCount: childFees.filter((f) => f.status === "partial").length,
        },
      };
    });

    // Overall summary
    const allFees = children.flatMap((c) => c.feeEvents);
    const overallTotalFees = allFees.reduce((s, f) => s + f.amount, 0);
    const overallTotalPaid = allFees.reduce((s, f) => s + f.totalPaid, 0);

    return NextResponse.json({
      guardian: {
        name: guardian.name,
        phone: guardian.phone,
      },
      children,
      overallSummary: {
        totalFees: Math.round(overallTotalFees * 100) / 100,
        totalPaid: Math.round(overallTotalPaid * 100) / 100,
        totalRemaining: Math.round((overallTotalFees - overallTotalPaid) * 100) / 100,
        totalEvents: allFees.length,
        paidCount: allFees.filter((f) => f.status === "paid").length,
        unpaidCount: allFees.filter((f) => f.status === "unpaid").length,
        partialCount: allFees.filter((f) => f.status === "partial").length,
      },
    });
  } catch (error) {
    console.error("Guardian fees error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
