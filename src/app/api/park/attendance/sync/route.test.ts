import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  canAccessResourceScope: vi.fn(),
  staffMetaFindUnique: vi.fn(),
  eventFindUnique: vi.fn(),
  participantFindFirst: vi.fn(),
  recordUpsert: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["park_admin", "park_lead", "murabbi"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  canAccessResourceScope: mocks.canAccessResourceScope,
}));
vi.mock("@/lib/attendance-alerts", () => ({ checkAttendanceAlerts: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    staffMeta: { findUnique: mocks.staffMetaFindUnique },
    attendanceEvent: { findUnique: mocks.eventFindUnique },
    participant: { findFirst: mocks.participantFindFirst },
    attendanceRecord: { upsert: mocks.recordUpsert },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { POST } from "./route";

const event = {
  id: "event-1", groupId: "group-1", isClosed: false,
  group: { batch: { parkId: "park-1" } },
};
const EVENT_ID = "ckccccccccccccccccccccccc";
const PARTICIPANT_ID = "ckaaaaaaaaaaaaaaaaaaaaaaa";

function request(mutations: unknown) {
  return new Request("http://localhost/api/park/attendance/sync", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mutations }),
  });
}

describe("POST /api/park/attendance/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "staff-1", role: "park_admin", assignedParkId: "park-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.staffMetaFindUnique.mockResolvedValue({ id: "staff-meta-1" });
    mocks.eventFindUnique.mockResolvedValue({ ...event, id: EVENT_ID });
    mocks.participantFindFirst.mockResolvedValue({ id: PARTICIPANT_ID });
    mocks.canAccessResourceScope.mockReturnValue(true);
    mocks.recordUpsert.mockResolvedValue({ id: "record-1" });
  });

  it("rejects a malformed sync request before querying staff data", async () => {
    const response = await POST(request({ mutationId: "not-an-array" }));

    expect(response.status).toBe(400);
    expect(mocks.staffMetaFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an invalid markedAt payload before querying staff data", async () => {
    const response = await POST(request([
      {
        mutationId: "mutation-1",
        eventId: EVENT_ID,
        participantId: PARTICIPANT_ID,
        status: "present",
        markedAt: "not-a-date",
      },
    ]));

    expect(response.status).toBe(400);
    expect(mocks.staffMetaFindUnique).not.toHaveBeenCalled();
  });

  it("denies attendance marking before querying staff data", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(request([]));

    expect(response.status).toBe(403);
    expect(mocks.staffMetaFindUnique).not.toHaveBeenCalled();
  });

  it("retains a scoped denial as an individual mutation failure", async () => {
    mocks.canAccessResourceScope.mockReturnValue(false);

    const response = await POST(request([{
      mutationId: "mutation-1", eventId: EVENT_ID, participantId: PARTICIPANT_ID, status: "present",
    }]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ summary: { processed: 0, failed: 1 }, results: [{ error: "Forbidden" }] });
    expect(mocks.participantFindFirst).not.toHaveBeenCalled();
  });

  it("retains a closed event as an individual mutation failure", async () => {
    mocks.eventFindUnique.mockResolvedValue({ ...event, isClosed: true });

    const response = await POST(request([{
      mutationId: "mutation-1", eventId: EVENT_ID, participantId: PARTICIPANT_ID, status: "present",
    }]));
    const body = await response.json();

    expect(body).toMatchObject({ summary: { processed: 0, failed: 1 }, results: [{ error: "Event is closed" }] });
    expect(mocks.recordUpsert).not.toHaveBeenCalled();
  });

  it("applies ordered mutations in request order so the latest status wins", async () => {
    const response = await POST(request([
      { mutationId: "first", eventId: EVENT_ID, participantId: PARTICIPANT_ID, status: "present" },
      { mutationId: "latest", eventId: EVENT_ID, participantId: PARTICIPANT_ID, status: "absent" },
    ]));
    const body = await response.json();

    expect(body.summary).toEqual({ total: 2, processed: 2, failed: 0 });
    expect(mocks.recordUpsert).toHaveBeenNthCalledWith(1, expect.objectContaining({ create: expect.objectContaining({ status: "present" }) }));
    expect(mocks.recordUpsert).toHaveBeenNthCalledWith(2, expect.objectContaining({ update: expect.objectContaining({ status: "absent" }) }));
  });

  it("returns a safe mutation error without leaking internal exception details", async () => {
    mocks.recordUpsert.mockRejectedValue(new Error("Prisma write failed with internal detail"));

    const response = await POST(request([
      {
        mutationId: "mutation-1",
        eventId: EVENT_ID,
        participantId: PARTICIPANT_ID,
        status: "present",
      },
    ]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0].error).toBe("Processing error");
    expect(body.results[0].error).not.toContain("Prisma");
  });
});
