import { NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { moneyToNumber } from "@/lib/money";
import { formatPKT } from "@/lib/timezone";

export async function GET() {
  const roleError = await requireRole(["student"]);
  if (roleError) return roleError;

  const auth = await requireCapability("reports.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    // Find participant linked to this user
    const participant = await db.participant.findFirst({
      where: { userId: user.id },
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
    });

    if (!participant) {
      return NextResponse.json({ participant: null, feeEvents: [] });
    }

    const batchId = participant.group.batch.id;

    // Get all fee events for this batch
    const feeEvents = await db.feeEvent.findMany({
      where: { batchId, isActive: true },
      include: {
        payments: {
          where: { participantId: participant.id },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { dueDate: "desc" },
    });

    // Format fee events with payment status
    const formatted = feeEvents.map((fee) => {
      const amount = moneyToNumber(fee.amount);
      const totalPaid = fee.payments.reduce(
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
        paymentCount: fee.payments.length,
        payments: fee.payments.map((p) => ({
          id: p.id,
          amount: moneyToNumber(p.amount),
          method: p.method,
          receiptNo: p.receiptNo,
          notes: p.notes,
          createdAt: formatPKT(new Date(p.createdAt), "dd MMM yyyy"),
        })),
      };
    });

    // Summary stats
    const totalFees = formatted.reduce((s, f) => s + f.amount, 0);
    const totalPaid = formatted.reduce((s, f) => s + f.totalPaid, 0);
    const paidCount = formatted.filter((f) => f.status === "paid").length;
    const unpaidCount = formatted.filter((f) => f.status === "unpaid").length;
    const partialCount = formatted.filter((f) => f.status === "partial").length;

    return NextResponse.json({
      participant: {
        id: participant.id,
        name: participant.name,
        group: participant.group.name,
        batch: participant.group.batch.name,
        park: participant.group.batch.park.name,
        city: participant.group.batch.park.city?.name || null,
      },
      feeEvents: formatted,
      summary: {
        totalFees: Math.round(totalFees * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalRemaining: Math.round((totalFees - totalPaid) * 100) / 100,
        totalEvents: formatted.length,
        paidCount,
        unpaidCount,
        partialCount,
      },
    });
  } catch (error) {
    console.error("Student fees error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
