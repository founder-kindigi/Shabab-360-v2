import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  checkAttendanceAlerts: vi.fn(),
  eventFindUnique: vi.fn(),
  participantFindFirst: vi.fn(),
  participantFindMany: vi.fn(),
  staffMetaFindUnique: vi.fn(),
  staffMetaFindMany: vi.fn(),
  attendanceRecordFindUnique: vi.fn(),
  attendanceRecordFindMany: vi.fn(),
  attendanceRecordCreate: vi.fn(),
  roleOverrideFindUnique: vi.fn(),
  userOverrideFindUnique: vi.fn(),
  transaction: vi.fn(),
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
    $transaction: mocks.transaction,
    attendanceEvent: { findUnique: mocks.eventFindUnique },
    participant: { findFirst: mocks.participantFindFirst, findMany: mocks.participantFindMany },
    staffMeta: { findUnique: mocks.staffMetaFindUnique, findMany: mocks.staffMetaFindMany },
    attendanceRecord: {
      findUnique: mocks.attendanceRecordFindUnique,
      findMany: mocks.attendanceRecordFindMany,
      create: mocks.attendanceRecordCreate,
    },
    roleCapabilityOverride: { findUnique: mocks.roleOverrideFindUnique },
    userCapabilityOverride: { findUnique: mocks.userOverrideFindUnique },
  },
}));
vi.mock("@/lib/audit", async (original) => ({ ...await original<typeof import("@/lib/audit")>(), logAudit: vi.fn() }));

import { GET, POST } from "./route";

const event = {
  id: "ckccccccccccccccccccccccc",
  groupId: "group-1",
  eventDate: new Date("2026-08-16T00:00:00.000Z"),
  isClosed: false, resetVersion: 0,
  group: {
    id: "group-1", parkId: "park-1", isActive: true,
    park: { id: "park-1", cityId: "city-1" },
    batch: {
      id: "batch-1", isActive: true, cityId: "city-1",
      startDate: new Date("2026-05-23T00:00:00.000Z"),
      endDate: new Date("2027-01-31T00:00:00.000Z"),
      settings: { classWeekdays: "[0,6]" },
      extraClassDates: [],
      park: { cityId: "city-1" },
    },
  },
};
const PARTICIPANT_ID = "ckaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_PARTICIPANT_ID = "ckbbbbbbbbbbbbbbbbbbbbbbb";

function scheduledEvent(overrides: Record<string, unknown> = {}) {
  return { ...event, ...overrides };
}

function inactiveGroupEvent() {
  return { ...event, group: { ...event.group, isActive: false } };
}

function inactiveBatchEvent() {
  return { ...event, group: { ...event.group, batch: { ...event.group.batch, isActive: false } } };
}

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/park/attendance/event-1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mutationId: "one", expectedResetVersion: 0, expectedVersion: null, ...body }),
  });
}

describe("POST /api/park/attendance/[eventId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.staffMetaFindUnique.mockResolvedValue({ id: "staff-1", role: "murabbi", assignedGroupId: "group-1", isActive: true });
    mocks.transaction.mockImplementation(async run => run({ staffMeta: { findUnique: mocks.staffMetaFindUnique }, attendanceEvent: { findUnique: mocks.eventFindUnique, updateMany: async () => ({ count: 1 }) }, participant: { findFirst: mocks.participantFindFirst }, attendanceRecord: { findUnique: mocks.attendanceRecordFindUnique, create: mocks.attendanceRecordCreate }, auditLog: { create: vi.fn() }, $queryRaw: async () => [], $executeRaw: vi.fn() }));
    mocks.requireAuth.mockResolvedValue({
      user: { id: "staff-user-1", role: "murabbi", assignedGroupId: "group-1" },
    });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.requireCapability.mockResolvedValue(null);
    mocks.eventFindUnique.mockResolvedValue(event);
  });

  it("rejects unknown attendance states before fetching the event", async () => {
    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "missing" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
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
      { params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("denies a user whose assigned scope does not cover the attendance event", async () => {
    mocks.requireResourceScope.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.participantFindFirst).not.toHaveBeenCalled();
  });

  it("denies an unavailable attendance capability before reading the event", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a participant who is not in the event group", async () => {
    mocks.participantFindFirst.mockResolvedValue(null);

    const response = await POST(request({ participantId: OTHER_PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "PARTICIPANT_SCOPE_CHANGED" });
    expect(mocks.participantFindFirst).toHaveBeenCalledWith({
      where: { id: OTHER_PARTICIPANT_ID, groupId: "group-1" },
    });
  });

  it("rejects attendance on or after a participant dropout date", async () => {
    mocks.participantFindFirst.mockResolvedValue({
      id: PARTICIPANT_ID,
      joinedAt: new Date("2026-01-01"), state: "dropout",
      dropoutAt: new Date("2026-08-01T00:00:00.000Z"),
    });
    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "ATTENDANCE_DISCONTINUED" });
    expect(mocks.attendanceRecordCreate).not.toHaveBeenCalled();
  });

  it("evaluates absence alerts in-process after a successful attendance record", async () => {
    mocks.participantFindFirst.mockResolvedValue({ id: PARTICIPANT_ID, joinedAt: new Date("2026-01-01"), state: "active", dropoutAt: null });
    mocks.staffMetaFindUnique.mockResolvedValue({ id: "staff-1", role: "murabbi", assignedGroupId: "group-1", isActive: true });
    mocks.attendanceRecordFindUnique.mockResolvedValue(null);
    mocks.attendanceRecordCreate.mockResolvedValue({
      id: "record-1",
      status: "absent",
      markedAt: new Date("2026-07-14T00:00:00.000Z"),
    });

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "absent" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.checkAttendanceAlerts).toHaveBeenCalledWith(PARTICIPANT_ID, "ckccccccccccccccccccccccc");
  });

  it("rejects a mark inside a reactivated participant's interruption", async () => {
    mocks.participantFindFirst.mockResolvedValue({
      id: PARTICIPANT_ID, joinedAt: new Date("2026-01-01"), state: "active",
      dropoutAt: new Date("2026-08-01T00:00:00.000Z"), reactivatedAt: new Date("2026-09-01T00:00:00.000Z"),
    });

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "ATTENDANCE_DISCONTINUED" });
    expect(mocks.attendanceRecordCreate).not.toHaveBeenCalled();
  });

  it("accepts a mark on or after the approved rejoin date", async () => {
    mocks.participantFindFirst.mockResolvedValue({
      id: PARTICIPANT_ID, joinedAt: new Date("2026-01-01"), state: "active",
      dropoutAt: new Date("2026-08-01T00:00:00.000Z"), reactivatedAt: new Date("2026-08-10T00:00:00.000Z"),
    });
    mocks.attendanceRecordFindUnique.mockResolvedValue(null);
    mocks.attendanceRecordCreate.mockResolvedValue({ id: "record-2", status: "present", markedAt: new Date("2026-08-16T00:00:00.000Z") });

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.attendanceRecordCreate).toHaveBeenCalled();
  });

  it.each([
    ["a non-class weekday inside the batch range", new Date("2026-08-18T00:00:00.000Z")],
    ["a date after the batch end", new Date("2027-06-01T00:00:00.000Z")],
    ["a date before the batch start", new Date("2026-05-01T00:00:00.000Z")],
  ])("rejects a mark on an existing session for %s", async (_label, eventDate) => {
    mocks.eventFindUnique.mockResolvedValue(scheduledEvent({ eventDate }));
    mocks.participantFindFirst.mockResolvedValue({ id: PARTICIPANT_ID, joinedAt: new Date("2026-01-01"), state: "active", dropoutAt: null });

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "SESSION_NOT_SCHEDULED" });
    expect(mocks.attendanceRecordCreate).not.toHaveBeenCalled();
  });

  it("rejects a mark when the event's group is inactive", async () => {
    mocks.eventFindUnique.mockResolvedValue(inactiveGroupEvent());

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "GROUP_INACTIVE" });
    expect(mocks.participantFindFirst).not.toHaveBeenCalled();
    expect(mocks.attendanceRecordCreate).not.toHaveBeenCalled();
  });

  it("rejects a mark when the event's batch is inactive", async () => {
    mocks.eventFindUnique.mockResolvedValue(inactiveBatchEvent());

    const response = await POST(request({ participantId: PARTICIPANT_ID, status: "present" }), {
      params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "BATCH_INACTIVE" });
    expect(mocks.attendanceRecordCreate).not.toHaveBeenCalled();
  });
});

describe("GET /api/park/attendance/[eventId] roster eligibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "staff-user-1", role: "murabbi", assignedGroupId: "group-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.eventFindUnique.mockResolvedValue(event);
    mocks.attendanceRecordFindMany.mockResolvedValue([]);
    mocks.staffMetaFindMany.mockResolvedValue([]);
    mocks.roleOverrideFindUnique.mockResolvedValue(null);
    mocks.userOverrideFindUnique.mockResolvedValue(null);
  });

  it("excludes a participant who was not yet eligible when the session ran", async () => {
    mocks.participantFindMany.mockResolvedValue([
      { id: "eligible", name: "Eligible", phone: null, state: "active", joinedAt: new Date("2026-01-01T00:00:00.000Z"), dropoutAt: null },
      { id: "late-join", name: "Late Join", phone: null, state: "active", joinedAt: new Date("2026-09-01T00:00:00.000Z"), dropoutAt: null },
    ]);

    const response = await GET(
      new Request("http://localhost/api/park/attendance/ckccccccccccccccccccccccc"),
      { params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.roster.map((entry: { participantId: string }) => entry.participantId)).toEqual(["eligible"]);
    expect(body.summary.total).toBe(1);
    expect(body.summary.unmarked).toBe(1);
  });

  it("excludes a reactivated participant during the interruption and includes them from the rejoin day", async () => {
    mocks.participantFindMany.mockResolvedValue([
      { id: "interrupted", name: "Interrupted", phone: null, state: "active", joinedAt: new Date("2026-01-01T00:00:00.000Z"), dropoutAt: new Date("2026-08-01T00:00:00.000Z"), reactivatedAt: new Date("2026-09-01T00:00:00.000Z") },
      { id: "returned", name: "Returned", phone: null, state: "active", joinedAt: new Date("2026-01-01T00:00:00.000Z"), dropoutAt: new Date("2026-06-01T00:00:00.000Z"), reactivatedAt: new Date("2026-08-10T00:00:00.000Z") },
    ]);

    const response = await GET(
      new Request("http://localhost/api/park/attendance/ckccccccccccccccccccccccc"),
      { params: Promise.resolve({ eventId: "ckccccccccccccccccccccccc" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.roster.map((entry: { participantId: string }) => entry.participantId)).toEqual(["returned"]);
  });
});
