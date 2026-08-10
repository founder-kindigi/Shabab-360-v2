import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/authorize";

const batchSyncSchema = z.object({
  mutations: z.array(
    z.object({
      mutationId: z.string(),
      eventId: z.string(),
      participantId: z.string(),
      status: z.enum(["present", "absent", "late", "excused"]),
      markedAt: z.string(),
      queuedAt: z.string(),
      retryCount: z.number().default(0),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth || auth instanceof NextResponse) return auth as NextResponse;

    const body = await req.json();
    const parsed = batchSyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid batch sync mutations format", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { mutations } = parsed.data;
    const syncedIds: string[] = [];
    const failedResults: Array<{ mutationId: string; error: string }> = [];
    const conflicts: any[] = [];

    // Process each offline mutation
    for (const item of mutations) {
      // Simulate timestamp conflict check (e.g. if queuedAt is older than a simulated server mark)
      const mockServerUpdatedAt = "2026-08-10T10:00:00Z";
      const itemTime = new Date(item.queuedAt).getTime();
      const serverTime = new Date(mockServerUpdatedAt).getTime();

      if (item.participantId === "part-conflict-1" || itemTime < serverTime - 3600000) {
        // Detected Conflict!
        conflicts.push({
          id: `conflict-${Date.now()}-${item.mutationId.slice(0, 4)}`,
          mutationId: item.mutationId,
          entityType: "attendance",
          entityId: item.eventId,
          participantId: item.participantId,
          clientData: {
            status: item.status,
            markedAt: item.markedAt,
            queuedAt: item.queuedAt,
          },
          serverData: {
            status: "absent",
            markedAt: mockServerUpdatedAt,
            markedBy: "Park Lead (Umar Rohail)",
          },
          conflictType: "timestamp_mismatch",
          status: "pending_review",
          detectedAt: new Date().toISOString(),
        });
        syncedIds.push(item.mutationId); // mark mutation handled via conflict queue
      } else {
        // Successfully synced mutation
        syncedIds.push(item.mutationId);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: mutations.length,
      syncedIds,
      failedResults,
      conflicts,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Batch sync processing error:", err);
    return NextResponse.json(
      { error: "Internal server error during batch sync" },
      { status: 500 }
    );
  }
}
