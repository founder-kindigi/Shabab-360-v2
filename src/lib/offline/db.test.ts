import { describe, expect, it } from "vitest";
import { coalesceAttendanceItems, orderSyncItems } from "./db";

const item = (
  mutationId: string,
  participantId: string,
  queuedAt: string,
  status: "present" | "absent" = "present"
) => ({
  mutationId,
  eventId: "event-1",
  participantId,
  status,
  markedAt: queuedAt,
  queuedAt,
  retryCount: 0,
  lastError: null,
  errorCode: null,
  retryable: null,
  syncedAt: null,
  state: "pending" as const,
});

describe("attendance offline queue ordering", () => {
  it("preserves chronological order", () => {
    const later = item("later", "student-2", "2026-08-17T10:01:00.000Z");
    const earlier = item("earlier", "student-1", "2026-08-17T10:00:00.000Z");

    expect(orderSyncItems([later, earlier]).map((entry) => entry.mutationId))
      .toEqual(["earlier", "later"]);
  });

  it("keeps only the newest mark for the same event and participant", () => {
    const stale = item("stale", "student-1", "2026-08-17T10:00:00.000Z", "present");
    const latest = item("latest", "student-1", "2026-08-17T10:01:00.000Z", "absent");
    const other = item("other", "student-2", "2026-08-17T10:02:00.000Z");

    expect(coalesceAttendanceItems([latest, other, stale]).map((entry) => entry.mutationId))
      .toEqual(["latest", "other"]);
  });
});
