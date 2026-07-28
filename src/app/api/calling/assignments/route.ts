import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assignLeadsSchema } from "@/lib/validations/calling";
import { Prisma } from "@prisma/client";

// Dedicated marker for our own count-mismatch guard — never a Prisma error code.
class CountMismatchError extends Error {
  constructor() {
    super("Count mismatch — concurrent assignment conflict");
    this.name = "CountMismatchError";
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assignLeadsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { campaignId, applicationIds, callerStaffMetaId, callerExternalId } = parsed.data;

  const verified = await verifyCallingManagerOrPoc(user, campaignId);
  if (verified.error || !verified.campaign) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  if (callerStaffMetaId) {
    const staff = await db.staffMeta.findUnique({
      where: { id: callerStaffMetaId },
      include: {
        assignedCity: true,
        assignedPark: { include: { city: true } },
        assignedGroup: { include: { batch: { include: { city: true } }, park: { include: { city: true } } } },
      },
    });
    if (!staff || !staff.isActive) {
      return NextResponse.json({ error: "Target staff caller not found or inactive" }, { status: 400 });
    }
    const staffCityId = staff.assignedCityId
      || staff.assignedPark?.cityId
      || staff.assignedGroup?.batch?.cityId
      || staff.assignedGroup?.park?.cityId;
    if (!staffCityId || staffCityId !== verified.campaign.cityId) {
      return NextResponse.json(
        { error: "Target staff caller city does not match campaign city" },
        { status: 400 }
      );
    }
  }

  if (callerExternalId) {
    const now = new Date();
    const ext = await db.externalSupportCaller.findUnique({
      where: { id: callerExternalId },
    });
    if (
      !ext ||
      !ext.isActive ||
      ext.revokedAt ||
      ext.expiresAt <= now ||
      ext.campaignId !== campaignId
    ) {
      return NextResponse.json(
        { error: "Target external support caller is inactive, expired, or bound to a different campaign" },
        { status: 400 }
      );
    }
  }

  const applications = await db.admissionApplication.findMany({
    where: { id: { in: applicationIds } },
  });

  if (applications.length !== applicationIds.length) {
    return NextResponse.json({ error: "One or more admission applications not found" }, { status: 400 });
  }

  const invalidCityApp = applications.find((app) => app.cityId !== verified.campaign!.cityId);
  if (invalidCityApp) {
    return NextResponse.json(
      { error: "One or more leads belong to a different city than the campaign" },
      { status: 400 }
    );
  }

  let concurrencyConflict = false;
  let newAssignments: any[] | null = null;

  try {
    newAssignments = await db.$transaction(
      async (tx) => {
        const now = new Date();

        // 1. Close all existing active assignments for these leads.
        await tx.callingAssignment.updateMany({
          where: {
            campaignId,
            applicationId: { in: applicationIds },
            isActive: true,
          },
          data: { isActive: false, status: "reassigned", endedAt: now },
        });

        // 2. Create new assignments.
        const created: any[] = [];
        for (const appId of applicationIds) {
          const newAssignment = await tx.callingAssignment.create({
            data: {
              campaignId,
              applicationId: appId,
              callerStaffMetaId: callerStaffMetaId || null,
              callerExternalId: callerExternalId || null,
              status: "pending",
              isActive: true,
              startedAt: now,
            },
          });
          created.push(newAssignment);
        }

        // 3. Per-application concurrency guard — verify exactly one active
        //    assignment exists for each individual application after insertion.
        for (const appId of applicationIds) {
          const count = await tx.callingAssignment.count({
            where: {
              campaignId,
              applicationId: appId,
              isActive: true,
            },
          });
          if (count !== 1) {
            concurrencyConflict = true;
            throw new CountMismatchError();
          }
        }

        return created;
      },
      { isolationLevel: "Serializable" }
    );
  } catch (e) {
    if (
      concurrencyConflict ||
      (e instanceof Prisma.PrismaClientKnownRequestError &&
        (e.code === "P2034" || e.code === "40001"))
    ) {
      return NextResponse.json(
        { error: "Concurrent assignment conflict — one or more leads have multiple active assignments" },
        { status: 409 }
      );
    }
    throw e;
  }

  await logAudit({
    userId: user.id!,
    action: "calling.lead.assign",
    entityType: "CallingAssignment",
    entityId: campaignId,
    newValues: { campaignId, count: newAssignments.length, callerStaffMetaId, callerExternalId },
  });

  return NextResponse.json(newAssignments, { status: 201 });
}
