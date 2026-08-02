import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope, requireRole } from "@/lib/auth/authorize";
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
  const capabilityAuth = await requireCapability("students.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  // Fetch participant with all relations
  const participant = await db.participant.findUnique({
    where: { id },
    include: {
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
      user: {
        select: { id: true, email: true },
      },
      guardianLinks: {
        include: {
          guardian: {
            select: { id: true, name: true, phone: true, cnic: true },
          },
        },
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(auth.user, {
    cityId: participant.group?.batch.park.cityId ?? null,
    parkId: participant.group?.batch.parkId ?? null,
    groupId: participant.groupId,
  });
  if (scopeError) return scopeError;

  // ─── Attendance Summary ──────────────────────────────────────────────
  const attendanceRecords = await db.attendanceRecord.findMany({
    where: { participantId: id },
    include: {
      event: {
        select: { id: true, title: true, eventDate: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Resolve markedBy name - AttendanceRecord.markedBy stores userId
  const markedByNames = new Map<string, string>();
  if (attendanceRecords.length > 0) {
    const userIds = [
      ...new Set(
        attendanceRecords
          .map((r) => r.markedBy)
          .filter((m): m is string => !!m)
      ),
    ];
    if (userIds.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      for (const u of users) {
        markedByNames.set(u.id, u.name || "Unknown");
      }
    }
  }

  const present = attendanceRecords.filter((r) => r.status === "present").length;
  const absent = attendanceRecords.filter((r) => r.status === "absent").length;
  const late = attendanceRecords.filter((r) => r.status === "late").length;
  const excused = attendanceRecords.filter((r) => r.status === "excused").length;
  const totalEvents = attendanceRecords.length;
  const rate = totalEvents > 0 ? Math.round((present / totalEvents) * 1000) / 10 : 0;

  // Recent attendance (last 10)
  const recentAttendance = attendanceRecords.slice(0, 10).map((r) => ({
    eventDate: r.event.eventDate.toISOString(),
    title: r.event.title,
    status: r.status,
    markedByName: r.markedBy ? markedByNames.get(r.markedBy) || "Unknown" : "System",
  }));

  // ─── Fee Summary ─────────────────────────────────────────────────────
  const batchId = participant.group?.batchId;
  const batchFeeEvents = batchId
    ? await db.feeEvent.findMany({
        where: {
          batchId,
          isActive: true,
        },
        select: { id: true, title: true, amount: true },
      })
    : [];

  const totalFees = batchFeeEvents.length;
  const totalExpected = batchFeeEvents.reduce(
    (sum, feeEvent) => sum + moneyToNumber(feeEvent.amount),
    0
  );

  // Get all payments for this participant
  const payments = await db.payment.findMany({
    where: { participantId: id },
    include: {
      feeEvent: {
        select: { title: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Resolve recordedBy names
  const recordedByNames = new Map<string, string>();
  if (payments.length > 0) {
    const pUserIds = [
      ...new Set(
        payments
          .map((p) => p.recordedBy)
          .filter((r): r is string => !!r)
      ),
    ];
    if (pUserIds.length > 0) {
      const pUsers = await db.user.findMany({
        where: { id: { in: pUserIds } },
        select: { id: true, name: true },
      });
      for (const u of pUsers) {
        recordedByNames.set(u.id, u.name || "Unknown");
      }
    }
  }

  const totalPaid = payments.reduce((sum, payment) => sum + moneyToNumber(payment.amount), 0);
  const outstanding = totalExpected - totalPaid;

  // Recent payments (last 5 for the card, 10 for the tab)
  const recentPayments = payments.slice(0, 5).map((p) => ({
    feeEventTitle: p.feeEvent.title,
      amount: moneyToNumber(p.amount),
    method: p.method,
    receiptNo: p.receiptNo,
    date: p.createdAt.toISOString(),
    recordedByName: p.recordedBy
      ? recordedByNames.get(p.recordedBy) || "Unknown"
      : "System",
  }));

  // All recent payments for the tab (last 10)
  const tabPayments = payments.slice(0, 10).map((p) => ({
    feeEventTitle: p.feeEvent.title,
    amount: p.amount,
    method: p.method,
    receiptNo: p.receiptNo,
    date: p.createdAt.toISOString(),
    recordedByName: p.recordedBy
      ? recordedByNames.get(p.recordedBy) || "Unknown"
      : "System",
  }));

  return NextResponse.json({
    participant: {
      id: participant.id,
      name: participant.name,
      phone: participant.phone,
      dateOfBirth: participant.dateOfBirth?.toISOString() ?? null,
      gender: participant.gender,
      address: participant.address,
      state: participant.state,
      joinedAt: participant.joinedAt.toISOString(),
      group: participant.group
        ? {
            id: participant.group.id,
            name: participant.group.name,
            batch: {
              id: participant.group.batch.id,
              name: participant.group.batch.name,
              park: {
                id: participant.group.batch.park.id,
                name: participant.group.batch.park.name,
                city: {
                  id: participant.group.batch.park.city.id,
                  name: participant.group.batch.park.city.name,
                },
              },
            },
          }
        : null,
      user: participant.user
        ? { id: participant.user.id, email: participant.user.email }
        : null,
      guardianLinks: participant.guardianLinks.map((gl) => ({
        guardian: {
          id: gl.guardian.id,
          name: gl.guardian.name,
          phone: gl.guardian.phone,
          cnic: gl.guardian.cnic,
        },
        relation: gl.relation,
      })),
    },
    attendanceSummary: {
      totalEvents,
      present,
      absent,
      late,
      excused,
      rate,
    },
    recentAttendance,
    feeSummary: {
      totalFees,
      totalExpected,
      totalPaid,
      outstanding,
    },
    recentPayments,
    tabPayments,
  });
}
