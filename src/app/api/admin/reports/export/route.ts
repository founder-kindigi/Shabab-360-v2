import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveRequestedCityScope } from "@/lib/auth/authorize";
import { groupParkWhere, hierarchyGroupWhere } from "@/lib/auth/hierarchy";
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

  // HQ may select any city (unscoped means all cities); a City Head is pinned to
  // their assigned city and every other role is denied. A requested park must
  // belong to the resolved city scope and may only narrow it.
  const scope = resolveRequestedCityScope(user, cityId);
  if (scope instanceof NextResponse) return scope;

  let parkScopeId: string | null = null;
  if (parkId) {
    const park = await db.park.findUnique({
      where: { id: parkId },
      select: { id: true, cityId: true },
    });
    if (!park) return NextResponse.json({ error: "Park not found" }, { status: 404 });
    if (scope.cityId && park.cityId !== scope.cityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    parkScopeId = park.id;
  }

  // Audit log the export with the resolved scope, never the raw request values.
  await logAudit({
    userId: user.id,
    action: "reports.export",
    entityType: "report",
    newValues: { reportType, format: _format, cityId: scope.cityId, parkId: parkScopeId, from, to },
  });

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
            // A group's own park is authoritative; the batch park is only a
            // fallback for a legacy null group park, so a group parked outside
            // the resolved city or park is never exported through its batch.
            group: parkScopeId
              ? groupParkWhere(parkScopeId)
              : scope.cityId
                ? hierarchyGroupWhere({ kind: "city", cityId: scope.cityId, parkId: null, groupId: null })
                : {},
          },
        },
        select: {
          status: true,
          markedAt: true,
          participant: {
            select: {
              name: true,
              group: {
                select: {
                  name: true,
                  park: { select: { name: true, city: { select: { name: true } } } },
                  batch: { select: { name: true, park: { select: { name: true, city: { select: { name: true } } } } } },
                },
              },
            },
          },
          event: { select: { title: true, eventDate: true } },
        },
        take: 10000,
      });

      csvRows = [
        "City,Park,Batch,Group,Event,Date,Participant,Status,MarkedAt",
        // Attendance rows always belong to a group; an unassigned participant
        // has no city, park, batch or group to report.
        ...records.flatMap((r) => {
          const group = r.participant.group;
          if (!group) return [];
          // The group's own park is authoritative, so a mismatched batch park
          // can never leak another city or park name into the export.
          const park = group.park ?? group.batch.park;
          return [
            [
              park ? park.city.name : "Unknown",
              park ? park.name : "Unassigned",
              group.batch.name,
              group.name,
              r.event.title,
              r.event.eventDate.toISOString().split("T")[0],
              r.participant.name,
              r.status,
              r.markedAt ? r.markedAt.toISOString() : "",
            ].join(","),
          ];
        }),
      ];
      break;
    }

    case "admissions": {
      const where: Record<string, unknown> = {};
      if (scope.cityId) where.cityId = scope.cityId;

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
      if (parkScopeId) paymentWhere.feeEvent = { batch: { parkId: parkScopeId } };
      else if (scope.cityId) paymentWhere.feeEvent = { batch: { park: { cityId: scope.cityId } } };

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
