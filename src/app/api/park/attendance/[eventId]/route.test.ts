import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  checkAttendanceAlerts: vi.fn(),
  eventFindUnique: vi.fn(),
  participantFindFirst: vi.fn(),
  staffMetaFindUnique: vi.fn(),
  attendanceRecordFindUnique: vi.fn(),
  attendanceRecordCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["park_admin", "park_lead", "murabbi"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/attendance-alerts", () => ({
  checkAttendanceAlerts: mocks.checkAttendanceAlerts,
}));
vi.mock("@/lib/db", () => ({
  db: {
    attendanceEvent: { findUnique: mocks.eventFindUnique },
    participant: { findFirst: mocks.participantFindFirst },
    staffMeta: { findUnique: mocks.staffMetaFindUnique },
    attendanceRecord: {
      findUnique: mocks.attendanceRecordFindUnique,
      create: mocks.attendanceRecordCreate,
    },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { POST } from "./route";

const event = {
  id: "event-1",
  groupId: "group-1",
  isClosed: false,
  group: { batch: { parkId: "park-1" } },
};
const PARTICIPANT_ID = "ckaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_PARTICIPANT_ID = "ckbbbbbbbbbbbbbbbbbbbbbbb";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/park/attendance/event-1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/park/attendance/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "staff-user-1", role: "murabbi", assignedGroupId: "group-1" },
    });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.requireCapability.mockResolvedValue(null);
    mocks.eventFindUnique.mockResolvedValue(event);
  });

  it("rejects unknown attendance states before fetching the event", async () => {
    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "missing" }), {
      params: Promise.resolve({ eventId: "event-1" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an invalid markedAt value before fetching the event", async () => {
    const response = await POST(
      request({
        participantId: PARTICIPANT_ID,
        status: "present",
        markedAt: "not-a-date",
      }),
      { params: Promise.resolve({ eventId: "event-1" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("denies a user whose assigned scope does not cover the attendance event", async () => {
    mocks.requireResourceScope.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "event-1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.participantFindFirst).not.toHaveBeenCalled();
  });

  it("denies an unavailable attendance capability before reading the event", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "event-1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a participant who is not active in the event group", async () => {
    mocks.participantFindFirst.mockResolvedValue(null);

    const response = await POST(request({ participantId: OTHER_PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "event-1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Participant not in this group" });
    expect(mocks.participantFindFirst).toHaveBeenCalledWith({
      where: { id: OTHER_PARTICIPANT_ID, groupId: "group-1", state: "active" },
    });
  });

  it("evaluates absence alerts in-process after a successful attendance record", async () => {
    mocks.participantFindFirst.mockResolvedValue({ id: PARTICIPANT_ID });
    mocks.staffMetaFindUnique.mockResolvedValue({ id: "staff-1", user: { name: "Murabbi" } });
    mocks.attendanceRecordFindUnique.mockResolvedValue(null);
    mocks.attendanceRecordCreate.mockResolvedValue({
      id: "record-1",
      status: "absent",
      markedAt: new Date("2026-07-14T00:00:00.000Z"),
    });

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "absent" }), {
      params: Promise.resolve({ eventId: "event-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.checkAttendanceAlerts).toHaveBeenCalledWith(PARTICIPANT_ID, "event-1");
  });
});
