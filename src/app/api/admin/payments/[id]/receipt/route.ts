import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { formatPKT } from "@/lib/timezone";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const { id } = await params;

  if (!["super_admin", "program_admin", "park_admin", "park_lead", "city_head", "murabbi"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      feeEvent: {
        include: {
          batch: {
            include: {
              park: {
                include: {
                  city: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      participant: {
        include: {
          group: { select: { name: true } },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Fetch the recorder user name if recordedBy is set
  let recorderName = "System";
  if (payment.recordedBy) {
    const recorder = await db.user.findUnique({
      where: { id: payment.recordedBy },
      select: { name: true },
    });
    if (recorder?.name) {
      recorderName = recorder.name;
    }
  }

  const receiptData = {
    receiptNo: payment.receiptNo ?? "N/A",
    date: formatPKT(payment.createdAt, "dd MMM yyyy"),
    studentName: payment.participant.name,
    groupName: payment.participant.group?.name ?? "—",
    batchName: payment.feeEvent.batch.name,
    parkName: payment.feeEvent.batch.park.name,
    city: payment.feeEvent.batch.park.city.name,
    feeTitle: payment.feeEvent.title,
    amount: payment.amount,
    method: payment.method,
    recordedBy: recorderName,
    notes: payment.notes ?? undefined,
  };

  return NextResponse.json(receiptData);
}