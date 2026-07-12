import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { parseISO } from "date-fns";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

const VALID_STATUSES = ["present", "absent", "late", "excused"];
const ALLOWED_ROLES = ["park_admin", "park_lead", "murabbi"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { mutations } = body;

    if (!mutations || !Array.isArray(mutations)) {
      return NextResponse.json(
        { error: "mutations array required" },
        { status: 400 }
      );
    }

    if (mutations.length > 50) {
      return NextResponse.json(
        { error: "Max 50 mutations per sync request" },
        { status: 400 }
      );
    }

    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: user.id },
    });

    const results = [];

    for (const mutation of mutations) {
      const { mutationId, eventId, participantId, status, markedAt } = mutation;

      // Validate
      if (!VALID_STATUSES.includes(status)) {
        results.push({
          mutationId,
          status: "failed",
          recordId: null,
          error: "Invalid status",
        });
        continue;
      }

      try {
        // Fetch event for scope check
        const event = await db.attendanceEvent.findUnique({
          where: { id: eventId },
          include: { group: { include: { batch: true } } },
        });

        if (!event) {
          results.push({
            mutationId,
            status: "failed",
            recordId: null,
            error: "Event not found",
          });
          continue;
        }

        // Scope check
        if (user.role === "murabbi") {
          if (user.assignedGroupId !== event.groupId) {
            results.push({
              mutationId,
              status: "failed",
              recordId: null,
              error: "Forbidden",
            });
            continue;
          }
        } else {
          if (user.assignedParkId !== event.group.batch.parkId) {
            results.push({
              mutationId,
              status: "failed",
              recordId: null,
              error: "Forbidden",
            });
            continue;
          }
        }

        if (event.isClosed) {
          results.push({
            mutationId,
            status: "failed",
            recordId: null,
            error: "Event is closed",
          });
          continue;
        }

        // Verify participant
        const participant = await db.participant.findFirst({
          where: {
            id: participantId,
            groupId: event.groupId,
            state: "active",
          },
        });

        if (!participant) {
          results.push({
            mutationId,
            status: "failed",
            recordId: null,
            error: "Participant not in this group",
          });
          continue;
        }

        // Upsert
        const record = await db.attendanceRecord.upsert({
          where: {
            eventId_participantId: { eventId, participantId },
          },
          create: {
            eventId,
            participantId,
            status,
            markedBy: staffMeta?.id,
            markedAt: markedAt ? parseISO(markedAt) : new Date(),
          },
          update: {
            status,
            markedBy: staffMeta?.id,
            markedAt: markedAt ? parseISO(markedAt) : new Date(),
          },
        });

        results.push({
          mutationId,
          status: "processed",
          recordId: record.id,
          error: null,
        });
      } catch (err) {
        results.push({
          mutationId,
          status: "failed",
          recordId: null,
          error: err instanceof Error ? err.message : "Processing error",
        });
      }
    }

    const processed = results.filter((r) => r.status === "processed").length;
    const failed = results.filter((r) => r.status === "failed").length;

    logAudit({
      userId: user.id,
      action: "attendance_sync",
      entityType: "attendance_records",
      newValues: JSON.stringify({
        total: mutations.length,
        processed,
        failed,
      }),
    });

    // ─── Dispatch real-time notification (non-blocking) ─────────────────────
    if (processed > 0) {
      fetch("http://localhost:3004/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "attendance:updated",
          data: {
            eventId: mutations[0]?.eventId,
            syncCount: processed,
            markedBy: staffMeta?.id,
            markedByName: staffMeta?.user?.name || null,
            isSync: true,
          },
        }),
      }).catch(() => {
        // Non-blocking
      });
    }

    return NextResponse.json({
      results,
      summary: { total: mutations.length, processed, failed },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}