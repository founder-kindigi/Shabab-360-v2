import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  optionalIdentifier,
  optionalDateOnly,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const exportSchema = z.object({
  reportType: z.enum(["attendance", "admissions", "fees"]),
  format: z.enum(["csv"]).default("csv"),
  cityId: optionalIdentifier(),
  parkId: optionalIdentifier(),
  from: optionalDateOnly(),
  to: optionalDateOnly(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capabilityAuth = await requireCapability("reports.export");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json();
  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { reportType, format: _format, cityId, parkId, from, to } = parsed.data;

  // Audit log the export
  await logAudit({
    userId: user.id,
    action: "reports.export",
    entityType: "report",
    newValues: { reportType, format: _format, cityId, parkId, from, to },
  });

  // Build scope filter
  const scopeWhere: Record<string, unknown> = {};
  if (parkId) {
    scopeWhere.parkId = parkId;
  } else if (cityId) {
    scopeWhere.cityId = cityId;
  } else if (user.role === "city_head" && user.assignedCityId) {
    scopeWhere.cityId = user.assignedCityId;
  }

  let csvRows: string[] = [];
  let filename = `${reportType}-report.csv`;

  switch (reportType) {
    case "attendance": {
      const eventWhere: Record<string, unknown> = {};
      if (from) eventWhere.eventDate = { gte: new Date(from) };
      if (to) eventWhere.eventDate = { ...(eventWhere.eventDate as object || {}), lte: new Date(to) };

      const records = await db.attendanceRecord.findMany({
        where: {
          event: {
            ...eventWhere,
            group: parkId ? { batch: { parkId } } : cityId ? { batch: { park: { cityId } } } : {},
          },
        },
        select: {
          status: true,
          markedAt: true,
          participant: { select: { name: true, group: { select: { name: true, batch: { select: { name: true, park: { select: { name: true, city: { select: { name: true } } } } } } } } } },
          event: { select: { title: true, eventDate: true } },
        },
        take: 10000,
      });

      csvRows = [
        "City,Park,Batch,Group,Event,Date,Participant,Status,MarkedAt",
        ...records.map((r) =>
          [
            r.participant.group.batch.park.city.name,
            r.participant.group.batch.park.name,
            r.participant.group.batch.name,
            r.participant.group.name,
            r.event.title,
            r.event.eventDate.toISOString().split("T")[0],
            r.participant.name,
            r.status,
            r.markedAt ? r.markedAt.toISOString() : "",
          ].join(",")
        ),
      ];
      break;
    }

    case "admissions": {
      const where: Record<string, unknown> = {};
      if (cityId) where.cityId = cityId;
      else if (user.role === "city_head" && user.assignedCityId) where.cityId = user.assignedCityId;

      const apps = await db.admissionApplication.findMany({
        where,
        select: {
          trackingCode: true,
          applicantName: true,
          guardianName: true,
          guardianPhone: true,
          status: true,
          createdAt: true,
        },
        take: 10000,
      });

      csvRows = [
        "TrackingCode,Applicant,Guardian,GuardianPhone,Status,CreatedAt",
        ...apps.map((a) =>
          [
            a.trackingCode,
            a.applicantName,
            a.guardianName,
            a.guardianPhone,
            a.status,
            a.createdAt.toISOString().split("T")[0],
          ].join(",")
        ),
      ];
      break;
    }

    case "fees": {
      const paymentWhere: Record<string, unknown> = {};
      if (parkId) paymentWhere.feeEvent = { batch: { parkId } };
      else if (cityId) paymentWhere.feeEvent = { batch: { park: { cityId } } };
      else if (user.role === "city_head" && user.assignedCityId) paymentWhere.feeEvent = { batch: { park: { cityId: user.assignedCityId } } };

      const payments = await db.payment.findMany({
        where: paymentWhere,
        select: {
          receiptNo: true,
          amount: true,
          method: true,
          createdAt: true,
          feeEvent: { select: { title: true, batch: { select: { name: true, park: { select: { name: true, city: { select: { name: true } } } } } } } },
          participant: { select: { name: true } },
        },
        take: 10000,
      });

      csvRows = [
        "ReceiptNo,City,Park,Batch,FeeEvent,Participant,Amount,Method,Date",
        ...payments.map((p) =>
          [
            p.receiptNo ?? "",
            p.feeEvent.batch.park.city.name,
            p.feeEvent.batch.park.name,
            p.feeEvent.batch.name,
            p.feeEvent.title,
            p.participant.name,
            p.amount,
            p.method,
            p.createdAt.toISOString().split("T")[0],
          ].join(",")
        ),
      ];
      break;
    }
  }

  const csvContent = csvRows.join("\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
